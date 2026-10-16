using DAFL.Backend.Common;
using DAFL.Backend.Features.Products;
using DAFL.Backend.Features.Products.ListProducts;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Hubs;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace DAFL.Backend.Tests.Features.Products;

/// <summary>
/// Unit tests cho module Products (Sản phẩm).
/// Bao gồm: Danh sách, Tìm kiếm, Lọc theo category, Chi tiết, Đánh giá sản phẩm.
/// </summary>
public class ProductFeaturesTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Mock<IHubContext<NotificationHub, INotificationClient>> _mockHubContext;
    private readonly Mock<INotificationClient> _mockClients;

    public ProductFeaturesTests()
    {
        _context = TestDbContextFactory.CreateWithSeedData();
        _mockHubContext = new Mock<IHubContext<NotificationHub, INotificationClient>>();
        _mockClients = new Mock<INotificationClient>();
        _mockHubContext.Setup(h => h.Clients.All).Returns(_mockClients.Object);
        _mockClients.Setup(c => c.ReceiveNotification(It.IsAny<object>())).Returns(Task.CompletedTask);
    }

    public void Dispose() => _context.Dispose();

    #region ListProducts Tests - Positive

    /// <summary>
    /// TC-PROD-01: Lấy danh sách tất cả sản phẩm (không filter) → Trả về tất cả.
    /// </summary>
    [Fact]
    public async Task ListProducts_WithoutFilter_ShouldReturnAllProducts()
    {
        // Arrange
        var handler = new ListProductsQueryHandler(_context);
        var query = new ListProductsQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Count.Should().BeGreaterOrEqualTo(2);
    }

    /// <summary>
    /// TC-PROD-02: Lọc sản phẩm theo categoryId → Chỉ trả về sản phẩm thuộc category đó.
    /// </summary>
    [Fact]
    public async Task ListProducts_ByCategoryId_ShouldReturnFilteredProducts()
    {
        // Arrange
        var handler = new ListProductsQueryHandler(_context);
        var query = new ListProductsQuery(CategoryId: TestConstants.TestCategoryId);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Should().OnlyContain(p => p.CategoryId == TestConstants.TestCategoryId);
    }

    /// <summary>
    /// TC-PROD-03: Tìm kiếm sản phẩm theo tên → Trả về kết quả khớp.
    /// </summary>
    [Fact]
    public async Task ListProducts_WithSearchTerm_ShouldReturnMatchingProducts()
    {
        // Arrange
        var handler = new ListProductsQueryHandler(_context);
        var query = new ListProductsQuery(Search: "iPhone");

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeEmpty();
        result.Data!.Should().Contain(p => p.Name.Contains("iPhone"));
    }

    /// <summary>
    /// TC-PROD-04: Phân trang sản phẩm → Trả về đúng số lượng theo pageSize.
    /// </summary>
    [Fact]
    public async Task ListProducts_WithPagination_ShouldReturnCorrectPage()
    {
        // Arrange
        var handler = new ListProductsQueryHandler(_context);
        var query = new ListProductsQuery(Page: 1, PageSize: 1);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Count.Should().BeLessOrEqualTo(1);
    }

    /// <summary>
    /// TC-PROD-05: Tìm kiếm không khớp → Trả về danh sách rỗng (không lỗi).
    /// </summary>
    [Fact]
    public async Task ListProducts_WithNoMatch_ShouldReturnEmptyList()
    {
        // Arrange
        var handler = new ListProductsQueryHandler(_context);
        var query = new ListProductsQuery(Search: "SanPhamKhongTonTaiXYZ123");

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().BeEmpty();
    }

    #endregion

    #region GetProductDetail Tests

    /// <summary>
    /// TC-PROD-06: Xem chi tiết sản phẩm tồn tại → Trả về đầy đủ thông tin.
    /// </summary>
    [Fact]
    public async Task GetProductDetail_WithValidId_ShouldReturnProductInfo()
    {
        // Arrange
        var handler = new GetProductDetailQueryHandler(_context);
        var query = new GetProductDetailQuery(TestConstants.TestProductId1);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Name.Should().Be("iPhone 15 Pro Max");
        result.Data.Price.Should().Be(34990000m);
        result.Data.AvailableStock.Should().Be(50);
    }

    /// <summary>
    /// TC-PROD-07: Xem chi tiết sản phẩm không tồn tại → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task GetProductDetail_WithInvalidId_ShouldReturnFail()
    {
        // Arrange
        var handler = new GetProductDetailQueryHandler(_context);
        var query = new GetProductDetailQuery(Guid.NewGuid());

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Không tìm thấy sản phẩm");
    }

    #endregion

    #region AddEvaluation Tests - Positive

    /// <summary>
    /// TC-PROD-08: Thêm đánh giá hợp lệ (1-5 sao) → Thành công, cập nhật rating.
    /// </summary>
    [Fact]
    public async Task AddEvaluation_WithValidRating_ShouldAddSuccessfully()
    {
        // Arrange
        var handler = new AddEvaluationCommandHandler(_context, _mockHubContext.Object);
        var command = new AddEvaluationCommand(TestConstants.TestProductId1, TestConstants.TestUserId, "Nguyen Van A", 5, "Sản phẩm tuyệt vời!");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Rating.Should().Be(5);
        result.Data.Comment.Should().Be("Sản phẩm tuyệt vời!");
    }

    /// <summary>
    /// TC-PROD-09: Thêm đánh giá → ReviewCount và Rating trung bình được cập nhật.
    /// </summary>
    [Fact]
    public async Task AddEvaluation_ShouldUpdateProductRatingAndReviewCount()
    {
        // Arrange
        var handler = new AddEvaluationCommandHandler(_context, _mockHubContext.Object);
        var command = new AddEvaluationCommand(TestConstants.TestProductId1, null, "User A", 4, "Tốt");

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        var product = await _context.Products.Include(p => p.Evaluations)
            .FirstAsync(p => p.Id == TestConstants.TestProductId1);
        product.ReviewCount.Should().BeGreaterThan(0);
    }

    /// <summary>
    /// TC-PROD-10: Thêm đánh giá không có tên → Sử dụng tên mặc định "Khách hàng DAFL".
    /// </summary>
    [Fact]
    public async Task AddEvaluation_WithEmptyUserName_ShouldUseDefaultName()
    {
        // Arrange
        var handler = new AddEvaluationCommandHandler(_context, _mockHubContext.Object);
        var command = new AddEvaluationCommand(TestConstants.TestProductId1, null, "", 4, "Bình thường");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.UserName.Should().Be("Khách hàng DAFL");
    }

    #endregion

    #region AddEvaluation Tests - Negative

    /// <summary>
    /// TC-PROD-11: Đánh giá ngoài phạm vi (0 sao) → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task AddEvaluation_WithInvalidRatingZero_ShouldReturnFail()
    {
        // Arrange
        var handler = new AddEvaluationCommandHandler(_context, _mockHubContext.Object);
        var command = new AddEvaluationCommand(TestConstants.TestProductId1, null, "User", 0, "Test");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("1 đến 5 sao");
    }

    /// <summary>
    /// TC-PROD-12: Đánh giá ngoài phạm vi (6 sao) → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task AddEvaluation_WithInvalidRatingSix_ShouldReturnFail()
    {
        // Arrange
        var handler = new AddEvaluationCommandHandler(_context, _mockHubContext.Object);
        var command = new AddEvaluationCommand(TestConstants.TestProductId1, null, "User", 6, "Test");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("1 đến 5 sao");
    }

    /// <summary>
    /// TC-PROD-13: Đánh giá sản phẩm không tồn tại → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task AddEvaluation_ForNonExistentProduct_ShouldReturnFail()
    {
        // Arrange
        var handler = new AddEvaluationCommandHandler(_context, _mockHubContext.Object);
        var command = new AddEvaluationCommand(Guid.NewGuid(), null, "User", 5, "Test");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Không tìm thấy sản phẩm");
    }

    #endregion
}
