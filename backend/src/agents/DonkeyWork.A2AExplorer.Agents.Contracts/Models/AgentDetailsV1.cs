// <copyright file="AgentDetailsV1.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Text.Json.Serialization;

namespace DonkeyWork.A2AExplorer.Agents.Contracts.Models;

/// <summary>Detailed view of a saved agent — includes the header name but never the header value.</summary>
public sealed class AgentDetailsV1
{
    /// <summary>Gets the agent's identifier.</summary>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }

    /// <summary>Gets the agent's display name.</summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>Gets the agent's base URL.</summary>
    [JsonPropertyName("baseUrl")]
    public required string BaseUrl { get; init; }

    /// <summary>Gets the authentication mode.</summary>
    [JsonPropertyName("authMode")]
    public required AgentAuthMode AuthMode { get; init; }

    /// <summary>Gets the header name configured for this agent, if any.</summary>
    [JsonPropertyName("authHeaderName")]
    public string? AuthHeaderName { get; init; }

    /// <summary>Gets a value indicating whether an encrypted auth-header value is stored for this agent.</summary>
    [JsonPropertyName("hasAuthHeaderValue")]
    public required bool HasAuthHeaderValue { get; init; }

    /// <summary>Gets the UTC timestamp when this agent was last successfully used via the proxy.</summary>
    [JsonPropertyName("lastUsedAt")]
    public DateTimeOffset? LastUsedAt { get; init; }

    /// <summary>Gets the UTC timestamp when the agent was first saved.</summary>
    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>Gets the UTC timestamp of the most recent update, or null when never updated.</summary>
    [JsonPropertyName("updatedAt")]
    public DateTimeOffset? UpdatedAt { get; init; }
}
