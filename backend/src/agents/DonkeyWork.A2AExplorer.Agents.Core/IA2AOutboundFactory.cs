// <copyright file="IA2AOutboundFactory.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using A2A;
using DonkeyWork.A2AExplorer.Agents.Contracts;

namespace DonkeyWork.A2AExplorer.Agents.Core;

/// <summary>
/// Produces ready-to-use <see cref="IA2AClient"/> instances and <see cref="AgentCard"/> fetches for
/// the A2A SDK, wrapping our saved-agent + pgcrypto-encrypted-auth plumbing behind a clean surface.
/// All HTTP calls go through an SSRF-validating outbound <c>HttpClient</c>.
/// </summary>
public interface IA2AOutboundFactory
{
    /// <summary>
    /// Fetches the agent card for a saved agent owned by the current user. Attaches the stored
    /// (decrypted) auth header to the outbound request.
    /// </summary>
    /// <param name="agentId">The saved agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>The agent card; null when the saved agent is not found for the current user.</returns>
    Task<AgentCard?> FetchCardForSavedAgentAsync(Guid agentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches an agent card for an arbitrary base URL — used by the <c>test-connection</c> wizard
    /// endpoint. Applies SSRF validation; accepts a one-off auth header without persisting anything.
    /// </summary>
    /// <param name="baseUrl">Root URL of the target agent.</param>
    /// <param name="auth">Optional auth header to attach.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>The agent card.</returns>
    Task<AgentCard> FetchCardForUrlAsync(Uri baseUrl, OutboundAuthHeader? auth, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a configured <see cref="IA2AClient"/> for the saved agent (transport selected by
    /// <see cref="A2AClientFactory"/> based on the card's supported interfaces). Returns null when
    /// the agent is not owned by the current user.
    /// </summary>
    /// <param name="agentId">The saved agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>A ready-to-call A2A client, or null.</returns>
    Task<IA2AClient?> CreateClientForSavedAgentAsync(Guid agentId, CancellationToken cancellationToken = default);
}
