using DAFL.Backend.Infrastructure.Caching;
using MediatR;

namespace DAFL.Backend.Common.Behaviors;

public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;

    public CachingBehavior(ICacheService cacheService, ILogger<CachingBehavior<TRequest, TResponse>> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request is not ICacheableQuery cacheableQuery || !_cacheService.IsEnabled)
        {
            return await next();
        }

        var cacheKey = cacheableQuery.CacheKey;
        var cached = await _cacheService.GetAsync<TResponse>(cacheKey, cancellationToken);
        if (cached != null)
        {
            _logger.LogDebug("Cache HIT for key '{CacheKey}'", cacheKey);
            return cached;
        }

        _logger.LogDebug("Cache MISS for key '{CacheKey}'. Calling handler.", cacheKey);
        var response = await next();

        if (response != null)
        {
            await _cacheService.SetAsync(cacheKey, response, cacheableQuery.Expiration, cancellationToken);
        }

        return response;
    }
}
