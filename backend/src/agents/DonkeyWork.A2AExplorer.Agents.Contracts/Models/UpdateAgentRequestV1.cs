// <copyright file="UpdateAgentRequestV1.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace DonkeyWork.A2AExplorer.Agents.Contracts.Models;

/// <summary>Request body for updating a saved agent. All fields are optional.</summary>
public sealed class UpdateAgentRequestV1
{
    /// <summary>Gets the new name for the agent, or null to leave unchanged.</summary>
    [StringLength(255, MinimumLength = 1)]
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    /// <summary>Gets the new base URL, or null to leave unchanged.</summary>
    [Url]
    [StringLength(2048, MinimumLength = 1)]
    [JsonPropertyName("baseUrl")]
    public string? BaseUrl { get; init; }

    /// <summary>Gets the new authentication mode, or null to leave unchanged.</summary>
    [JsonPropertyName("authMode")]
    public AgentAuthMode? AuthMode { get; init; }

    /// <summary>Gets the new header name, or null to leave unchanged.</summary>
    [StringLength(128)]
    [JsonPropertyName("authHeaderName")]
    public string? AuthHeaderName { get; init; }

    /// <summary>
    /// Gets the new plaintext auth header value. Semantics:
    /// <c>null</c> leaves the existing ciphertext in place,
    /// non-null non-empty re-encrypts,
    /// empty string clears the stored secret and forces AuthMode to None.
    /// </summary>
    [StringLength(4096)]
    [JsonPropertyName("authHeaderValue")]
    public string? AuthHeaderValue { get; init; }

    /// <summary>Gets the new icon shade, or null to leave unchanged.</summary>
    [StringLength(32)]
    [JsonPropertyName("iconShade")]
    public string? IconShade { get; init; }
}
