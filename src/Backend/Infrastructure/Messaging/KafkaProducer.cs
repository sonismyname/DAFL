using System.Text.Json;
using Confluent.Kafka;

namespace DAFL.Backend.Infrastructure.Messaging;

public class KafkaProducer : IKafkaProducer, IDisposable
{
    private readonly IProducer<string, string>? _producer;
    private readonly ILogger<KafkaProducer> _logger;
    private readonly bool _enabled;

    public KafkaProducer(IConfiguration configuration, ILogger<KafkaProducer> logger)
    {
        _logger = logger;
        var bootstrapServers = configuration["KafkaSettings:BootstrapServers"] ?? "kafka:9092";

        try
        {
            var config = new ProducerConfig
            {
                BootstrapServers = bootstrapServers,
                Acks = Acks.Leader,
                MessageTimeoutMs = 3000,
                RequestTimeoutMs = 2000
            };

            _producer = new ProducerBuilder<string, string>(config).Build();
            _enabled = true;
            _logger.LogInformation("KafkaProducer initialized with bootstrap servers: {Servers}", bootstrapServers);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to initialize KafkaProducer. Messaging will operate in fallback mode. Error: {Message}", ex.Message);
            _enabled = false;
        }
    }

    public async Task PublishAsync<T>(string topic, string key, T message, CancellationToken cancellationToken = default)
    {
        if (!_enabled || _producer == null)
        {
            _logger.LogWarning("[Kafka Fallback] Producer disabled or unavailable. Simulating event publish to topic '{Topic}' with key '{Key}'", topic, key);
            return;
        }

        try
        {
            var payload = JsonSerializer.Serialize(message);
            var result = await _producer.ProduceAsync(topic, new Message<string, string>
            {
                Key = key,
                Value = payload
            }, cancellationToken);

            _logger.LogInformation("Published Kafka event to topic '{Topic}', partition {Partition}, offset {Offset}", topic, result.Partition, result.Offset);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish Kafka event to topic '{Topic}'. Error: {Message}", topic, ex.Message);
        }
    }

    public void Dispose()
    {
        _producer?.Flush(TimeSpan.FromSeconds(2));
        _producer?.Dispose();
    }
}
