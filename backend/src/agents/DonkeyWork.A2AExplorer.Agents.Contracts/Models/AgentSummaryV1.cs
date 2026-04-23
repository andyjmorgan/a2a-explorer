// <copyright file="AgentSummaryV1.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Text.Json.Serialization;

namespace DonkeyWork.A2AExplorer.Agents.Contracts.Models;

/// <summary>Listing view of a saved agent — no secret material on the wire.</summary>
public sealed class AgentSummaryV1
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

    /// <summary>Gets a value indicating whether an encrypted auth-header value is stored for this agent.</summary>
    [JsonPropertyName("hasAuthHeaderValue")]
    public required bool HasAuthHeaderValue { get; init; }

    /// <summary>Gets the UTC timestamp when this agent was last successfully used via the proxy.</summary>
    [JsonPropertyName("lastUsedAt")]
    public DateTimeOffset? LastUsedAt { get; init; }

    /// <summary>Gets the UTC timestamp when the agent was first saved.</summary>
    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }
}
