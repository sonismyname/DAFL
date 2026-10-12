using DAFL.Backend.Common;
using DAFL.Backend.Common.Behaviors;
using DAFL.Backend.Features.Auth.SessionLogin;
using DAFL.Backend.Features.Categories.GetCategories;
using DAFL.Backend.Features.Orders;
using DAFL.Backend.Features.Orders.Checkout;
using DAFL.Backend.Features.Payments.GetPaymentStatus;
using DAFL.Backend.Features.Payments.PayOSWebhook;
using DAFL.Backend.Features.Products.ListProducts;
using DAFL.Backend.Infrastructure.Caching;
using DAFL.Backend.Infrastructure.Data;
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

// 2. Database - Microsoft SQL Server 2022
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=localhost,1433;Database=DAFL_DB;User Id=sa;Password=YourStrong@Passw0rd123!;TrustServerCertificate=True;";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
    });
});

// 3. Resilient Redis Caching
var redisConnectionString = builder.Configuration["CacheSettings:ConnectionString"] ?? "localhost:6379,abortConnect=false,connectTimeout=2000";
IConnectionMultiplexer? redisConnection = null;

try
{
    var configOptions = ConfigurationOptions.Parse(redisConnectionString);
    configOptions.AbortOnConnectFail = false; // Never crash application if Redis is temporarily down
    configOptions.ConnectTimeout = 2000;
    configOptions.SyncTimeout = 2000;
    redisConnection = ConnectionMultiplexer.Connect(configOptions);
    builder.Services.AddSingleton<IConnectionMultiplexer>(redisConnection);
}
catch (Exception ex)
{
    Console.WriteLine($"[Cache Warning] Could not initialize Redis connection at startup: {ex.Message}. Falling back to in-memory.");
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

// 8. CORS configuration for React SPA
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
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
// Minimal API Endpoints (Vertical Slices)
// ==========================================

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

// Categories: 26 E-commerce Categories
app.MapGet("/api/categories", async (IMediator mediator) =>
{
    var result = await mediator.Send(new GetCategoriesQuery());
    return Results.Ok(result);
});

// Products: Catalog & Search
app.MapGet("/api/products", async (Guid? categoryId, string? search, IMediator mediator) =>
{
    var result = await mediator.Send(new ListProductsQuery(categoryId, search));
    return Results.Ok(result);
});

// Orders: Checkout with 15-minute stock reservation & PayOS link creation
app.MapPost("/api/orders/checkout", async (CheckoutCommand command, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Payments: Get payment status by orderCode
app.MapGet("/api/payments/status/{orderCode:long}", async (long orderCode, IMediator mediator) =>
{
    var result = await mediator.Send(new GetPaymentStatusQuery(orderCode));
    return result.Success ? Results.Ok(result) : Results.NotFound(result);
});

// Payments: PayOS Webhook receiver with HMAC checksum verification
app.MapPost("/api/payments/payos-webhook", async (PayOSWebhookPayload payload, IMediator mediator) =>
{
    var result = await mediator.Send(new PayOSWebhookCommand(payload));
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

// Auth: Session Login (sets HttpOnly, SameSite=Lax cookie)
app.MapPost("/api/auth/login", async (SessionLoginCommand command, HttpContext httpContext, IMediator mediator) =>
{
    var result = await mediator.Send(command);
    if (result.Success && result.Data != null)
    {
        httpContext.Response.Cookies.Append("sid", result.Data.SessionId, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = false, // Set true in Production with HTTPS
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }
    return Results.Ok(result);
});

// Auth: Current User from session cookie
app.MapGet("/api/auth/me", async (HttpContext httpContext, AppDbContext dbContext) =>
{
    if (!httpContext.Request.Cookies.TryGetValue("sid", out var sessionId) || string.IsNullOrEmpty(sessionId))
    {
        return Results.Ok(ApiResponse<SessionUserDto?>.Ok(null, "Chưa đăng nhập."));
    }

    var session = await dbContext.UserSessions
        .AsNoTracking()
        .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.ExpiresAt > DateTime.UtcNow);

    if (session == null)
    {
        return Results.Ok(ApiResponse<SessionUserDto?>.Ok(null, "Phiên đăng nhập đã hết hạn."));
    }

    return Results.Ok(ApiResponse<SessionUserDto>.Ok(new SessionUserDto(session.SessionId, session.Email, session.FullName)));
});

// Auth: Logout
app.MapPost("/api/auth/logout", (HttpContext httpContext) =>
{
    httpContext.Response.Cookies.Delete("sid");
    return Results.Ok(ApiResponse<string>.Ok("Đã đăng xuất thành công."));
});

// Auto-seed database schema and 26 categories
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbInitializer.InitializeAsync(db, app.Logger);
}

app.Run();
