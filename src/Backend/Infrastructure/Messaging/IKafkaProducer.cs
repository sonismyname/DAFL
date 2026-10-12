namespace DAFL.Backend.Infrastructure.Messaging;

public record OrderPaidEvent(long OrderCode, Guid OrderId, decimal Amount, string CustomerEmail, DateTime PaidAt);
public record NotificationEvent(string Type, string Recipient, string Title, string Body, DateTime CreatedAt);

public interface IKafkaProducer
{
    Task PublishAsync<T>(string topic, string key, T message, CancellationToken cancellationToken = default);
}
