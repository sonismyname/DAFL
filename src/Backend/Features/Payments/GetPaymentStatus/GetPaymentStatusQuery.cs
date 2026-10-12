using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Payments.GetPaymentStatus;

public record OrderStatusDto(
    long OrderCode,
    string Status,
    decimal TotalAmount,
    string CustomerName,
    DateTime CreatedAt,
    DateTime ExpiresAt);

public record GetPaymentStatusQuery(long OrderCode) : IRequest<ApiResponse<OrderStatusDto>>;

public class GetPaymentStatusQueryHandler : IRequestHandler<GetPaymentStatusQuery, ApiResponse<OrderStatusDto>>
{
    private readonly AppDbContext _context;

    public GetPaymentStatusQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<OrderStatusDto>> Handle(GetPaymentStatusQuery request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrderCode == request.OrderCode, cancellationToken);

        if (order == null)
        {
            return ApiResponse<OrderStatusDto>.Fail($"Không tìm thấy đơn hàng #{request.OrderCode}");
        }

        var dto = new OrderStatusDto(
            order.OrderCode,
            order.Status.ToString(),
            order.TotalAmount,
            order.CustomerName,
            order.CreatedAt,
            order.ExpiresAt);

        return ApiResponse<OrderStatusDto>.Ok(dto);
    }
}
