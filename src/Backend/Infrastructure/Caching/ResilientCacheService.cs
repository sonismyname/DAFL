using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;

namespace DAFL.Backend.Infrastructure.Caching;

public class ResilientCacheService : ICacheService
{
    private readonly bool _enabled;
    private readonly ILogger<ResilientCacheService> _logger;
    private readonly IConnectionMultiplexer? _redis;
    private readonly IMemoryCache _memoryCache;
    private readonly TimeSpan _defaultExpiration = TimeSpan.FromMinutes(30);

    public bool IsEnabled => _enabled;

    public ResilientCacheService(
        IConfiguration configuration,
        IMemoryCache memoryCache,
        ILogger<ResilientCacheService> logger,
        IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _memoryCache = memoryCache;
        _redis = redis;

        var enabledStr = configuration["CacheSettings:Enabled"];
        _enabled = bool.TryParse(enabledStr, out var isEnabled) && isEnabled;

        if (!_enabled)
        {
            _logger.LogInformation("Redis Caching is explicitly DISABLED via configuration. Operating in bypass/fallback mode.");
        }
        else
        {
            _logger.LogInformation("Redis Caching is ENABLED via configuration.");
        }
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return default;

        try
        {
            if (_redis != null && _redis.IsConnected)
            {
                var db = _redis.GetDatabase();
                var redisValue = await db.StringGetAsync(key);
                if (redisValue.HasValue)
                {
                    return JsonSerializer.Deserialize<T>(redisValue.ToString()!);
                }
            }
            else
            {
                if (_memoryCache.TryGetValue(key, out T? memVal))
                {
                    return memVal;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Cache read error for key '{Key}'. Gracefully falling back. Details: {Message}", key, ex.Message);
        }

        return default;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return;

        var exp = expiration ?? _defaultExpiration;
        try
        {
            if (_redis != null && _redis.IsConnected)
            {
                var db = _redis.GetDatabase();
                var json = JsonSerializer.Serialize(value);
                await db.StringSetAsync(key, json, exp);
            }
            else
            {
                _memoryCache.Set(key, value, exp);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Cache write error for key '{Key}'. Gracefully continuing. Details: {Message}", key, ex.Message);
            _memoryCache.Set(key, value, exp);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return;

        try
        {
            if (_redis != null && _redis.IsConnected)
            {
                var db = _redis.GetDatabase();
                await db.KeyDeleteAsync(key);
            }
            _memoryCache.Remove(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Cache remove error for key '{Key}'. Details: {Message}", key, ex.Message);
            _memoryCache.Remove(key);
        }
    }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        if (!_enabled)
        {
            return await factory();
        }

        var cached = await GetAsync<T>(key, cancellationToken);
        if (cached != null)
        {
            return cached;
        }

        var freshData = await factory();
        if (freshData != null)
        {
            await SetAsync(key, freshData, expiration, cancellationToken);
        }

        return freshData;
    }
}
