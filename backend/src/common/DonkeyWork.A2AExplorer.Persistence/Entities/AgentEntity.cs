// <copyright file="AgentEntity.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Agents.Contracts.Models;

namespace DonkeyWork.A2AExplorer.Persistence.Entities;

/// <summary>
/// Persisted saved A2A agent owned by a single user. <see cref="AuthHeaderValueEncrypted"/> is populated
/// and read exclusively via pgcrypto in SQL; the CLR never sees the plaintext except when
/// <c>AgentService.ResolveAuthHeaderAsync</c> decrypts it for an outbound proxy forward.
/// </summary>
public sealed class AgentEntity : BaseEntity
{
    /// <summary>Gets or sets the user-visible name for this agent.</summary>
    public required string Name { get; set; }

    /// <summary>Gets or sets the agent's base URL.</summary>
    public required string BaseUrl { get; set; }

    /// <summary>Gets or sets the authentication mode.</summary>
    public AgentAuthMode AuthMode { get; set; } = AgentAuthMode.None;

    /// <summary>Gets or sets the HTTP header name to attach when <see cref="AuthMode"/> is Header.</summary>
    public string? AuthHeaderName { get; set; }

    /// <summary>Gets or sets the pgp_sym_encrypt ciphertext for the auth header value.</summary>
    public byte[]? AuthHeaderValueEncrypted { get; set; }

    /// <summary>Gets or sets the UTC timestamp when this agent was last successfully used via the proxy.</summary>
    public DateTimeOffset? LastUsedAt { get; set; }
}
