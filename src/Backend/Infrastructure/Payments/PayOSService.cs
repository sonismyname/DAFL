using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DAFL.Backend.Infrastructure.Payments;

public record CreatePaymentLinkRequest(
    long OrderCode,
    decimal Amount,
    string Description,
    string ReturnUrl,
    string CancelUrl,
    List<PaymentItemRequest> Items);

public record PaymentItemRequest(string Name, int Quantity, decimal Price);

public record CreatePaymentLinkResponse(
    bool Success,
    string? CheckoutUrl,
    string? QrCode,
    string? AccountNumber,
    string? AccountName,
    int? Bin,
    string? Description,
    string? Message);

public record PayOSWebhookPayload(
    string Code,
    string Desc,
    PayOSWebhookData Data,
    string Signature);

public record PayOSWebhookData(
    long OrderCode,
    decimal Amount,
    string Description,
    string? AccountNumber,
    string? Reference,
    string? TransactionDateTime,
    string? Currency,
    string? PaymentLinkId,
    string Code,
    string Desc);

public interface IPayOSService
{
    Task<CreatePaymentLinkResponse> CreatePaymentLinkAsync(CreatePaymentLinkRequest request, CancellationToken cancellationToken = default);
    Task<string?> GetPaymentStatusFromPayOSAsync(long orderCode, CancellationToken cancellationToken = default);
    bool VerifyWebhookSignature(PayOSWebhookPayload payload);
}

public class PayOSService : IPayOSService
{
    private readonly string _clientId;
    private readonly string _apiKey;
    private readonly string _checksumKey;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PayOSService> _logger;

    public PayOSService(IConfiguration configuration, HttpClient httpClient, ILogger<PayOSService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _clientId = configuration["PayOS:ClientId"] ?? "demo_client_id";
        _apiKey = configuration["PayOS:ApiKey"] ?? "demo_api_key";
        _checksumKey = configuration["PayOS:ChecksumKey"] ?? "demo_checksum_key";
    }

    public async Task<CreatePaymentLinkResponse> CreatePaymentLinkAsync(CreatePaymentLinkRequest request, CancellationToken cancellationToken = default)
    {
        var amountInt = (int)request.Amount;
        // Signature string: sorted keys amount, cancelUrl, description, orderCode, returnUrl
        var rawData = $"amount={amountInt}&cancelUrl={request.CancelUrl}&description={request.Description}&orderCode={request.OrderCode}&returnUrl={request.ReturnUrl}";
        var signature = ComputeHmacSha256(rawData, _checksumKey);

        var payload = new
        {
            orderCode = request.OrderCode,
            amount = amountInt,
            description = request.Description,
            cancelUrl = request.CancelUrl,
            returnUrl = request.ReturnUrl,
            items = request.Items.Select(i => new { name = i.Name, quantity = i.Quantity, price = (int)i.Price }).ToList(),
            signature = signature
        };

        // If credentials are demo/placeholder, return a clean simulated checkout link for testing
        if (_clientId == "demo_client_id" || _apiKey == "demo_api_key")
        {
            _logger.LogInformation("[PayOS Demo Mode] Generated mock payment link for Order #{OrderCode}. Amount: {Amount}", request.OrderCode, amountInt);
            var mockUrl = $"http://localhost:3000/mock-payos?orderCode={request.OrderCode}&amount={amountInt}";
            return new CreatePaymentLinkResponse(true, mockUrl, "data:image/svg+xml;base64,mock_qr", "0987654321", "DAFL STORE", 970422, request.Description, "Demo payment link created");
        }

        try
        {
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api-merchant.payos.vn/v2/payment-requests")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            httpRequest.Headers.Add("x-client-id", _clientId);
            httpRequest.Headers.Add("x-api-key", _apiKey);

            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(responseString);
            var root = doc.RootElement;
            var code = root.GetProperty("code").GetString();

            if (code == "00" && root.TryGetProperty("data", out var dataElem))
            {
                var checkoutUrl = dataElem.GetProperty("checkoutUrl").GetString();
                var qrCode = dataElem.TryGetProperty("qrCode", out var qr) ? qr.GetString() : null;
                var accountNumber = dataElem.TryGetProperty("accountNumber", out var acc) ? acc.GetString() : null;
                var accountName = dataElem.TryGetProperty("accountName", out var accName) ? accName.GetString() : null;
                var bin = dataElem.TryGetProperty("bin", out var binElem)
                    ? (binElem.ValueKind == JsonValueKind.Number ? binElem.GetInt32() : (int.TryParse(binElem.GetString(), out var bVal) ? bVal : (int?)null))
                    : null;
                var description = dataElem.TryGetProperty("description", out var descElem) ? descElem.GetString() : null;

                return new CreatePaymentLinkResponse(true, checkoutUrl, qrCode, accountNumber, accountName, bin, description, "Success");
            }

            var desc = root.TryGetProperty("desc", out var d) ? d.GetString() : "PayOS request failed";
            _logger.LogWarning("PayOS returned error code {Code}: {Desc}", code, desc);
            return new CreatePaymentLinkResponse(false, null, null, null, null, null, null, desc);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call PayOS API: {Message}", ex.Message);
            return new CreatePaymentLinkResponse(false, null, null, null, null, null, null, ex.Message);
        }
    }

    public async Task<string?> GetPaymentStatusFromPayOSAsync(long orderCode, CancellationToken cancellationToken = default)
    {
        if (_clientId == "demo_client_id" || _apiKey == "demo_api_key") return null;

        try
        {
            var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"https://api-merchant.payos.vn/v2/payment-requests/{orderCode}");
            httpRequest.Headers.Add("x-client-id", _clientId);
            httpRequest.Headers.Add("x-api-key", _apiKey);

            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            var responseString = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(responseString);
            var root = doc.RootElement;
            if (root.GetProperty("code").GetString() == "00" && root.TryGetProperty("data", out var dataElem))
            {
                if (dataElem.TryGetProperty("status", out var statusProp))
                {
                    return statusProp.GetString();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query PayOS status for #{OrderCode}: {Message}", orderCode, ex.Message);
        }

        return null;
    }

    public bool VerifyWebhookSignature(PayOSWebhookPayload payload)
    {
        if (_checksumKey == "demo_checksum_key")
        {
            // In demo mode, accept all requests with signature
            return true;
        }

        try
        {
            var d = payload.Data;
            // PayOS data sorted keys string
            var dataString = $"amount={(int)d.Amount}&description={d.Description}&orderCode={d.OrderCode}&reference={d.Reference}";
            var expectedSignature = ComputeHmacSha256(dataString, _checksumKey);
            return string.Equals(expectedSignature, payload.Signature, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Webhook signature verification failed with error: {Message}", ex.Message);
            return false;
        }
    }

    private static string ComputeHmacSha256(string data, string key)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(dataBytes);
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }
}
