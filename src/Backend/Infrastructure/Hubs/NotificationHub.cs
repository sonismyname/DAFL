using DAFL.Backend.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Infrastructure.Hubs;

public interface INotificationClient
{
    Task ReceiveNotification(object notification);
    Task ReceiveOrderStatusUpdate(long orderCode, string status, string message);
    Task ReceiveCartUpdated(object cartData);
}

public static class NotificationGroups
{
    public static string ForUser(Guid userId) => $"user_{userId}";
}

public class NotificationHub : Hub<INotificationClient>
{
    private readonly ILogger<NotificationHub> _logger;
    private readonly AppDbContext _context;

    public NotificationHub(ILogger<NotificationHub> logger, AppDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("SignalR client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Tham gia nhóm thông báo riêng của người dùng. Phải xuất trình sessionId còn hiệu lực
    /// (không nhận userId tùy ý từ client để tránh nghe lén thông báo của người khác).
    /// </summary>
    public async Task<bool> JoinUserGroup(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return false;

        var userId = await _context.UserSessions
            .AsNoTracking()
            .Where(s => s.SessionId == sessionId && s.ExpiresAt > DateTime.UtcNow && s.UserId != null)
            .Select(s => s.UserId)
            .FirstOrDefaultAsync();

        if (userId == null)
        {
            _logger.LogWarning("Connection {ConnectionId} tried to join a user group with an invalid session", Context.ConnectionId);
            return false;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, NotificationGroups.ForUser(userId.Value));
        _logger.LogInformation("Connection {ConnectionId} joined user group {Group}", Context.ConnectionId, NotificationGroups.ForUser(userId.Value));
        return true;
    }

    public async Task LeaveUserGroup(string userId)
    {
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
    }
}
