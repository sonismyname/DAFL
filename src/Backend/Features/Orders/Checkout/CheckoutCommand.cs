using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Payments;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Orders.Checkout;

public record CheckoutItemDto(Guid ProductId, int Quantity);

public record CheckoutCommand(
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    List<CheckoutItemDto> Items) : IRequest<ApiResponse<CheckoutResultDto>>;

public record CheckoutResultDto(
    Guid OrderId,
    long OrderCode,
    decimal TotalAmount,
    string? CheckoutUrl,
    DateTime ExpiresAt);

public class CheckoutCommandValidator : AbstractValidator<CheckoutCommand>
{
    public CheckoutCommandValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty().WithMessage("Tên khách hàng không được để trống.");
        RuleFor(x => x.CustomerEmail).NotEmpty().EmailAddress().WithMessage("Email không hợp lệ.");
        RuleFor(x => x.CustomerPhone).NotEmpty().WithMessage("Số điện thoại không được để trống.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("Giỏ hàng không có sản phẩm.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");
        });
    }
}

public class CheckoutCommandHandler : IRequestHandler<CheckoutCommand, ApiResponse<CheckoutResultDto>>
{
    private readonly AppDbContext _context;
    private readonly IPayOSService _payOSService;
    private readonly ILogger<CheckoutCommandHandler> _logger;

    public CheckoutCommandHandler(AppDbContext context, IPayOSService payOSService, ILogger<CheckoutCommandHandler> logger)
    {
        _context = context;
        _payOSService = payOSService;
        _logger = logger;
    }

    public async Task<ApiResponse<CheckoutResultDto>> Handle(CheckoutCommand request, CancellationToken cancellationToken)
    {
        // 1. Generate unique 6-digit order code for PayOS
        var orderCode = long.Parse(DateTime.UtcNow.ToString("yyMMdd") + new Random().Next(1000, 9999));

        // 2. Begin native SQL Server transaction
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            decimal totalAmount = 0;
            var orderItems = new List<OrderItem>();
            var paymentItems = new List<PaymentItemRequest>();

            var orderId = Guid.NewGuid();

            foreach (var itemReq in request.Items)
            {
                var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == itemReq.ProductId, cancellationToken);
                if (product == null)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return ApiResponse<CheckoutResultDto>.Fail($"Sản phẩm mã {itemReq.ProductId} không tồn tại.");
                }

                var availableStock = product.Stock - product.ReservedStock;
                if (availableStock < itemReq.Quantity)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return ApiResponse<CheckoutResultDto>.Fail($"Sản phẩm '{product.Name}' chỉ còn {availableStock} món, không đủ {itemReq.Quantity} món đặt mua.");
                }

                // Reserve Stock for 15 minutes
                product.ReservedStock += itemReq.Quantity;

                var itemTotal = product.Price * itemReq.Quantity;
                totalAmount += itemTotal;

                orderItems.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = orderId,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    UnitPrice = product.Price,
                    Quantity = itemReq.Quantity
                });

                paymentItems.Add(new PaymentItemRequest(product.Name, itemReq.Quantity, product.Price));
            }

            var expiresAt = DateTime.UtcNow.AddMinutes(15);
            var order = new Order
            {
                Id = orderId,
                OrderCode = orderCode,
                CustomerName = request.CustomerName,
                CustomerEmail = request.CustomerEmail,
                CustomerPhone = request.CustomerPhone,
                TotalAmount = totalAmount,
                Status = OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt,
                Items = orderItems
            };

            await _context.Orders.AddAsync(order, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // 3. Create PayOS Payment Link
            var returnUrl = $"http://localhost:3000/payment-success?orderCode={orderCode}";
            var cancelUrl = $"http://localhost:3000/cart?orderCode={orderCode}";
            var description = $"DH {orderCode}";

            var payOsResponse = await _payOSService.CreatePaymentLinkAsync(new CreatePaymentLinkRequest(
                orderCode,
                totalAmount,
                description,
                returnUrl,
                cancelUrl,
                paymentItems), cancellationToken);

            order.PayOSCheckoutUrl = payOsResponse.CheckoutUrl;
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation("Order #{OrderCode} created with 15-minute stock reservation. PayOS URL: {Url}", orderCode, payOsResponse.CheckoutUrl);

            return ApiResponse<CheckoutResultDto>.Ok(new CheckoutResultDto(
                orderId,
                orderCode,
                totalAmount,
                payOsResponse.CheckoutUrl,
                expiresAt), "Tạo đơn hàng và link thanh toán PayOS thành công.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Lỗi trong quá trình tạo đơn hàng #{OrderCode}: {Message}", orderCode, ex.Message);
            return ApiResponse<CheckoutResultDto>.Fail("Không thể khởi tạo đơn hàng: " + ex.Message);
        }
    }
}
