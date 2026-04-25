// <copyright file="IIdentityContext.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Identity.Contracts;

/// <summary>
/// Represents the authenticated user for the current request scope. Populated by the JWT bearer
/// <c>OnTokenValidated</c> hook and read by services and the DbContext query filter to scope
/// data access to the current user.
/// </summary>
public interface IIdentityContext
{
    /// <summary>Gets the authenticated user's identifier (the Keycloak <c>sub</c> claim).</summary>
    Guid UserId { get; }

    /// <summary>Gets the authenticated user's email address, if present on the token.</summary>
    string? Email { get; }

    /// <summary>Gets the authenticated user's display name, if present on the token.</summary>
    string? Name { get; }

    /// <summary>Gets the authenticated user's preferred username, if present on the token.</summary>
    string? Username { get; }

    /// <summary>Gets a value indicating whether an identity has been attached to the current scope.</summary>
    bool IsAuthenticated { get; }
}
