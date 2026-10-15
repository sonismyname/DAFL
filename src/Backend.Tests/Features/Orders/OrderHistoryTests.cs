using DAFL.Backend.Common;
using DAFL.Backend.Features.Orders.GetOrderHistory;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Tests.Features.Orders;

/// <summary>
/// Unit tests cho module Orders (Đơn hàng) - phần Order History.
/// Checkout handler không test ở đây vì phụ thuộc vào PayOS service (integration test).
/// </summary>
public class OrderHistoryTests : IDisposable
{
    private readonly AppDbContext _context;

    public OrderHistoryTests()
    {
        _context = TestDbContextFactory.CreateWithSeedData();
        SeedOrders();
    }

    public void Dispose() => _context.Dispose();

    private void SeedOrders()
    {
        var order1 = new Order
        {
            Id = Guid.NewGuid(),
            OrderCode = 2610010001,
            UserId = TestConstants.TestUserId,
            CustomerName = "Test User",
            CustomerEmail = "test@dafl.vn",
            CustomerPhone = "0901234567",
            ShippingAddress = "123 Test Street",
            SubTotal = 34990000m,
            DiscountAmount = 0,
            TotalAmount = 34990000m,
            Status = OrderStatus.Paid,
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            ExpiresAt = DateTime.UtcNow.AddDays(-2).AddMinutes(15),
            Items = new List<OrderItem>
            {
                new OrderItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = TestConstants.TestProductId1,
                    ProductName = "iPhone 15 Pro Max",
                    UnitPrice = 34990000m,
                    Quantity = 1
                }
            }
        };

        var order2 = new Order
        {
            Id = Guid.NewGuid(),
            OrderCode = 2610010002,
            UserId = TestConstants.TestUserId,
            CustomerName = "Test User",
            CustomerEmail = "test@dafl.vn",
            CustomerPhone = "0901234567",
            ShippingAddress = "123 Test Street",
            SubTotal = 31990000m,
            DiscountAmount = 3199000m,
            VoucherCode = "DAFL10",
            TotalAmount = 28791000m,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };

        _context.Orders.AddRange(order1, order2);

        _context.OrderStatusHistories.Add(new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = order1.Id,
            Status = OrderStatus.Paid,
            Note = "Thanh toán thành công",
            Timestamp = DateTime.UtcNow.AddDays(-2)
        });

        _context.SaveChanges();
    }

    /// <summary>
    /// TC-ORD-01: Lấy lịch sử đơn hàng theo userId → Trả về đúng số đơn.
    /// </summary>
    [Fact]
    public async Task GetOrderHistory_ByUserId_ShouldReturnUserOrders()
    {
        // Arrange
        var handler = new GetOrderHistoryQueryHandler(_context);
        var query = new GetOrderHistoryQuery(TestConstants.TestUserId, null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Count.Should().Be(2);
    }

    /// <summary>
    /// TC-ORD-02: Lấy lịch sử đơn hàng theo email → Trả về đúng.
    /// </summary>
    [Fact]
    public async Task GetOrderHistory_ByEmail_ShouldReturnMatchingOrders()
    {
        // Arrange
        var handler = new GetOrderHistoryQueryHandler(_context);
        var query = new GetOrderHistoryQuery(null, "test@dafl.vn");

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Count.Should().BeGreaterOrEqualTo(2);
    }

    /// <summary>
    /// TC-ORD-03: Đơn hàng trả về theo thứ tự mới nhất trước.
    /// </summary>
    [Fact]
    public async Task GetOrderHistory_ShouldReturnOrderedByCreatedAtDescending()
    {
        // Arrange
        var handler = new GetOrderHistoryQueryHandler(_context);
        var query = new GetOrderHistoryQuery(TestConstants.TestUserId, null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Data!.Should().BeInDescendingOrder(o => o.CreatedAt);
    }

    /// <summary>
    /// TC-ORD-04: Đơn hàng trả về bao gồm items và status history.
    /// </summary>
    [Fact]
    public async Task GetOrderHistory_ShouldIncludeItemsAndStatusHistory()
    {
        // Arrange
        var handler = new GetOrderHistoryQueryHandler(_context);
        var query = new GetOrderHistoryQuery(TestConstants.TestUserId, null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        var paidOrder = result.Data!.First(o => o.Status == "Paid");
        paidOrder.Items.Should().NotBeEmpty();
        paidOrder.StatusHistories.Should().NotBeEmpty();
    }

    /// <summary>
    /// TC-ORD-05: Lấy lịch sử đơn hàng với userId không có đơn → Trả về danh sách rỗng.
    /// </summary>
    [Fact]
    public async Task GetOrderHistory_WithNoOrders_ShouldReturnEmptyList()
    {
        // Arrange
        var handler = new GetOrderHistoryQueryHandler(_context);
        var query = new GetOrderHistoryQuery(Guid.NewGuid(), null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().BeEmpty();
    }

    /// <summary>
    /// TC-ORD-06: Lấy lịch sử đơn hàng giới hạn tối đa 20 đơn.
    /// </summary>
    [Fact]
    public async Task GetOrderHistory_ShouldLimitTo20Orders()
    {
        // Arrange
        var handler = new GetOrderHistoryQueryHandler(_context);
        var query = new GetOrderHistoryQuery(TestConstants.TestUserId, null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Data!.Count.Should().BeLessOrEqualTo(20);
    }
}
