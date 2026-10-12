using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Categories.GetCategories;

public record CategoryDto(Guid Id, string Name, string Slug, string? Description, string? IconUrl);

public record GetCategoriesQuery : IRequest<ApiResponse<List<CategoryDto>>>, ICacheableQuery
{
    public string CacheKey => "categories:all";
    public TimeSpan? Expiration => TimeSpan.FromHours(1);
}

public class GetCategoriesQueryHandler : IRequestHandler<GetCategoriesQuery, ApiResponse<List<CategoryDto>>>
{
    private readonly AppDbContext _context;

    public GetCategoriesQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<CategoryDto>>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Description, c.IconUrl))
            .ToListAsync(cancellationToken);

        return ApiResponse<List<CategoryDto>>.Ok(categories);
    }
}
