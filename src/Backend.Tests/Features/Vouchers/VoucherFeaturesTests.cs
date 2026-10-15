using DAFL.Backend.Common;
using DAFL.Backend.Features.Vouchers;
using DAFL.Backend.Infrastructure.Data;
using DAFL.Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Tests.Features.Vouchers;

/// <summary>
/// Unit tests cho module Voucher (Mã giảm giá).
/// Bao gồm: Lấy danh sách voucher, Áp dụng voucher (Percentage, Fixed, FORDEV, hết hạn, không đủ tối thiểu).
/// </summary>
public class VoucherFeaturesTests : IDisposable
{
    private readonly AppDbContext _context;

    public VoucherFeaturesTests()
    {
        _context = TestDbContextFactory.CreateWithSeedData();
    }

    public void Dispose() => _context.Dispose();

    #region GetVouchers Tests

    /// <summary>
    /// TC-VOUC-01: Lấy danh sách voucher còn hiệu lực → Trả về danh sách hợp lệ.
    /// </summary>
    [Fact]
    public async Task GetVouchers_ShouldReturnActiveVouchers()
    {
        // Arrange
        var handler = new GetVouchersQueryHandler(_context);
        var query = new GetVouchersQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Count.Should().BeGreaterOrEqualTo(2);
    }

    /// <summary>
    /// TC-VOUC-02: Voucher hết hạn không nằm trong danh sách trả về.
    /// </summary>
    [Fact]
    public async Task GetVouchers_ShouldNotReturnExpiredVouchers()
    {
        // Arrange
        var handler = new GetVouchersQueryHandler(_context);
        var query = new GetVouchersQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Data!.Should().NotContain(v => v.Code == "EXPIRED50");
    }

    #endregion

    #region ApplyVoucher Tests - Positive

    /// <summary>
    /// TC-VOUC-03: Áp dụng voucher Percentage (DAFL10 = 10%) → Giảm đúng 10%, giới hạn max 500k.
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_PercentageType_ShouldCalculateCorrectDiscount()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("DAFL10", 1000000m); // 1 triệu

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.DiscountAmount.Should().Be(100000m); // 10% of 1M = 100k
        result.Data.FinalTotal.Should().Be(900000m);
    }

    /// <summary>
    /// TC-VOUC-04: Áp dụng voucher Percentage với đơn lớn → Giảm tối đa bằng MaxDiscountAmount.
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_PercentageType_ShouldCapAtMaxDiscount()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("DAFL10", 10000000m); // 10 triệu → 10% = 1M, nhưng max = 500k

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.DiscountAmount.Should().Be(500000m); // Capped at 500k
        result.Data.FinalTotal.Should().Be(9500000m);
    }

    /// <summary>
    /// TC-VOUC-05: Áp dụng voucher Fixed (FREESHIP = 30k) → Giảm đúng 30k.
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_FixedType_ShouldApplyFixedDiscount()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("FREESHIP", 500000m);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.DiscountAmount.Should().Be(30000m);
        result.Data.FinalTotal.Should().Be(470000m);
    }

    /// <summary>
    /// TC-VOUC-06: Áp dụng voucher FORDEV → Giảm còn đúng 2000đ.
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_ForDev_ShouldReduceTo2000()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("FORDEV", 1000000m);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.FinalTotal.Should().Be(2000m);
        result.Data.DiscountAmount.Should().Be(998000m); // 1M - 2000
        result.Data.Message.Should().Contain("FORDEV");
    }

    /// <summary>
    /// TC-VOUC-07: Áp dụng voucher với mã viết thường → Vẫn áp dụng thành công (case insensitive).
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_LowercaseCode_ShouldStillWork()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("dafl10", 1000000m);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
    }

    #endregion

    #region ApplyVoucher Tests - Negative

    /// <summary>
    /// TC-VOUC-08: Áp dụng mã giảm giá không tồn tại → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_NonExistentCode_ShouldReturnFail()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("INVALID_CODE", 1000000m);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("không tồn tại");
    }

    /// <summary>
    /// TC-VOUC-09: Áp dụng voucher đã hết hạn → Trả về lỗi hết hạn.
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_ExpiredCode_ShouldReturnFail()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("EXPIRED50", 1000000m);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        // Voucher hết hạn nhưng vẫn active → sẽ tìm thấy nhưng kiểm tra ngày
        result.Message.Should().Contain("hết hạn");
    }

    /// <summary>
    /// TC-VOUC-10: Áp dụng voucher nhưng đơn hàng chưa đạt mức tối thiểu → Trả về lỗi.
    /// </summary>
    [Fact]
    public async Task ApplyVoucher_BelowMinOrderAmount_ShouldReturnFail()
    {
        // Arrange
        var handler = new ApplyVoucherCommandHandler(_context);
        var command = new ApplyVoucherCommand("DAFL10", 50000m); // Min là 100k

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("tối thiểu");
    }

    #endregion
}
