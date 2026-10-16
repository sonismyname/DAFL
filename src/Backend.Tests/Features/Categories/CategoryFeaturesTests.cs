using DAFL.Backend.Common;
using DAFL.Backend.Features.Categories.GetCategories;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;

namespace DAFL.Backend.Tests.Features.Categories;

/// <summary>
/// Unit tests cho module Category (Danh mục sản phẩm).
/// </summary>
public class CategoryFeaturesTests : IDisposable
{
    private readonly AppDbContext _context;

    public CategoryFeaturesTests()
    {
        _context = TestDbContextFactory.CreateWithSeedData();
    }

    public void Dispose() => _context.Dispose();

    /// <summary>
    /// TC-CAT-01: Lấy danh sách tất cả danh mục → Trả về danh sách có ít nhất 1 danh mục.
    /// </summary>
    [Fact]
    public async Task GetCategories_ShouldReturnAllCategories()
    {
        // Arrange
        var handler = new GetCategoriesQueryHandler(_context);
        var query = new GetCategoriesQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Count.Should().BeGreaterOrEqualTo(1);
    }

    /// <summary>
    /// TC-CAT-02: Danh sách danh mục được sắp xếp theo tên → Đúng thứ tự alphabet.
    /// </summary>
    [Fact]
    public async Task GetCategories_ShouldReturnSortedByName()
    {
        // Arrange - Thêm thêm category
        _context.Categories.Add(new Category
        {
            Id = Guid.NewGuid(),
            Name = "Áo thun",
            Slug = "ao-thun",
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var handler = new GetCategoriesQueryHandler(_context);
        var query = new GetCategoriesQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Data!.Should().BeInAscendingOrder(c => c.Name);
    }

    /// <summary>
    /// TC-CAT-03: Category trả về bao gồm đầy đủ thông tin: Id, Name, Slug.
    /// </summary>
    [Fact]
    public async Task GetCategories_ShouldReturnFullCategoryInfo()
    {
        // Arrange
        var handler = new GetCategoriesQueryHandler(_context);
        var query = new GetCategoriesQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        var category = result.Data!.First();
        category.Id.Should().NotBe(Guid.Empty);
        category.Name.Should().NotBeNullOrEmpty();
        category.Slug.Should().NotBeNullOrEmpty();
    }
}
