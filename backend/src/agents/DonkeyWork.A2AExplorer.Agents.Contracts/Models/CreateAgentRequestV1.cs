// <copyright file="CreateAgentRequestV1.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace DonkeyWork.A2AExplorer.Agents.Contracts.Models;

/// <summary>Request body for creating a saved agent.</summary>
public sealed class CreateAgentRequestV1
{
    /// <summary>Gets the user-visible name for this agent.</summary>
    [Required]
    [StringLength(255, MinimumLength = 1)]
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>Gets the agent's base URL (the root the SPA will proxy its requests to).</summary>
    [Required]
    [Url]
    [StringLength(2048, MinimumLength = 1)]
    [JsonPropertyName("baseUrl")]
    public required string BaseUrl { get; init; }

    /// <summary>Gets the authentication mode this agent uses.</summary>
    [JsonPropertyName("authMode")]
    public AgentAuthMode AuthMode { get; init; } = AgentAuthMode.None;

    /// <summary>Gets the name of the HTTP header to attach when <see cref="AuthMode"/> is Header.</summary>
    [StringLength(128)]
    [JsonPropertyName("authHeaderName")]
    public string? AuthHeaderName { get; init; }

    /// <summary>Gets the plaintext value for the authentication header. Encrypted at rest, never returned.</summary>
    [StringLength(4096)]
    [JsonPropertyName("authHeaderValue")]
    public string? AuthHeaderValue { get; init; }

    /// <summary>Gets the named gradient shade chosen for the agent's icon.</summary>
    [StringLength(32)]
    [JsonPropertyName("iconShade")]
    public string? IconShade { get; init; }
}
