using DAFL.Backend.Infrastructure.Payments;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace DAFL.Backend.Tests.Features.Payments;

/// <summary>
/// Unit tests cho PayOSService: nhận diện chế độ demo (khóa demo_*, rỗng hoặc placeholder từ .env.example).
/// </summary>
public class PayOSServiceTests
{
    private static PayOSService CreateService(string clientId, string apiKey, string checksumKey)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PayOS:ClientId"] = clientId,
                ["PayOS:ApiKey"] = apiKey,
                ["PayOS:ChecksumKey"] = checksumKey
            })
            .Build();

        // HttpClient mặc định: nếu service vô tình gọi PayOS thật, test sẽ không ổn định → chỉ dùng cho nhánh demo.
        return new PayOSService(configuration, new HttpClient(), NullLogger<PayOSService>.Instance);
    }

    private static readonly CreatePaymentLinkRequest SampleRequest = new(
        2610225832, 1000m, "DH 2610225832", "http://localhost:3000/ok", "http://localhost:3000/cancel",
        new List<PaymentItemRequest> { new("Item", 1, 1000m) });

    private static PayOSWebhookPayload SamplePayload(string signature) => new(
        "00", "success",
        new PayOSWebhookData(2610225832, 1000m, "DH 2610225832", "9999888877", "REF123", null, null, null, "00", "success"),
        signature);

    /// <summary>
    /// TC-PAYOS-01: Khóa "demo_*" → tạo link giả lập, không gọi PayOS thật.
    /// </summary>
    [Theory]
    [InlineData("demo_client_id", "demo_api_key", "demo_checksum_key")]
    [InlineData("your_payos_client_id_here", "your_payos_api_key_here", "your_payos_checksum_key_here")]
    [InlineData("", "", "")]
    public async Task CreatePaymentLink_WithDemoOrPlaceholderCredentials_ReturnsMockLink(string clientId, string apiKey, string checksumKey)
    {
        var service = CreateService(clientId, apiKey, checksumKey);

        var response = await service.CreatePaymentLinkAsync(SampleRequest);

        response.Success.Should().BeTrue();
        response.CheckoutUrl.Should().Contain("/mock-payos?orderCode=2610225832");
    }

    /// <summary>
    /// TC-PAYOS-02: Placeholder trong .env.example được coi là demo → webhook chấp nhận (giống khóa demo_*).
    /// </summary>
    [Theory]
    [InlineData("demo_checksum_key")]
    [InlineData("your_payos_checksum_key_here")]
    public void VerifyWebhookSignature_WithDemoOrPlaceholderChecksum_AcceptsAnySignature(string checksumKey)
    {
        var service = CreateService("demo_client_id", "demo_api_key", checksumKey);

        service.VerifyWebhookSignature(SamplePayload("bat-ky")).Should().BeTrue();
    }

    /// <summary>
    /// TC-PAYOS-03: Khóa thật → chữ ký sai bị từ chối.
    /// </summary>
    [Fact]
    public void VerifyWebhookSignature_WithRealChecksum_RejectsInvalidSignature()
    {
        var service = CreateService("real-client", "real-api", "0123456789abcdef0123456789abcdef");

        service.VerifyWebhookSignature(SamplePayload("chu-ky-sai")).Should().BeFalse();
    }
}
