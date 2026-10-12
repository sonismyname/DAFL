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
    int AvailableStock,
    string ImageUrl);

public record ListProductsQuery(Guid? CategoryId = null, string? Search = null) 
    : IRequest<ApiResponse<List<ProductDto>>>, ICacheableQuery
{
    public string CacheKey => $"products:cat={CategoryId}:q={Search?.Trim().ToLowerInvariant()}";
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

        var products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProductDto(
                p.Id,
                p.CategoryId,
                p.Category != null ? p.Category.Name : string.Empty,
                p.Name,
                p.Slug,
                p.Description,
                p.Price,
                p.Stock - p.ReservedStock,
                p.ImageUrl))
            .ToListAsync(cancellationToken);

        return ApiResponse<List<ProductDto>>.Ok(products);
    }
}
