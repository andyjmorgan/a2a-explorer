// <copyright file="SsrfValidatingHandler.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Agents.Core.Internal;

/// <summary>
/// <see cref="DelegatingHandler"/> that runs <see cref="SsrfValidator"/> on every outbound request
/// URI. Attached to the named <c>a2a-outbound</c> <c>HttpClient</c> so the A2A SDK's own calls are
/// guarded without duplicating the check at each call site.
/// </summary>
public sealed class SsrfValidatingHandler : DelegatingHandler
{
    /// <inheritdoc />
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        if (request.RequestUri is not null)
        {
            var result = SsrfValidator.Validate(request.RequestUri);
            if (result is not SsrfResult.Ok)
            {
                throw new SsrfRejectedException(request.RequestUri, result);
            }
        }

        return base.SendAsync(request, cancellationToken);
    }
}
