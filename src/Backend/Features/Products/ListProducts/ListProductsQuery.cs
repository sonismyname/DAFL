using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Products.ListProducts;

public record ProductDto(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    string Name,
    string Slug,
    string Description,
    decimal Price,
    decimal? OriginalPrice,
    int AvailableStock,
    string ImageUrl,
    double Rating,
    int ReviewCount);

public record ListProductsQuery(Guid? CategoryId = null, string? Search = null, int? Page = null, int? PageSize = null) 
    : IRequest<ApiResponse<List<ProductDto>>>, ICacheableQuery
{
    public string CacheKey => $"products:cat={CategoryId}:q={Search?.Trim().ToLowerInvariant()}:p={Page}:s={PageSize}";
    public TimeSpan? Expiration => TimeSpan.FromMinutes(10);
}

public class ListProductsQueryHandler : IRequestHandler<ListProductsQuery, ApiResponse<List<ProductDto>>>
{
    private readonly AppDbContext _context;

    public ListProductsQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<ProductDto>>> Handle(ListProductsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .AsQueryable();

        if (request.CategoryId.HasValue && request.CategoryId.Value != Guid.Empty)
        {
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(search) || p.Description.ToLower().Contains(search));
        }

        query = query.OrderByDescending(p => p.CreatedAt);

        if (request.Page.HasValue && request.PageSize.HasValue && request.Page.Value > 0 && request.PageSize.Value > 0)
        {
            query = query.Skip((request.Page.Value - 1) * request.PageSize.Value).Take(request.PageSize.Value);
        }

        var products = await query
            .Select(p => new ProductDto(
                p.Id,
                p.CategoryId,
                p.Category != null ? p.Category.Name : string.Empty,
                p.Name,
                p.Slug,
                p.Description,
                p.Price,
                p.OriginalPrice,
                p.Stock - p.ReservedStock,
                p.ImageUrl,
                p.Rating,
                p.ReviewCount))
            .ToListAsync(cancellationToken);

        return ApiResponse<List<ProductDto>>.Ok(products);
    }
}
