using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Orders.GetOrderHistory;

public record OrderItemHistoryDto(Guid Id, Guid ProductId, string ProductName, string? ProductImageUrl, decimal UnitPrice, int Quantity);

public record OrderStatusHistoryDto(OrderStatus Status, string Note, DateTime Timestamp);

public record OrderHistoryDto(
    Guid Id,
    long OrderCode,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string ShippingAddress,
    decimal SubTotal,
    decimal DiscountAmount,
    string? VoucherCode,
    decimal TotalAmount,
    string Status,
    DateTime CreatedAt,
    string? CheckoutUrl,
    List<OrderItemHistoryDto> Items,
    List<OrderStatusHistoryDto> StatusHistories
);

public record GetOrderHistoryQuery(Guid? UserId, string? Email) : IRequest<ApiResponse<List<OrderHistoryDto>>>;

public class GetOrderHistoryQueryHandler : IRequestHandler<GetOrderHistoryQuery, ApiResponse<List<OrderHistoryDto>>>
{
    private readonly AppDbContext _context;

    public GetOrderHistoryQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<OrderHistoryDto>>> Handle(GetOrderHistoryQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.StatusHistories)
            .AsQueryable();

        if (request.UserId.HasValue)
        {
            query = query.Where(o => o.UserId == request.UserId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var email = request.Email.Trim().ToLowerInvariant();
            query = query.Where(o => o.CustomerEmail.ToLower() == email);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(20)
            .Select(o => new OrderHistoryDto(
                o.Id,
                o.OrderCode,
                o.CustomerName,
                o.CustomerEmail,
                o.CustomerPhone,
                o.ShippingAddress,
                o.SubTotal,
                o.DiscountAmount,
                o.VoucherCode,
                o.TotalAmount,
                o.Status.ToString(),
                o.CreatedAt,
                o.PayOSCheckoutUrl,
                o.Items.Select(i => new OrderItemHistoryDto(i.Id, i.ProductId, i.ProductName, i.ProductImageUrl, i.UnitPrice, i.Quantity)).ToList(),
                o.StatusHistories.OrderBy(h => h.Timestamp).Select(h => new OrderStatusHistoryDto(h.Status, h.Note, h.Timestamp)).ToList()
            ))
            .ToListAsync(cancellationToken);

        return ApiResponse<List<OrderHistoryDto>>.Ok(orders);
    }
}
