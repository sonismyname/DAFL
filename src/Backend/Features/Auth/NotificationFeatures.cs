using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Hubs;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Auth;

// Query: Get Notifications
public record GetNotificationsQuery(Guid? UserId) : IRequest<ApiResponse<List<NotificationDto>>>;

public class GetNotificationsQueryHandler : IRequestHandler<GetNotificationsQuery, ApiResponse<List<NotificationDto>>>
{
    private readonly AppDbContext _context;

    public GetNotificationsQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<NotificationDto>>> Handle(GetNotificationsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Notifications.AsNoTracking();

        if (request.UserId.HasValue)
        {
            query = query.Where(n => n.UserId == request.UserId.Value || n.UserId == null);
        }

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(30)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt))
            .ToListAsync(cancellationToken);

        return ApiResponse<List<NotificationDto>>.Ok(notifications);
    }
}

// Command: Mark as Read
public record MarkNotificationReadCommand(Guid NotificationId) : IRequest<ApiResponse<bool>>;

public class MarkNotificationReadCommandHandler : IRequestHandler<MarkNotificationReadCommand, ApiResponse<bool>>
{
    private readonly AppDbContext _context;

    public MarkNotificationReadCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(MarkNotificationReadCommand request, CancellationToken cancellationToken)
    {
        var notif = await _context.Notifications.FindAsync(new object[] { request.NotificationId }, cancellationToken);
        if (notif == null) return ApiResponse<bool>.Fail("Không tìm thấy thông báo.");

        notif.IsRead = true;
        await _context.SaveChangesAsync(cancellationToken);
        return ApiResponse<bool>.Ok(true, "Đã đánh dấu thông báo đã đọc.");
    }
}

// Command: Mark All Read
public record MarkAllNotificationsReadCommand(Guid? UserId) : IRequest<ApiResponse<bool>>;

public class MarkAllNotificationsReadCommandHandler : IRequestHandler<MarkAllNotificationsReadCommand, ApiResponse<bool>>
{
    private readonly AppDbContext _context;

    public MarkAllNotificationsReadCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        var query = _context.Notifications.Where(n => !n.IsRead);
        if (request.UserId.HasValue)
        {
            query = query.Where(n => n.UserId == request.UserId.Value);
        }

        var unread = await query.ToListAsync(cancellationToken);
        foreach (var n in unread)
        {
            n.IsRead = true;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return ApiResponse<bool>.Ok(true, "Đã đánh dấu tất cả là đã đọc.");
    }
}

// Command: Trigger Test Notification (SignalR demo)
public record SendTestNotificationCommand(string Title, string Message, string Type) : IRequest<ApiResponse<NotificationDto>>;

public class SendTestNotificationCommandHandler : IRequestHandler<SendTestNotificationCommand, ApiResponse<NotificationDto>>
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub, INotificationClient> _hubContext;

    public SendTestNotificationCommandHandler(AppDbContext context, IHubContext<NotificationHub, INotificationClient> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task<ApiResponse<NotificationDto>> Handle(SendTestNotificationCommand request, CancellationToken cancellationToken)
    {
        var notif = new Notification
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Message = request.Message,
            Type = request.Type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Notifications.AddAsync(notif, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new NotificationDto(notif.Id, notif.Title, notif.Message, notif.Type, notif.IsRead, notif.CreatedAt);
        await _hubContext.Clients.All.ReceiveNotification(dto);

        return ApiResponse<NotificationDto>.Ok(dto, "Đã phát thông báo SignalR thành công.");
    }
}
