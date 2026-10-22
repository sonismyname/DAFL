using System.Text.Json;
using DAFL.Backend.Features.Products;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace DAFL.Backend.Tests.Features.Products;

/// <summary>
/// Unit tests cho thư viện ảnh sản phẩm: parse ImagesJson, trả về ở chi tiết, và đồng bộ ảnh seed.
/// </summary>
public class ProductGalleryTests : IDisposable
{
    private readonly AppDbContext _context = TestDbContextFactory.CreateWithSeedData();

    public void Dispose() => _context.Dispose();

    /// <summary>
    /// TC-GAL-01: ImagesJson trống/hỏng → chỉ còn ảnh đại diện.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("không phải json")]
    public void ParseImages_WithMissingOrInvalidJson_ReturnsOnlyMainImage(string? json)
    {
        GetProductDetailQueryHandler.ParseImages(json, "https://a/main.jpg").Should().Equal("https://a/main.jpg");
    }

    /// <summary>
    /// TC-GAL-02: Ảnh đại diện luôn đứng đầu, ảnh trùng/rỗng bị loại.
    /// </summary>
    [Fact]
    public void ParseImages_PutsMainFirstAndRemovesDuplicates()
    {
        var json = JsonSerializer.Serialize(new[] { "https://a/2.jpg", "https://a/main.jpg", "", "https://a/2.jpg", "https://a/3.jpg" });

        GetProductDetailQueryHandler.ParseImages(json, "https://a/main.jpg")
            .Should().Equal("https://a/main.jpg", "https://a/2.jpg", "https://a/3.jpg");
    }

    /// <summary>
    /// TC-GAL-03: API chi tiết sản phẩm trả về danh sách ảnh.
    /// </summary>
    [Fact]
    public async Task GetProductDetail_ReturnsGalleryImages()
    {
        var product = await _context.Products.SingleAsync(p => p.Id == TestConstants.TestProductId1);
        product.ImagesJson = JsonSerializer.Serialize(new[] { product.ImageUrl, "https://a/2.jpg", "https://a/3.jpg" });
        await _context.SaveChangesAsync();

        var result = await new GetProductDetailQueryHandler(_context)
            .Handle(new GetProductDetailQuery(product.Id), CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Data!.Images.Should().Equal(product.ImageUrl, "https://a/2.jpg", "https://a/3.jpg");
    }

    /// <summary>
    /// TC-GAL-04: Mọi sản phẩm seed đều có thư viện ≥ 2 ảnh, ảnh chính đứng đầu, không trùng ảnh.
    /// </summary>
    [Fact]
    public void BuildSeedGalleries_GivesEveryProductMultipleDistinctImages()
    {
        var galleries = DbInitializer.BuildSeedGalleries();

        galleries.Should().NotBeEmpty();
        foreach (var (slug, images) in galleries)
        {
            images.Count.Should().BeInRange(2, 4, $"sản phẩm {slug} cần nhiều ảnh để lướt xem");
            images.Should().OnlyHaveUniqueItems();
        }
    }

    /// <summary>
    /// TC-GAL-05: DB cũ chứa URL ảnh đã chết → đồng bộ sửa lại ảnh chính và bổ sung ImagesJson; chạy lại không đổi gì.
    /// </summary>
    [Fact]
    public async Task SyncProductImages_RepairsBrokenMainImageAndFillsGallery()
    {
        const string slug = "ca-phe-robusta-honey-500g";
        _context.Products.Add(new Product
        {
            CategoryId = TestConstants.TestCategoryId,
            Name = "Cà phê Robusta Honey Lâm Đồng 500g",
            Slug = slug,
            ImageUrl = "https://images.unsplash.com/photo-dead-link?w=600",
            Price = 165000m,
            Stock = 10
        });
        await _context.SaveChangesAsync();

        await DbInitializer.SyncProductImagesAsync(_context, NullLogger.Instance);

        var product = await _context.Products.SingleAsync(p => p.Slug == slug);
        var expected = DbInitializer.BuildSeedGalleries()[slug];
        product.ImageUrl.Should().Be(expected[0]).And.NotContain("dead-link");
        JsonSerializer.Deserialize<List<string>>(product.ImagesJson!).Should().Equal(expected);

        var before = product.ImagesJson;
        await DbInitializer.SyncProductImagesAsync(_context, NullLogger.Instance);
        (await _context.Products.SingleAsync(p => p.Slug == slug)).ImagesJson.Should().Be(before);
    }
}
