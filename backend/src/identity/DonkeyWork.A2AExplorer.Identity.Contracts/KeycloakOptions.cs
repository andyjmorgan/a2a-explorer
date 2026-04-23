// <copyright file="KeycloakOptions.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.ComponentModel.DataAnnotations;

namespace DonkeyWork.A2AExplorer.Identity.Contracts;

/// <summary>Options bound from the <c>Keycloak</c> configuration section.</summary>
public sealed class KeycloakOptions
{
    /// <summary>The configuration section name these options bind from.</summary>
    public const string SectionName = "Keycloak";

    /// <summary>
    /// Gets or sets the public Keycloak issuer URL (e.g. <c>https://auth.donkeywork.dev/realms/Agents</c>).
    /// This is the URL the browser redirects to and the one used to validate JWT <c>iss</c> claims.
    /// </summary>
    [Required]
    [Url]
    public required string Authority { get; set; }

    /// <summary>
    /// Gets or sets an optional internal Keycloak URL used for server-to-server token exchanges. When
    /// set, the backend uses this instead of <see cref="Authority"/> to avoid k8s hairpin/ingress loops.
    /// </summary>
    [Url]
    public string? InternalAuthority { get; set; }

    /// <summary>Gets or sets the expected audience for JWT validation. Typically matches the client id.</summary>
    [Required]
    public required string Audience { get; set; }

    /// <summary>Gets or sets the OAuth client id. Defaults to <see cref="Audience"/> when empty.</summary>
    public string? ClientId { get; set; }

    /// <summary>Gets or sets the OAuth client secret for confidential clients.</summary>
    public string? ClientSecret { get; set; }

    /// <summary>Gets or sets a value indicating whether the JwtBearer handler requires HTTPS metadata.</summary>
    public bool RequireHttpsMetadata { get; set; } = true;

    /// <summary>Gets or sets the base URL of the SPA that receives the post-login fragment redirect.</summary>
    [Url]
    public string? FrontendUrl { get; set; }
}
