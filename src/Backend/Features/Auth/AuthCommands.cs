using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Hubs;
using DAFL.Backend.Infrastructure.Messaging;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Auth;

// DTOs
public record UserDto(Guid Id, string Email, string FullName, string? PhoneNumber, string? Address, string Role, string SessionId);
public record NotificationDto(Guid Id, string Title, string Message, string Type, bool IsRead, DateTime CreatedAt);

// 1. Register Command
public record RegisterCommand(string Email, string Password, string FullName, string? PhoneNumber, string? Address) 
    : IRequest<ApiResponse<UserDto>>;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, ApiResponse<UserDto>>
{
    private readonly AppDbContext _context;
    private readonly IKafkaProducer _kafkaProducer;
    private readonly IHubContext<NotificationHub, INotificationClient> _hubContext;

    public RegisterCommandHandler(
        AppDbContext context, 
        IKafkaProducer kafkaProducer,
        IHubContext<NotificationHub, INotificationClient> hubContext)
    {
        _context = context;
        _kafkaProducer = kafkaProducer;
        _hubContext = hubContext;
    }

    public async Task<ApiResponse<UserDto>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return ApiResponse<UserDto>.Fail("Mật khẩu phải có tối thiểu 8 ký tự.");
        }

        if (!request.Password.Any(char.IsUpper))
        {
            return ApiResponse<UserDto>.Fail("Mật khẩu phải chứa ít nhất 1 ký tự chữ hoa (A-Z).");
        }

        if (!request.Password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return ApiResponse<UserDto>.Fail("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !@#$%^&*...).");
        }

        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken))
        {
            return ApiResponse<UserDto>.Fail("Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Address = request.Address?.Trim(),
            Role = "Customer",
            CreatedAt = DateTime.UtcNow
        };

        var sessionId = Guid.NewGuid().ToString("N");
        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        var welcomeNotification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = "Chào mừng thành viên mới!",
            Message = $"Xin chào {user.FullName}, chúc mừng bạn đã gia nhập DAFL Store. Nhập mã DAFL10 để được giảm 10% đơn hàng đầu tiên!",
            Type = "Promotion",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Users.AddAsync(user, cancellationToken);
        await _context.UserSessions.AddAsync(session, cancellationToken);
        await _context.Notifications.AddAsync(welcomeNotification, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // Real-time notification via SignalR
        var notifDto = new NotificationDto(
            welcomeNotification.Id, 
            welcomeNotification.Title, 
            welcomeNotification.Message, 
            welcomeNotification.Type, 
            welcomeNotification.IsRead, 
            welcomeNotification.CreatedAt
        );
        await _hubContext.Clients.Group(NotificationGroups.ForUser(user.Id)).ReceiveNotification(notifDto);

        // Kafka Event
        await _kafkaProducer.PublishAsync(
            "notification-events",
            user.Email,
            new NotificationEvent("USER_REGISTERED", user.Email, welcomeNotification.Title, welcomeNotification.Message, DateTime.UtcNow),
            cancellationToken
        );

        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.PhoneNumber, user.Address, user.Role, sessionId);
        return ApiResponse<UserDto>.Ok(userDto, "Đăng ký tài khoản thành công!");
    }
}

// 2. Login Command
public record LoginCommand(string Email, string Password) : IRequest<ApiResponse<UserDto>>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, ApiResponse<UserDto>>
{
    private readonly AppDbContext _context;
    private readonly IKafkaProducer _kafkaProducer;
    private readonly IHubContext<NotificationHub, INotificationClient> _hubContext;

    public LoginCommandHandler(
        AppDbContext context, 
        IKafkaProducer kafkaProducer,
        IHubContext<NotificationHub, INotificationClient> hubContext)
    {
        _context = context;
        _kafkaProducer = kafkaProducer;
        _hubContext = hubContext;
    }

    public async Task<ApiResponse<UserDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return ApiResponse<UserDto>.Fail("Email hoặc mật khẩu không chính xác.");
        }

        var sessionId = Guid.NewGuid().ToString("N");
        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        await _context.UserSessions.AddAsync(session, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // Real-time login alert via SignalR
        var loginNotif = new NotificationDto(
            Guid.NewGuid(),
            "Đăng nhập thành công",
            $"Tài khoản {user.FullName} vừa đăng nhập vào hệ thống.",
            "System",
            false,
            DateTime.UtcNow
        );
        await _hubContext.Clients.Group(NotificationGroups.ForUser(user.Id)).ReceiveNotification(loginNotif);

        await _kafkaProducer.PublishAsync(
            "notification-events",
            user.Email,
            new NotificationEvent("USER_LOGIN", user.Email, "Đăng nhập thành công", $"Xin chào {user.FullName}, bạn vừa đăng nhập vào hệ thống DAFL.", DateTime.UtcNow),
            cancellationToken
        );

        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.PhoneNumber, user.Address, user.Role, sessionId);
        return ApiResponse<UserDto>.Ok(userDto, "Đăng nhập thành công.");
    }
}
