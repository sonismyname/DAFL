using System.Text.Json;
using Confluent.Kafka;

namespace DAFL.Backend.Infrastructure.Messaging;

public class KafkaConsumerWorker : BackgroundService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<KafkaConsumerWorker> _logger;

    public KafkaConsumerWorker(IConfiguration configuration, ILogger<KafkaConsumerWorker> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var bootstrapServers = _configuration["KafkaSettings:BootstrapServers"] ?? "kafka:9092";
        _logger.LogInformation("KafkaConsumerWorker starting background listener on {Servers}", bootstrapServers);

        // Wait 5 seconds on startup for broker to be ready
        await Task.Delay(5000, stoppingToken);

        var config = new ConsumerConfig
        {
            BootstrapServers = bootstrapServers,
            GroupId = "dafl-notification-service-group",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = true,
            SessionTimeoutMs = 10000,
            MaxPollIntervalMs = 300000
        };

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var consumer = new ConsumerBuilder<string, string>(config).Build();
                consumer.Subscribe(new[] { "payment-events", "notification-events" });

                _logger.LogInformation("Kafka consumer successfully subscribed to 'payment-events' and 'notification-events'");

                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        var consumeResult = consumer.Consume(TimeSpan.FromSeconds(2));
                        if (consumeResult == null) continue;

                        var topic = consumeResult.Topic;
                        var message = consumeResult.Message.Value;

                        _logger.LogInformation("Received Kafka event from topic '{Topic}': {Message}", topic, message);

                        if (topic == "payment-events")
                        {
                            var orderEvent = JsonSerializer.Deserialize<OrderPaidEvent>(message);
                            if (orderEvent != null)
                            {
                                _logger.LogInformation(" [EMAIL SERVICE] Sending Order #{OrderCode} confirmation email to {Email}. Amount: {Amount:N0} VND",
                                    orderEvent.OrderCode, orderEvent.CustomerEmail, orderEvent.Amount);
                            }
                        }
                        else if (topic == "notification-events")
                        {
                            var notif = JsonSerializer.Deserialize<NotificationEvent>(message);
                            if (notif != null)
                            {
                                _logger.LogInformation(" [NOTIFICATION SERVICE] Dispatching {Type} notification to {Recipient}: {Title} - {Body}",
                                    notif.Type, notif.Recipient, notif.Title, notif.Body);
                            }
                        }
                    }
                    catch (ConsumeException ex)
                    {
                        _logger.LogWarning("Consume warning: {Reason}", ex.Error.Reason);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Kafka broker not ready or consumer error: {Message}. Retrying in 10s...", ex.Message);
                await Task.Delay(10000, stoppingToken);
            }
        }
    }
}
