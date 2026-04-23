// <copyright file="IAgentService.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Agents.Contracts.Models;

namespace DonkeyWork.A2AExplorer.Agents.Contracts;

/// <summary>
/// User-scoped CRUD surface for saved A2A agents. All reads and writes are implicitly scoped to the
/// current user via the DbContext query filter; writes additionally set UserId explicitly as
/// defense-in-depth.
/// </summary>
public interface IAgentService
{
    /// <summary>Persists a new agent owned by the current user.</summary>
    /// <param name="request">The create payload.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal from the caller.</param>
    /// <returns>The newly-created agent's detailed view.</returns>
    Task<AgentDetailsV1> CreateAsync(CreateAgentRequestV1 request, CancellationToken cancellationToken = default);

    /// <summary>Fetches a single agent by id, scoped to the current user.</summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal from the caller.</param>
    /// <returns>The detailed view, or null when the agent does not exist for the current user.</returns>
    Task<AgentDetailsV1?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Lists every agent owned by the current user in most-recently-used first order.</summary>
    /// <param name="cancellationToken">Propagates a cancellation signal from the caller.</param>
    /// <returns>The summary views.</returns>
    Task<IReadOnlyList<AgentSummaryV1>> ListAsync(CancellationToken cancellationToken = default);

    /// <summary>Updates the fields on a saved agent. Only provided (non-null) fields are applied.</summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="request">The update payload; null fields are ignored.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal from the caller.</param>
    /// <returns>The updated detailed view, or null when the agent does not exist for the current user.</returns>
    Task<AgentDetailsV1?> UpdateAsync(Guid id, UpdateAgentRequestV1 request, CancellationToken cancellationToken = default);

    /// <summary>Deletes a saved agent.</summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal from the caller.</param>
    /// <returns>True when the agent was deleted; false when not found for the current user.</returns>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolves the outbound auth header to attach when proxying a request to a saved agent.
    /// Decrypts server-side; the secret never leaves this process in plaintext except on the outbound
    /// HTTP call to the agent.
    /// </summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal from the caller.</param>
    /// <returns>
    /// The header name + decrypted value when the agent exists, is owned by the current user, and
    /// has an auth header configured; null otherwise.
    /// </returns>
    Task<OutboundAuthHeader?> ResolveAuthHeaderAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Touches the <c>LastUsedAt</c> field on a saved agent to the current UTC time.</summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal from the caller.</param>
    /// <returns>A task that completes when the update round-trip finishes.</returns>
    Task TouchLastUsedAsync(Guid id, CancellationToken cancellationToken = default);
}
