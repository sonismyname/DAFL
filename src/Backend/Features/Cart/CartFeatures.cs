using DAFL.Backend.Common;
using DAFL.Backend.Infrastructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Features.Cart;

public record CartItemDto(Guid Id, Guid ProductId, string ProductName, string ProductImageUrl, decimal UnitPrice, int Quantity, decimal SubTotal);

public record CartDto(Guid Id, decimal TotalAmount, int TotalQuantity, List<CartItemDto> Items);

// 1. Get Cart
public record GetCartQuery(Guid? UserId, string? SessionId) : IRequest<ApiResponse<CartDto>>;

public class GetCartQueryHandler : IRequestHandler<GetCartQuery, ApiResponse<CartDto>>
{
    private readonly AppDbContext _context;

    public GetCartQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<CartDto>> Handle(GetCartQuery request, CancellationToken cancellationToken)
    {
        var cart = await GetOrCreateCartAsync(request.UserId, request.SessionId, cancellationToken);

        var items = cart.Items.Select(ci => new CartItemDto(
            ci.Id,
            ci.ProductId,
            ci.Product?.Name ?? "Sản phẩm",
            ci.Product?.ImageUrl ?? "",
            ci.UnitPrice,
            ci.Quantity,
            ci.UnitPrice * ci.Quantity
        )).ToList();

        var totalAmount = items.Sum(i => i.SubTotal);
        var totalQuantity = items.Sum(i => i.Quantity);

        return ApiResponse<CartDto>.Ok(new CartDto(cart.Id, totalAmount, totalQuantity, items));
    }

    private async Task<DAFL.Backend.Infrastructure.Data.Cart> GetOrCreateCartAsync(Guid? userId, string? sessionId, CancellationToken ct)
    {
        DAFL.Backend.Infrastructure.Data.Cart? cart = null;

        if (userId.HasValue)
        {
            cart = await _context.Carts
                .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId.Value, ct);
        }
        else if (!string.IsNullOrEmpty(sessionId))
        {
            cart = await _context.Carts
                .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.SessionId == sessionId, ct);
        }

        if (cart == null)
        {
            cart = new DAFL.Backend.Infrastructure.Data.Cart
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                SessionId = sessionId ?? Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Carts.AddAsync(cart, ct);
            await _context.SaveChangesAsync(ct);
        }

        return cart;
    }
}

// 2. Add Item to Cart
public record AddToCartCommand(Guid? UserId, string? SessionId, Guid ProductId, int Quantity) : IRequest<ApiResponse<CartDto>>;

public class AddToCartCommandHandler : IRequestHandler<AddToCartCommand, ApiResponse<CartDto>>
{
    private readonly AppDbContext _context;
    private readonly IMediator _mediator;

    public AddToCartCommandHandler(AppDbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<ApiResponse<CartDto>> Handle(AddToCartCommand request, CancellationToken cancellationToken)
    {
        var product = await _context.Products.FindAsync(new object[] { request.ProductId }, cancellationToken);
        if (product == null) return ApiResponse<CartDto>.Fail("Không tìm thấy sản phẩm.");

        var available = product.Stock - product.ReservedStock;
        if (available < request.Quantity)
        {
            return ApiResponse<CartDto>.Fail($"Số lượng sản phẩm còn lại ({available}) không đủ.");
        }

        DAFL.Backend.Infrastructure.Data.Cart? cart = null;
        if (request.UserId.HasValue)
        {
            cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == request.UserId.Value, cancellationToken);
        }
        else if (!string.IsNullOrEmpty(request.SessionId))
        {
            cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.SessionId == request.SessionId, cancellationToken);
        }

        if (cart == null)
        {
            cart = new DAFL.Backend.Infrastructure.Data.Cart
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                SessionId = request.SessionId ?? Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Carts.AddAsync(cart, cancellationToken);
        }

        var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == product.Id);
        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
        }
        else
        {
            cart.Items.Add(new CartItem
            {
                Id = Guid.NewGuid(),
                CartId = cart.Id,
                ProductId = product.Id,
                UnitPrice = product.Price,
                Quantity = request.Quantity,
                AddedAt = DateTime.UtcNow
            });
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return await _mediator.Send(new GetCartQuery(request.UserId, request.SessionId), cancellationToken);
    }
}

// 3. Update Cart Item Quantity
public record UpdateCartItemCommand(Guid ItemId, int Quantity) : IRequest<ApiResponse<bool>>;

public class UpdateCartItemCommandHandler : IRequestHandler<UpdateCartItemCommand, ApiResponse<bool>>
{
    private readonly AppDbContext _context;

    public UpdateCartItemCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(UpdateCartItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _context.CartItems.FindAsync(new object[] { request.ItemId }, cancellationToken);
        if (item == null) return ApiResponse<bool>.Fail("Không tìm thấy sản phẩm trong giỏ hàng.");

        if (request.Quantity <= 0)
        {
            _context.CartItems.Remove(item);
        }
        else
        {
            item.Quantity = request.Quantity;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return ApiResponse<bool>.Ok(true, "Cập nhật giỏ hàng thành công.");
    }
}

// 4. Remove Item from Cart
public record RemoveCartItemCommand(Guid ItemId) : IRequest<ApiResponse<bool>>;

public class RemoveCartItemCommandHandler : IRequestHandler<RemoveCartItemCommand, ApiResponse<bool>>
{
    private readonly AppDbContext _context;

    public RemoveCartItemCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<bool>> Handle(RemoveCartItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _context.CartItems.FindAsync(new object[] { request.ItemId }, cancellationToken);
        if (item != null)
        {
            _context.CartItems.Remove(item);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return ApiResponse<bool>.Ok(true, "Đã xóa sản phẩm khỏi giỏ hàng.");
    }
}
