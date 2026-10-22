using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Hubs;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace DAFL.Backend.Tests.Features.Auth;

/// <summary>
/// Unit tests cho NotificationHub: chỉ cho tham gia nhóm thông báo riêng khi có session hợp lệ.
/// </summary>
public class NotificationHubTests : IDisposable
{
    private readonly AppDbContext _context = TestDbContextFactory.CreateWithSeedData();
    private readonly Mock<IGroupManager> _groups = new();

    public void Dispose() => _context.Dispose();

    private NotificationHub CreateHub()
    {
        var callerContext = new Mock<HubCallerContext>();
        callerContext.Setup(c => c.ConnectionId).Returns("conn-1");
        _groups.Setup(g => g.AddToGroupAsync("conn-1", It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        return new NotificationHub(NullLogger<NotificationHub>.Instance, _context)
        {
            Context = callerContext.Object,
            Groups = _groups.Object
        };
    }

    private void AddSession(string sessionId, DateTime expiresAt)
    {
        _context.UserSessions.Add(new UserSession
        {
            SessionId = sessionId,
            UserId = TestConstants.TestUserId,
            Email = "test@dafl.vn",
            FullName = "Test User",
            ExpiresAt = expiresAt
        });
        _context.SaveChanges();
    }

    /// <summary>
    /// TC-HUB-01: Session hợp lệ → vào nhóm user_{userId} của chính session đó.
    /// </summary>
    [Fact]
    public async Task JoinUserGroup_WithValidSession_JoinsOwnUserGroup()
    {
        AddSession("valid-session", DateTime.UtcNow.AddDays(1));

        var joined = await CreateHub().JoinUserGroup("valid-session");

        joined.Should().BeTrue();
        _groups.Verify(g => g.AddToGroupAsync("conn-1", NotificationGroups.ForUser(TestConstants.TestUserId), It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>
    /// TC-HUB-02: Session sai, hết hạn, hoặc truyền userId trực tiếp → bị từ chối, không vào nhóm nào.
    /// </summary>
    [Theory]
    [InlineData("khong-ton-tai")]
    [InlineData("11111111-1111-1111-1111-111111111111")]
    [InlineData("")]
    public async Task JoinUserGroup_WithInvalidSession_IsRejected(string sessionId)
    {
        var joined = await CreateHub().JoinUserGroup(sessionId);

        joined.Should().BeFalse();
        _groups.Verify(g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task JoinUserGroup_WithExpiredSession_IsRejected()
    {
        AddSession("expired-session", DateTime.UtcNow.AddMinutes(-1));

        var joined = await CreateHub().JoinUserGroup("expired-session");

        joined.Should().BeFalse();
    }
}
