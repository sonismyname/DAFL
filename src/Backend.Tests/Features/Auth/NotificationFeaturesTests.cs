using DAFL.Backend.Common;
using DAFL.Backend.Features.Auth;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Hubs;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace DAFL.Backend.Tests.Features.Auth;

/// <summary>
/// Unit tests cho chức năng Notification.
/// Bao gồm: Lấy danh sách, Đánh dấu đã đọc, Đánh dấu tất cả đã đọc, Gửi test notification.
/// </summary>
public class NotificationFeaturesTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Mock<IHubContext<NotificationHub, INotificationClient>> _mockHubContext;
    private readonly Mock<INotificationClient> _mockClients;

    public NotificationFeaturesTests()
    {
        _context = TestDbContextFactory.CreateWithSeedData();
        _mockHubContext = new Mock<IHubContext<NotificationHub, INotificationClient>>();
        _mockClients = new Mock<INotificationClient>();
        _mockHubContext.Setup(h => h.Clients.All).Returns(_mockClients.Object);
        _mockClients.Setup(c => c.ReceiveNotification(It.IsAny<object>())).Returns(Task.CompletedTask);

        // Seed notifications
        _context.Notifications.AddRange(
            new Notification { Id = Guid.NewGuid(), UserId = TestConstants.TestUserId, Title = "Thông báo 1", Message = "Nội dung 1", Type = "System", IsRead = false, CreatedAt = DateTime.UtcNow },
            new Notification { Id = Guid.NewGuid(), UserId = TestConstants.TestUserId, Title = "Thông báo 2", Message = "Nội dung 2", Type = "Order", IsRead = false, CreatedAt = DateTime.UtcNow },
            new Notification { Id = Guid.NewGuid(), UserId = TestConstants.TestUserId, Title = "Thông báo 3", Message = "Nội dung 3", Type = "Payment", IsRead = true, CreatedAt = DateTime.UtcNow }
        );
        _context.SaveChanges();
    }

    public void Dispose() => _context.Dispose();

    /// <summary>
    /// TC-NOTIF-01: Lấy danh sách notification theo userId → Trả về đúng số lượng.
    /// </summary>
    [Fact]
    public async Task GetNotifications_WithUserId_ShouldReturnUserNotifications()
    {
        // Arrange
        var handler = new GetNotificationsQueryHandler(_context);
        var query = new GetNotificationsQuery(TestConstants.TestUserId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Count.Should().BeGreaterOrEqualTo(3);
    }

    /// <summary>
    /// TC-NOTIF-08: Không có userId (khách chưa đăng nhập) → chỉ thấy thông báo hệ thống, không thấy thông báo của người khác.
    /// </summary>
    [Fact]
    public async Task GetNotifications_WithoutUserId_ShouldReturnOnlySystemNotifications()
    {
        // Arrange
        _context.Notifications.Add(new Notification { Id = Guid.NewGuid(), UserId = null, Title = "Hệ thống", Message = "Bảo trì", Type = "System", IsRead = false, CreatedAt = DateTime.UtcNow });
        _context.SaveChanges();
        var handler = new GetNotificationsQueryHandler(_context);

        // Act
        var result = await handler.Handle(new GetNotificationsQuery(null), CancellationToken.None);

        // Assert
        result.Data!.Should().ContainSingle().Which.Title.Should().Be("Hệ thống");
    }

    /// <summary>
    /// TC-NOTIF-09: Đánh dấu tất cả đã đọc khi không có userId → không đụng tới thông báo của người dùng khác.
    /// </summary>
    [Fact]
    public async Task MarkAllRead_WithoutUserId_ShouldNotTouchUserNotifications()
    {
        // Arrange
        var handler = new MarkAllNotificationsReadCommandHandler(_context);

        // Act
        await handler.Handle(new MarkAllNotificationsReadCommand(null), CancellationToken.None);

        // Assert
        (await _context.Notifications.CountAsync(n => n.UserId == TestConstants.TestUserId && !n.IsRead)).Should().Be(2);
    }

    /// <summary>
    /// TC-NOTIF-02: Đánh dấu notification đã đọc → IsRead = true.
    /// </summary>
    [Fact]
    public async Task MarkNotificationRead_WithValidId_ShouldMarkAsRead()
    {
        // Arrange
        var unreadNotif = await _context.Notifications.FirstAsync(n => !n.IsRead && n.UserId == TestConstants.TestUserId);
        var handler = new MarkNotificationReadCommandHandler(_context);
        var command = new MarkNotificationReadCommand(unreadNotif.Id);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        var updated = await _context.Notifications.FindAsync(unreadNotif.Id);
        updated!.IsRead.Should().BeTrue();
    }

    /// <summary>
    /// TC-NOTIF-03: Đánh dấu notification không tồn tại → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task MarkNotificationRead_WithInvalidId_ShouldReturnFail()
    {
        // Arrange
        var handler = new MarkNotificationReadCommandHandler(_context);
        var command = new MarkNotificationReadCommand(Guid.NewGuid());

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Không tìm thấy thông báo");
    }

    /// <summary>
    /// TC-NOTIF-04: Đánh dấu tất cả đã đọc → Tất cả notification chưa đọc được đánh dấu.
    /// </summary>
    [Fact]
    public async Task MarkAllNotificationsRead_ShouldMarkAllAsRead()
    {
        // Arrange
        var handler = new MarkAllNotificationsReadCommandHandler(_context);
        var command = new MarkAllNotificationsReadCommand(TestConstants.TestUserId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        var unreadCount = await _context.Notifications
            .Where(n => n.UserId == TestConstants.TestUserId && !n.IsRead)
            .CountAsync();
        unreadCount.Should().Be(0);
    }

    /// <summary>
    /// TC-NOTIF-05: Gửi test notification → Notification được lưu và phát qua SignalR.
    /// </summary>
    [Fact]
    public async Task SendTestNotification_ShouldCreateAndBroadcast()
    {
        // Arrange
        var handler = new SendTestNotificationCommandHandler(_context, _mockHubContext.Object);
        var command = new SendTestNotificationCommand("Test Title", "Test Message", "System");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Title.Should().Be("Test Title");

        _mockClients.Verify(c => c.ReceiveNotification(It.IsAny<object>()), Times.Once);
    }
}
