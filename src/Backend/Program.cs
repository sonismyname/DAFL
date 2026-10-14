using DAFL.Backend.Common;
using DAFL.Backend.Common.Behaviors;
using DAFL.Backend.Features.Auth;
using DAFL.Backend.Features.Auth.SessionLogin;
using DAFL.Backend.Features.Cart;
using DAFL.Backend.Features.Categories.GetCategories;
using DAFL.Backend.Features.Orders;
using DAFL.Backend.Features.Orders.Checkout;
using DAFL.Backend.Features.Orders.GetOrderHistory;
using DAFL.Backend.Features.Payments.GetPaymentStatus;
using DAFL.Backend.Features.Payments.PayOSWebhook;
using DAFL.Backend.Features.Products;
using DAFL.Backend.Features.Products.ListProducts;
using DAFL.Backend.Features.Vouchers;
using DAFL.Backend.Infrastructure.Caching;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Hubs;
using DAFL.Backend.Infrastructure.Messaging;
using DAFL.Backend.Infrastructure.Payments;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();
builder.Services.AddSignalR();

// 2. Database - PostgreSQL (Lightweight Alpine for demo)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=dafl_db;Username=dafl;Password=dafl_password123;Include Error Detail=true;";

var dbProvider = builder.Configuration["DatabaseProvider"] ?? "PostgreSQL";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase) || connectionString.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
    {
        options.UseSqlite(connectionString.StartsWith("Data Source=") ? connectionString : "Data Source=dafl_demo.db");
    }
    else
    {
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(3), errorCodesToAdd: null);
        });
    }
});

// 3. Resilient Caching (In-Memory default, Redis when enabled)
var cacheEnabled = builder.Configuration.GetValue<bool>("CacheSettings:Enabled", false);
var redisConnectionString = builder.Configuration["CacheSettings:ConnectionString"] ?? "localhost:6379,abortConnect=false,connectTimeout=2000";

if (cacheEnabled)
{
    try
    {
        var configOptions = ConfigurationOptions.Parse(redisConnectionString);
        configOptions.AbortOnConnectFail = false;
        configOptions.ConnectTimeout = 2000;
        configOptions.SyncTimeout = 2000;
        var redisConnection = ConnectionMultiplexer.Connect(configOptions);
        builder.Services.AddSingleton<IConnectionMultiplexer>(redisConnection);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Cache Warning] Could not initialize Redis connection at startup: {ex.Message}. Falling back to in-memory.");
    }
}

builder.Services.AddSingleton<ICacheService, ResilientCacheService>();

// 4. MediatR with Pipeline Behaviors
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CachingBehavior<,>));
});

// 5. FluentValidation
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

// 6. Messaging - Kafka (KRaft mode)
builder.Services.AddSingleton<IKafkaProducer, KafkaProducer>();
builder.Services.AddHostedService<KafkaConsumerWorker>();

// 7. PayOS & Stock Reservation Background Worker
builder.Services.AddScoped<IPayOSService, PayOSService>();
builder.Services.AddHostedService<ReservationCleanupWorker>();

// 8. CORS configuration for React SPA + SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:80", "http://localhost")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

// Global exception handling for validation and runtime errors
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (ValidationException valEx)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        context.Response.ContentType = "application/json";
        var errors = valEx.Errors.Select(e => e.ErrorMessage).ToList();
        var response = ApiResponse<string>.Fail("Dữ liệu gửi lên không hợp lệ.", errors);
        await context.Response.WriteAsJsonAsync(response);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var response = ApiResponse<string>.Fail("Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.");
        await context.Response.WriteAsJsonAsync(response);
    }
});

// ==========================================
// SignalR Hub Endpoint
// ==========================================
app.MapHub<NotificationHub>("/hubs/notifications");

// ==========================================
// Minimal API Endpoints
// ==========================================

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", database = "PostgreSQL", timestamp = DateTime.UtcNow }));

// ------------------------------------------
// 1. Auth Module Endpoints
// ------------------------------------------

