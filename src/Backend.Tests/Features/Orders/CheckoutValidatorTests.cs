using DAFL.Backend.Features.Orders.Checkout;
using FluentAssertions;
using FluentValidation.TestHelper;

namespace DAFL.Backend.Tests.Features.Orders;

/// <summary>
/// Unit tests cho CheckoutCommandValidator.
/// Kiểm tra FluentValidation rules cho lệnh checkout.
/// </summary>
public class CheckoutValidatorTests
{
    private readonly CheckoutCommandValidator _validator;

    public CheckoutValidatorTests()
    {
        _validator = new CheckoutCommandValidator();
    }

    /// <summary>
    /// TC-CHKV-01: Checkout với đầy đủ thông tin hợp lệ → Không có lỗi validation.
    /// </summary>
    [Fact]
    public async Task Validate_WithValidCommand_ShouldHaveNoErrors()
    {
        // Arrange
        var command = new CheckoutCommand(
            "Nguyen Van A",
            "test@dafl.vn",
            "0901234567",
            "123 Test Street",
            null,
            Guid.NewGuid(),
            new List<CheckoutItemDto> { new(Guid.NewGuid(), 1) });

        // Act
        var result = await _validator.TestValidateAsync(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    /// <summary>
    /// TC-CHKV-02: Checkout với tên khách hàng trống → Lỗi validation.
    /// </summary>
    [Fact]
    public async Task Validate_WithEmptyCustomerName_ShouldHaveError()
    {
        // Arrange
        var command = new CheckoutCommand(
            "",
            "test@dafl.vn",
            "0901234567",
            "Address",
            null,
            null,
            new List<CheckoutItemDto> { new(Guid.NewGuid(), 1) });

        // Act
        var result = await _validator.TestValidateAsync(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.CustomerName);
    }

    /// <summary>
    /// TC-CHKV-03: Checkout với email không hợp lệ → Lỗi validation.
    /// </summary>
    [Fact]
    public async Task Validate_WithInvalidEmail_ShouldHaveError()
    {
        // Arrange
        var command = new CheckoutCommand(
            "Nguyen Van A",
            "not-an-email",
            "0901234567",
            "Address",
            null,
            null,
            new List<CheckoutItemDto> { new(Guid.NewGuid(), 1) });

        // Act
        var result = await _validator.TestValidateAsync(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.CustomerEmail);
    }

    /// <summary>
    /// TC-CHKV-04: Checkout với số điện thoại trống → Lỗi validation.
    /// </summary>
    [Fact]
    public async Task Validate_WithEmptyPhone_ShouldHaveError()
    {
        // Arrange
        var command = new CheckoutCommand(
            "Nguyen Van A",
            "test@dafl.vn",
            "",
            "Address",
            null,
            null,
            new List<CheckoutItemDto> { new(Guid.NewGuid(), 1) });

        // Act
        var result = await _validator.TestValidateAsync(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.CustomerPhone);
    }

    /// <summary>
    /// TC-CHKV-05: Checkout với giỏ hàng rỗng → Lỗi validation.
    /// </summary>
    [Fact]
    public async Task Validate_WithEmptyItems_ShouldHaveError()
    {
        // Arrange
        var command = new CheckoutCommand(
            "Nguyen Van A",
            "test@dafl.vn",
            "0901234567",
            "Address",
            null,
            null,
            new List<CheckoutItemDto>());

        // Act
        var result = await _validator.TestValidateAsync(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Items);
    }

    /// <summary>
    /// TC-CHKV-06: Checkout với số lượng sản phẩm = 0 → Lỗi validation.
    /// </summary>
    [Fact]
    public async Task Validate_WithZeroQuantityItem_ShouldHaveError()
    {
        // Arrange
        var command = new CheckoutCommand(
            "Nguyen Van A",
            "test@dafl.vn",
            "0901234567",
            "Address",
            null,
            null,
            new List<CheckoutItemDto> { new(Guid.NewGuid(), 0) });

        // Act
        var result = await _validator.TestValidateAsync(command);

        // Assert
        result.ShouldHaveAnyValidationError();
    }
}
