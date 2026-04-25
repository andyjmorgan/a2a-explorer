// <copyright file="TestConnectionRequestV1.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace DonkeyWork.A2AExplorer.Agents.Contracts.Models;

/// <summary>
/// Wizard-time request body for probing an unsaved agent. The backend fetches the agent card using
/// the supplied base URL + optional auth header and returns the card (or a typed error). Nothing is
/// persisted.
/// </summary>
public sealed class TestConnectionRequestV1
{
    /// <summary>Gets the candidate agent base URL.</summary>
    [Required]
    [Url]
    [StringLength(2048, MinimumLength = 1)]
    [JsonPropertyName("baseUrl")]
    public required string BaseUrl { get; init; }

    /// <summary>Gets the optional HTTP header name to attach.</summary>
    [StringLength(128)]
    [JsonPropertyName("authHeaderName")]
    public string? AuthHeaderName { get; init; }

    /// <summary>Gets the optional HTTP header value. Never logged, never stored.</summary>
    [StringLength(4096)]
    [JsonPropertyName("authHeaderValue")]
    public string? AuthHeaderValue { get; init; }
}
