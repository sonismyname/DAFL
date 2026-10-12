using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Messaging;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Auth.SessionLogin;

public record SessionLoginCommand(string Email, string FullName) : IRequest<ApiResponse<SessionUserDto>>;

public record SessionUserDto(string SessionId, string Email, string FullName);

public class SessionLoginCommandHandler : IRequestHandler<SessionLoginCommand, ApiResponse<SessionUserDto>>
{
    private readonly AppDbContext _context;
    private readonly IKafkaProducer _kafkaProducer;

    public SessionLoginCommandHandler(AppDbContext context, IKafkaProducer kafkaProducer)
    {
        _context = context;
        _kafkaProducer = kafkaProducer;
    }

    public async Task<ApiResponse<SessionUserDto>> Handle(SessionLoginCommand request, CancellationToken cancellationToken)
    {
        var sessionId = Guid.NewGuid().ToString("N");
        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Email = request.Email,
            FullName = request.FullName,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        await _context.UserSessions.AddAsync(session, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // Publish registration/login notification event to Kafka
        await _kafkaProducer.PublishAsync(
            "notification-events",
            request.Email,
            new NotificationEvent("USER_LOGIN", request.Email, "Đăng nhập thành công", $"Xin chào {request.FullName}, bạn vừa đăng nhập vào hệ thống DAFL.", DateTime.UtcNow),
            cancellationToken);

        return ApiResponse<SessionUserDto>.Ok(new SessionUserDto(sessionId, request.Email, request.FullName), "Đăng nhập thành công.");
    }
}
