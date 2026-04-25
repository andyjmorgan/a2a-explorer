// <copyright file="A2AOutboundFactory.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using A2A;
using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Core.Internal;

namespace DonkeyWork.A2AExplorer.Agents.Core;

/// <summary>
/// Default <see cref="IA2AOutboundFactory"/>. Resolves the saved agent's base URL + decrypted auth
/// header, obtains a named <see cref="HttpClient"/> with an <see cref="SsrfValidatingHandler"/> in
/// its pipeline, and hands the A2A SDK's <see cref="A2ACardResolver"/> + <see cref="A2AClientFactory"/>
/// the fully-configured client.
/// </summary>
public sealed class A2AOutboundFactory : IA2AOutboundFactory
{
    /// <summary>The logical name of the outbound HttpClient registered in DI.</summary>
    public const string HttpClientName = "a2a-outbound";

    private readonly IAgentService agentService;
    private readonly IHttpClientFactory httpClientFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="A2AOutboundFactory"/> class.
    /// </summary>
    /// <param name="agentService">Saved-agent lookups + auth header decryption.</param>
    /// <param name="httpClientFactory">Source of the SSRF-guarded outbound HttpClient.</param>
    public A2AOutboundFactory(IAgentService agentService, IHttpClientFactory httpClientFactory)
    {
        this.agentService = agentService;
        this.httpClientFactory = httpClientFactory;
    }

    /// <inheritdoc />
    public async Task<AgentCard?> FetchCardForSavedAgentAsync(Guid agentId, CancellationToken cancellationToken = default)
    {
        var agent = await this.agentService.GetByIdAsync(agentId, cancellationToken).ConfigureAwait(false);
        if (agent is null)
        {
            return null;
        }

        var auth = await this.agentService.ResolveAuthHeaderAsync(agentId, cancellationToken).ConfigureAwait(false);
        return await this.FetchCardForUrlAsync(new Uri(agent.BaseUrl), auth, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<AgentCard> FetchCardForUrlAsync(Uri baseUrl, OutboundAuthHeader? auth, CancellationToken cancellationToken = default)
    {
        var http = this.CreateHttpClient(auth);
        var resolver = new A2ACardResolver(baseUrl, http);
        return await resolver.GetAgentCardAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<IA2AClient?> CreateClientForSavedAgentAsync(Guid agentId, CancellationToken cancellationToken = default)
    {
        var agent = await this.agentService.GetByIdAsync(agentId, cancellationToken).ConfigureAwait(false);
        if (agent is null)
        {
            return null;
        }

        var auth = await this.agentService.ResolveAuthHeaderAsync(agentId, cancellationToken).ConfigureAwait(false);
        var http = this.CreateHttpClient(auth);
        var baseUrl = new Uri(agent.BaseUrl);

        var resolver = new A2ACardResolver(baseUrl, http);
        var card = await resolver.GetAgentCardAsync(cancellationToken).ConfigureAwait(false);

        return A2AClientFactory.Create(card, http, new A2AClientOptions());
    }

    private HttpClient CreateHttpClient(OutboundAuthHeader? auth)
    {
        var http = this.httpClientFactory.CreateClient(HttpClientName);
        if (auth is not null && !string.IsNullOrEmpty(auth.Name) && !string.IsNullOrEmpty(auth.Value))
        {
            http.DefaultRequestHeaders.TryAddWithoutValidation(auth.Name, auth.Value);
        }

        return http;
    }
}
