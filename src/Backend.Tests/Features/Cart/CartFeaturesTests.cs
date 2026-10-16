using DAFL.Backend.Common;
using DAFL.Backend.Features.Cart;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace DAFL.Backend.Tests.Features.Cart;

/// <summary>
/// Unit tests cho module Cart (Giỏ hàng).
/// Bao gồm: Lấy giỏ hàng, Thêm sản phẩm, Cập nhật số lượng, Xóa sản phẩm.
/// Tỷ lệ: 70% Positive (thêm, sửa, xóa thành công), 30% Negative (sản phẩm không tồn tại, hết hàng).
/// </summary>
public class CartFeaturesTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Mock<IMediator> _mockMediator;

    public CartFeaturesTests()
    {
        _context = TestDbContextFactory.CreateWithSeedData();
        _mockMediator = new Mock<IMediator>();

        // Setup mediator to return a mock cart response when GetCartQuery is sent
        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetCartQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ApiResponse<CartDto>.Ok(new CartDto(Guid.NewGuid(), 0, 0, new List<CartItemDto>())));
    }

    public void Dispose() => _context.Dispose();

    #region GetCart Tests - Positive

    /// <summary>
    /// TC-CART-01: Lấy giỏ hàng mới (chưa tồn tại) → Tạo giỏ hàng mới rỗng.
    /// </summary>
    [Fact]
    public async Task GetCart_WhenCartDoesNotExist_ShouldCreateNewEmptyCart()
    {
        // Arrange
        var handler = new GetCartQueryHandler(_context);
        var query = new GetCartQuery(Guid.NewGuid(), null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().BeEmpty();
        result.Data.TotalAmount.Should().Be(0);
        result.Data.TotalQuantity.Should().Be(0);
    }

    /// <summary>
    /// TC-CART-02: Lấy giỏ hàng đã có sản phẩm → Trả về đúng số lượng và tổng tiền.
    /// </summary>
    [Fact]
    public async Task GetCart_WithExistingItems_ShouldReturnCorrectTotals()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var cart = new DAFL.Backend.Infrastructure.Data.Cart
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Carts.Add(cart);

        var product = await _context.Products.FirstAsync();
        _context.CartItems.Add(new CartItem
        {
            Id = Guid.NewGuid(),
            CartId = cart.Id,
            ProductId = product.Id,
            UnitPrice = product.Price,
            Quantity = 2,
            AddedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var handler = new GetCartQueryHandler(_context);
        var query = new GetCartQuery(userId, null);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.TotalQuantity.Should().Be(2);
        result.Data.TotalAmount.Should().Be(product.Price * 2);
    }

    #endregion

    #region AddToCart Tests - Positive

    /// <summary>
    /// TC-CART-03: Thêm sản phẩm vào giỏ hàng (sản phẩm chưa có) → Thành công.
    /// </summary>
    [Fact]
    public async Task AddToCart_NewProduct_ShouldAddSuccessfully()
    {
        // Arrange
        var handler = new AddToCartCommandHandler(_context, _mockMediator.Object);
        var command = new AddToCartCommand(TestConstants.TestUserId, null, TestConstants.TestProductId1, 1);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();

        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == TestConstants.TestUserId);
        cart.Should().NotBeNull();
        cart!.Items.Should().Contain(i => i.ProductId == TestConstants.TestProductId1);
    }

    /// <summary>
    /// TC-CART-04: Thêm sản phẩm đã có trong giỏ → Cộng dồn số lượng.
    /// </summary>
    [Fact]
    public async Task AddToCart_ExistingProduct_ShouldIncrementQuantity()
    {
        // Arrange
        var handler = new AddToCartCommandHandler(_context, _mockMediator.Object);
        var command = new AddToCartCommand(TestConstants.TestUserId, null, TestConstants.TestProductId1, 1);

        // Act - Thêm lần 1
        await handler.Handle(command, CancellationToken.None);
        // Act - Thêm lần 2
        await handler.Handle(command with { Quantity = 2 }, CancellationToken.None);

        // Assert
        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == TestConstants.TestUserId);
        var item = cart!.Items.First(i => i.ProductId == TestConstants.TestProductId1);
        item.Quantity.Should().Be(3); // 1 + 2
    }

    /// <summary>
    /// TC-CART-05: Thêm sản phẩm bằng sessionId (không đăng nhập) → Thành công.
    /// </summary>
    [Fact]
    public async Task AddToCart_WithSessionId_ShouldCreateCartForGuest()
    {
        // Arrange
        var sessionId = Guid.NewGuid().ToString("N");
        var handler = new AddToCartCommandHandler(_context, _mockMediator.Object);
        var command = new AddToCartCommand(null, sessionId, TestConstants.TestProductId1, 1);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        var cart = await _context.Carts.FirstOrDefaultAsync(c => c.SessionId == sessionId);
        cart.Should().NotBeNull();
    }

    #endregion

    #region AddToCart Tests - Negative

    /// <summary>
    /// TC-CART-06: Thêm sản phẩm không tồn tại → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task AddToCart_NonExistentProduct_ShouldReturnFail()
    {
        // Arrange
        var handler = new AddToCartCommandHandler(_context, _mockMediator.Object);
        var command = new AddToCartCommand(TestConstants.TestUserId, null, Guid.NewGuid(), 1);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Không tìm thấy sản phẩm");
    }

    /// <summary>
    /// TC-CART-07: Thêm sản phẩm với số lượng vượt quá tồn kho → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task AddToCart_ExceedingStock_ShouldReturnFail()
    {
        // Arrange
        var handler = new AddToCartCommandHandler(_context, _mockMediator.Object);
        var command = new AddToCartCommand(TestConstants.TestUserId, null, TestConstants.TestProductId1, 999);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("không đủ");
    }

    #endregion

    #region UpdateCartItem Tests

    /// <summary>
    /// TC-CART-08: Cập nhật số lượng sản phẩm trong giỏ → Thành công.
    /// </summary>
    [Fact]
    public async Task UpdateCartItem_WithValidQuantity_ShouldUpdateSuccessfully()
    {
        // Arrange - Tạo cart item trước
        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(),
            CartId = Guid.NewGuid(),
            ProductId = TestConstants.TestProductId1,
            UnitPrice = 34990000m,
            Quantity = 1,
            AddedAt = DateTime.UtcNow
        };
        _context.CartItems.Add(cartItem);
        await _context.SaveChangesAsync();

        var handler = new UpdateCartItemCommandHandler(_context);
        var command = new UpdateCartItemCommand(cartItem.Id, 5);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        var updated = await _context.CartItems.FindAsync(cartItem.Id);
        updated!.Quantity.Should().Be(5);
    }

    /// <summary>
    /// TC-CART-09: Cập nhật số lượng = 0 → Xóa sản phẩm khỏi giỏ.
    /// </summary>
    [Fact]
    public async Task UpdateCartItem_WithZeroQuantity_ShouldRemoveItem()
    {
        // Arrange
        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(),
            CartId = Guid.NewGuid(),
            ProductId = TestConstants.TestProductId1,
            UnitPrice = 34990000m,
            Quantity = 1,
            AddedAt = DateTime.UtcNow
        };
        _context.CartItems.Add(cartItem);
        await _context.SaveChangesAsync();

        var handler = new UpdateCartItemCommandHandler(_context);
        var command = new UpdateCartItemCommand(cartItem.Id, 0);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        var removed = await _context.CartItems.FindAsync(cartItem.Id);
        removed.Should().BeNull();
    }

    /// <summary>
    /// TC-CART-10: Cập nhật cart item không tồn tại → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task UpdateCartItem_NonExistentItem_ShouldReturnFail()
    {
        // Arrange
        var handler = new UpdateCartItemCommandHandler(_context);
        var command = new UpdateCartItemCommand(Guid.NewGuid(), 5);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Không tìm thấy sản phẩm trong giỏ hàng");
    }

    #endregion

    #region RemoveCartItem Tests

    /// <summary>
    /// TC-CART-11: Xóa sản phẩm khỏi giỏ → Thành công.
    /// </summary>
    [Fact]
    public async Task RemoveCartItem_WithValidId_ShouldRemoveSuccessfully()
    {
        // Arrange
        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(),
            CartId = Guid.NewGuid(),
            ProductId = TestConstants.TestProductId1,
            UnitPrice = 34990000m,
            Quantity = 1,
            AddedAt = DateTime.UtcNow
        };
        _context.CartItems.Add(cartItem);
        await _context.SaveChangesAsync();

        var handler = new RemoveCartItemCommandHandler(_context);
        var command = new RemoveCartItemCommand(cartItem.Id);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        var removed = await _context.CartItems.FindAsync(cartItem.Id);
        removed.Should().BeNull();
    }

    /// <summary>
    /// TC-CART-12: Xóa sản phẩm không tồn tại → Vẫn trả về thành công (idempotent).
    /// </summary>
    [Fact]
    public async Task RemoveCartItem_NonExistentItem_ShouldReturnSuccess()
    {
        // Arrange
        var handler = new RemoveCartItemCommandHandler(_context);
        var command = new RemoveCartItemCommand(Guid.NewGuid());

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
    }

    #endregion
}
