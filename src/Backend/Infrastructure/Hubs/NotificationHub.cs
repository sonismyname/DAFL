using Microsoft.AspNetCore.SignalR;

namespace DAFL.Backend.Infrastructure.Hubs;

public interface INotificationClient
{
    Task ReceiveNotification(object notification);
    Task ReceiveOrderStatusUpdate(long orderCode, string status, string message);
    Task ReceiveCartUpdated(object cartData);
}

public class NotificationHub : Hub<INotificationClient>
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
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

    public async Task JoinUserGroup(string userId)
    {
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            _logger.LogInformation("Connection {ConnectionId} joined user group user_{UserId}", Context.ConnectionId, userId);
        }
    }

    public async Task LeaveUserGroup(string userId)
    {
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
    }
}