// Register
app.MapPost("/api/auth/register", async (RegisterCommand command, HttpContext httpContext, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    if (result.Success && result.Data != null)
    {
        httpContext.Response.Cookies.Append("sid", result.Data.SessionId, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = false,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Login
app.MapPost("/api/auth/login", async (LoginCommand command, HttpContext httpContext, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    if (result.Success && result.Data != null)
    {
        httpContext.Response.Cookies.Append("sid", result.Data.SessionId, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = false,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Current User & Session
app.MapGet("/api/auth/me", async (HttpContext httpContext, AppDbContext dbContext) =>
{
    if (!httpContext.Request.Cookies.TryGetValue("sid", out var sessionId) || string.IsNullOrEmpty(sessionId))
    {
        return Results.Ok(ApiResponse<UserDto?>.Ok(null, "Chưa đăng nhập."));
    }

    var session = await dbContext.UserSessions
        .AsNoTracking()
        .Include(s => s.User)
        .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.ExpiresAt > DateTime.UtcNow);

    if (session == null)
    {
        return Results.Ok(ApiResponse<UserDto?>.Ok(null, "Phiên đăng nhập đã hết hạn."));
    }

    var user = session.User;
    var userDto = new UserDto(
        user?.Id ?? session.Id,
        session.Email,
        session.FullName,
        user?.PhoneNumber,
        user?.Address,
        user?.Role ?? "Customer",
        session.SessionId
    );

    return Results.Ok(ApiResponse<UserDto>.Ok(userDto));
});

// Update Profile & Shipping Address
app.MapPut("/api/auth/profile", async (UpdateProfileRequest request, HttpContext httpContext, AppDbContext dbContext) =>
{
    User? user = null;
    UserSession? session = null;

    if (httpContext.Request.Cookies.TryGetValue("sid", out var sessionId) && !string.IsNullOrEmpty(sessionId))
    {
        session = await dbContext.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.ExpiresAt > DateTime.UtcNow);
        user = session?.User;
    }

    if (user == null)
    {
        user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == "demo@dafl.vn");
    }

    if (user != null)
    {
        if (!string.IsNullOrWhiteSpace(request.FullName)) { user.FullName = request.FullName.Trim(); if (session != null) session.FullName = user.FullName; }
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber)) user.PhoneNumber = request.PhoneNumber.Trim();
        if (!string.IsNullOrWhiteSpace(request.Address)) user.Address = request.Address.Trim();
        await dbContext.SaveChangesAsync();

        var userDto = new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.PhoneNumber,
            user.Address,
            user.Role,
            session?.SessionId ?? Guid.NewGuid().ToString("N")
        );
        return Results.Ok(ApiResponse<UserDto>.Ok(userDto, "Cập nhật địa chỉ nhận hàng và thông tin thành công."));
    }

    return Results.Ok(ApiResponse<object>.Ok(new { request.FullName, request.PhoneNumber, request.Address }, "Đã lưu địa chỉ nhận hàng thành công."));
});

// Logout
app.MapPost("/api/auth/logout", async (HttpContext httpContext, AppDbContext dbContext) =>
{
    if (httpContext.Request.Cookies.TryGetValue("sid", out var sessionId) && !string.IsNullOrEmpty(sessionId))
    {
        var session = await dbContext.UserSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
        if (session != null)
        {
            dbContext.UserSessions.Remove(session);
            await dbContext.SaveChangesAsync();
        }
    }
    httpContext.Response.Cookies.Delete("sid");
    return Results.Ok(ApiResponse<string>.Ok("Đã đăng xuất thành công."));
});

// Notifications: List
app.MapGet("/api/notifications", async (Guid? userId, IMediator mediator) =>
{
    var result = await mediator.Send(new GetNotificationsQuery(userId));
    return Results.Ok(result);
});

// Notifications: Mark as read
app.MapPut("/api/notifications/{id:guid}/read", async (Guid id, IMediator mediator) =>
{
    var result = await mediator.Send(new MarkNotificationReadCommand(id));
    return Results.Ok(result);
});

// Notifications: Mark all as read
app.MapPut("/api/notifications/read-all", async (Guid? userId, IMediator mediator) =>
{
    var result = await mediator.Send(new MarkAllNotificationsReadCommand(userId));
    return Results.Ok(result);
});

// Notifications: Test real-time broadcast via SignalR
app.MapPost("/api/notifications/test", async (SendTestNotificationCommand command, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    return Results.Ok(result);
});

// ------------------------------------------
// 2. Shopify (E-commerce) Module Endpoints
// ------------------------------------------

// Categories
app.MapGet("/api/categories", async (IMediator mediator) =>
{
    var result = await mediator.Send(new GetCategoriesQuery());
    return Results.Ok(result);
});

// Products: List & Search
app.MapGet("/api/products", async (Guid? categoryId, string? search, int? page, int? pageSize, IMediator mediator) =>
{
    var result = await mediator.Send(new ListProductsQuery(categoryId, search, page, pageSize));
    return Results.Ok(result);
});

// Products: Detail
app.MapGet("/api/products/{id:guid}", async (Guid id, IMediator mediator) =>
{
    var result = await mediator.Send(new GetProductDetailQuery(id));
    return result.Success ? Results.Ok(result) : Results.NotFound(result);
});

// Products: Add Evaluation (Review/Rating)
app.MapPost("/api/products/{id:guid}/evaluations", async (Guid id, AddEvaluationCommand command, IMediator mediator) =>
{
    var cmd = command with { ProductId = id };
    var result = await mediator.Send(cmd);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Cart: Get Cart
app.MapGet("/api/cart", async (Guid? userId, string? sessionId, IMediator mediator) =>
{
    var result = await mediator.Send(new GetCartQuery(userId, sessionId));
    return Results.Ok(result);
});

// Cart: Add Item
app.MapPost("/api/cart/items", async (AddToCartCommand command, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Cart: Update Item Quantity
app.MapPut("/api/cart/items/{id:guid}", async (Guid id, UpdateCartItemCommand command, IMediator mediator) =>
{
    var cmd = command with { ItemId = id };
    var result = await mediator.Send(cmd);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Cart: Remove Item
app.MapDelete("/api/cart/items/{id:guid}", async (Guid id, IMediator mediator) =>
{
    var result = await mediator.Send(new RemoveCartItemCommand(id));
    return Results.Ok(result);
});

// Vouchers: List Available
app.MapGet("/api/vouchers", async (IMediator mediator) =>
{
    var result = await mediator.Send(new GetVouchersQuery());
    return Results.Ok(result);
});

// Vouchers: Apply Code
app.MapPost("/api/vouchers/apply", async (ApplyVoucherCommand command, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Orders: Checkout with 15-minute stock reservation & PayOS link
app.MapPost("/api/orders/checkout", async (CheckoutCommand command, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Orders: History
app.MapGet("/api/orders/history", async (Guid? userId, string? email, IMediator mediator) =>
{
    var result = await mediator.Send(new GetOrderHistoryQuery(userId, email));
    return Results.Ok(result);
});

// Payments: Status
app.MapGet("/api/payments/status/{orderCode:long}", async (long orderCode, IMediator mediator) =>
{
    var result = await mediator.Send(new GetPaymentStatusQuery(orderCode));
    return result.Success ? Results.Ok(result) : Results.NotFound(result);
});

// Payments: PayOS Webhook receiver
app.MapPost("/api/payments/payos-webhook", async (PayOSWebhookPayload payload, IMediator mediator) =>
{
    var result = await mediator.Send(new PayOSWebhookCommand(payload));
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Auto-seed database schema, users, vouchers, 26 categories, products
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbInitializer.InitializeAsync(db, app.Logger);
}

app.Run();

public record UpdateProfileRequest(string? FullName, string? PhoneNumber, string? Address);
