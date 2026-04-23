// <copyright file="IdentityContext.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Identity.Contracts;

namespace DonkeyWork.A2AExplorer.Identity.Core;

/// <summary>
/// Scoped container for the authenticated user's identity. Populated by the JWT bearer
/// <c>OnTokenValidated</c> hook and read by services via <see cref="IIdentityContext"/>.
/// Registered as Scoped; both the interface and the concrete type are resolvable and share the same
/// instance within a request so auth handlers can write and services can read.
/// </summary>
public sealed class IdentityContext : IIdentityContext
{
    /// <inheritdoc />
    public Guid UserId { get; private set; }

    /// <inheritdoc />
    public string? Email { get; private set; }

    /// <inheritdoc />
    public string? Name { get; private set; }

    /// <inheritdoc />
    public string? Username { get; private set; }

    /// <inheritdoc />
    public bool IsAuthenticated { get; private set; }

    /// <summary>
    /// Attaches an identity to the current scope. Called once per request by the JwtBearer
    /// <c>OnTokenValidated</c> hook after a token has been cryptographically validated.
    /// </summary>
    /// <param name="userId">The authenticated user's identifier (the Keycloak <c>sub</c> claim).</param>
    /// <param name="email">The user's email address, or null.</param>
    /// <param name="name">The user's display name, or null.</param>
    /// <param name="username">The user's preferred username, or null.</param>
    public void SetIdentity(Guid userId, string? email, string? name, string? username)
    {
        this.UserId = userId;
        this.Email = email;
        this.Name = name;
        this.Username = username;
        this.IsAuthenticated = true;
    }
}
