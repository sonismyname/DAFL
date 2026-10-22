using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Infrastructure.Hubs;
using DAFL.Backend.Infrastructure.Payments;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Orders.Checkout;

public record CheckoutItemDto(Guid ProductId, int Quantity);

public record CheckoutCommand(
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string? ShippingAddress,
    string? VoucherCode,
    Guid? UserId,
    List<CheckoutItemDto> Items) : IRequest<ApiResponse<CheckoutResultDto>>;

public record CheckoutResultDto(
    Guid OrderId,
    long OrderCode,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TotalAmount,
    string? CheckoutUrl,
    string? QrCode,
    string? AccountNumber,
    string? AccountName,
    int? Bin,
    string? PaymentDescription,
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
    private readonly IHubContext<NotificationHub, INotificationClient> _hubContext;
    private readonly ILogger<CheckoutCommandHandler> _logger;
    private readonly string _frontendBaseUrl;

    public CheckoutCommandHandler(
        AppDbContext context, 
        IPayOSService payOSService, 
        IHubContext<NotificationHub, INotificationClient> hubContext,
        ILogger<CheckoutCommandHandler> logger,
        IConfiguration configuration)
    {
        _context = context;
        _payOSService = payOSService;
        _hubContext = hubContext;
        _logger = logger;
        _frontendBaseUrl = (configuration["Frontend:BaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
    }

    public async Task<ApiResponse<CheckoutResultDto>> Handle(CheckoutCommand request, CancellationToken cancellationToken)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            // 1. Generate unique 6-digit order code for PayOS
            var orderCode = long.Parse(DateTime.UtcNow.ToString("yyMMdd") + new Random().Next(1000, 9999));

            // 2. Begin transaction
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                decimal subTotal = 0;
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
                    subTotal += itemTotal;

                    orderItems.Add(new OrderItem
                    {
                        Id = Guid.NewGuid(),
                        OrderId = orderId,
                        ProductId = product.Id,
                        ProductName = product.Name,
                        ProductImageUrl = product.ImageUrl,
                        UnitPrice = product.Price,
                        Quantity = itemReq.Quantity
                    });

                    paymentItems.Add(new PaymentItemRequest(product.Name, itemReq.Quantity, product.Price));
                }

                // Apply Voucher Discount if present
                decimal discountAmount = 0;
                string? validVoucherCode = null;

                if (!string.IsNullOrWhiteSpace(request.VoucherCode))
                {
                    var vCode = request.VoucherCode.Trim().ToUpperInvariant();
                    var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == vCode && v.IsActive && (!v.ExpiryDate.HasValue || v.ExpiryDate.Value > DateTime.UtcNow), cancellationToken);
                    if (voucher != null && subTotal >= voucher.MinOrderAmount)
                    {
                        validVoucherCode = voucher.Code;
                        if (voucher.Code == "FORDEV")
                        {
                            // Reduce total directly to 2,000 VND
                            discountAmount = Math.Max(0, subTotal - 2000m);
                        }
                        else if (voucher.DiscountType == "Percentage")
                        {
                            discountAmount = subTotal * (voucher.DiscountValue / 100m);
                            if (voucher.MaxDiscountAmount.HasValue && discountAmount > voucher.MaxDiscountAmount.Value)
                            {
                                discountAmount = voucher.MaxDiscountAmount.Value;
                            }
                        }
                        else
                        {
                            discountAmount = voucher.DiscountValue;
                        }
                    }
                }

                var totalAmount = Math.Max(1000, subTotal - discountAmount); // Minimum 1,000 VND
                var expiresAt = DateTime.UtcNow.AddMinutes(15);

                if (discountAmount > 0)
                {
                    // PayOS API requires sum(item.price * item.quantity) == amount.
                    // When voucher discount is applied, consolidate into single item matching totalAmount.
                    paymentItems = new List<PaymentItemRequest>
                    {
                        new PaymentItemRequest($"Đơn hàng #{orderCode} (Voucher {validVoucherCode})", 1, totalAmount)
                    };
                }

                var order = new Order
                {
                    Id = orderId,
                    OrderCode = orderCode,
                    UserId = request.UserId,
                    CustomerName = request.CustomerName,
                    CustomerEmail = request.CustomerEmail,
                    CustomerPhone = request.CustomerPhone,
                    ShippingAddress = request.ShippingAddress ?? "Giao hàng tận nơi",
                    SubTotal = subTotal,
                    DiscountAmount = discountAmount,
                    VoucherCode = validVoucherCode,
                    TotalAmount = totalAmount,
                    Status = OrderStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = expiresAt,
                    Items = orderItems
                };

                var history = new OrderStatusHistory
                {
                    Id = Guid.NewGuid(),
                    OrderId = orderId,
                    Status = OrderStatus.Pending,
                    Note = "Khởi tạo đơn hàng - Giữ chỗ kho 15 phút - Chờ thanh toán PayOS",
                    Timestamp = DateTime.UtcNow
                };

                await _context.Orders.AddAsync(order, cancellationToken);
                await _context.OrderStatusHistories.AddAsync(history, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                // 3. Create PayOS Payment Link
                var returnUrl = $"{_frontendBaseUrl}/payment-success?orderCode={orderCode}";
                var cancelUrl = $"{_frontendBaseUrl}/cart?orderCode={orderCode}";
                var description = $"DH {orderCode}";

                var payOsResponse = await _payOSService.CreatePaymentLinkAsync(new CreatePaymentLinkRequest(
                    orderCode,
                    totalAmount,
                    description,
                    returnUrl,
                    cancelUrl,
                    paymentItems), cancellationToken);

                if (!payOsResponse.Success || string.IsNullOrEmpty(payOsResponse.CheckoutUrl))
                {
                    // Không tạo được link thanh toán -> hoàn tác đơn hàng và giữ chỗ kho, tránh đơn "ma" không có link
                    await transaction.RollbackAsync(cancellationToken);
                    _logger.LogWarning("PayOS không tạo được link thanh toán cho đơn #{OrderCode}: {Reason}", orderCode, payOsResponse.Message);
                    return ApiResponse<CheckoutResultDto>.Fail("Không thể tạo link thanh toán PayOS: " + (payOsResponse.Message ?? "lỗi không xác định"));
                }

                order.PayOSCheckoutUrl = payOsResponse.CheckoutUrl;
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                // 4. Send SignalR real-time notification
                var notif = new
                {
                    Title = "Đơn hàng mới #" + orderCode,
                    Message = $"Đơn hàng #{orderCode} đã được tạo thành công với số tiền {totalAmount:N0}đ.",
                    Type = "Order",
                    CreatedAt = DateTime.UtcNow
                };
                // Chỉ gửi thông báo cá nhân cho chủ đơn (khách vãng lai theo dõi qua màn hình thanh toán)
                if (request.UserId.HasValue)
                {
                    await _hubContext.Clients.Group(NotificationGroups.ForUser(request.UserId.Value)).ReceiveNotification(notif);
                }
                await _hubContext.Clients.All.ReceiveOrderStatusUpdate(orderCode, "Pending", "Đơn hàng đang chờ thanh toán");

                _logger.LogInformation("Order #{OrderCode} created with 15-minute stock reservation. PayOS URL: {Url}", orderCode, payOsResponse.CheckoutUrl);

                return ApiResponse<CheckoutResultDto>.Ok(new CheckoutResultDto(
                    orderId,
                    orderCode,
                    subTotal,
                    discountAmount,
                    totalAmount,
                    payOsResponse.CheckoutUrl,
                    payOsResponse.QrCode,
                    payOsResponse.AccountNumber,
                    payOsResponse.AccountName,
                    payOsResponse.Bin,
                    payOsResponse.Description,
                    expiresAt), "Tạo đơn hàng và link thanh toán PayOS thành công.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Lỗi trong quá trình tạo đơn hàng #{OrderCode}: {Message}", orderCode, ex.Message);
                return ApiResponse<CheckoutResultDto>.Fail("Không thể khởi tạo đơn hàng: " + ex.Message);
            }
        });
    }
}
