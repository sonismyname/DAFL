using DAFL.Backend.Common;
using FluentAssertions;

namespace DAFL.Backend.Tests.Common;

/// <summary>
/// Unit tests cho ApiResponse wrapper class.
/// Đảm bảo phương thức Ok() và Fail() hoạt động đúng.
/// </summary>
public class ApiResponseTests
{
    /// <summary>
    /// TC-API-01: ApiResponse.Ok() → Success = true, Data đúng, Message đúng.
    /// </summary>
    [Fact]
    public void Ok_ShouldReturnSuccessResponse()
    {
        // Act
        var result = ApiResponse<string>.Ok("test data", "Success message");

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("test data");
        result.Message.Should().Be("Success message");
        result.Errors.Should().BeNull();
    }

    /// <summary>
    /// TC-API-02: ApiResponse.Ok() không có message → Message = null.
    /// </summary>
    [Fact]
    public void Ok_WithoutMessage_ShouldHaveNullMessage()
    {
        // Act
        var result = ApiResponse<int>.Ok(42);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be(42);
        result.Message.Should().BeNull();
    }

    /// <summary>
    /// TC-API-03: ApiResponse.Fail() → Success = false, Message đúng.
    /// </summary>
    [Fact]
    public void Fail_ShouldReturnFailResponse()
    {
        // Act
        var result = ApiResponse<string>.Fail("Error occurred");

        // Assert
        result.Success.Should().BeFalse();
        result.Data.Should().BeNull();
        result.Message.Should().Be("Error occurred");
    }

    /// <summary>
    /// TC-API-04: ApiResponse.Fail() với danh sách lỗi → Errors chứa đúng danh sách.
    /// </summary>
    [Fact]
    public void Fail_WithErrors_ShouldReturnErrorList()
    {
        // Arrange
        var errors = new List<string> { "Error 1", "Error 2" };

        // Act
        var result = ApiResponse<string>.Fail("Validation failed", errors);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().NotBeNull();
        result.Errors!.Count.Should().Be(2);
        result.Errors.Should().Contain("Error 1");
    }
}
