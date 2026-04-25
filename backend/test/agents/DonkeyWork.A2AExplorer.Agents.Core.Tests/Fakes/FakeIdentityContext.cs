// <copyright file="FakeIdentityContext.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Identity.Contracts;

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests.Fakes;

/// <summary>Stub identity context used by AgentService tests.</summary>
public sealed class FakeIdentityContext : IIdentityContext
{
    /// <inheritdoc />
    public Guid UserId { get; set; }

    /// <inheritdoc />
    public string? Email { get; set; }

    /// <inheritdoc />
    public string? Name { get; set; }

    /// <inheritdoc />
    public string? Username { get; set; }

    /// <inheritdoc />
    public bool IsAuthenticated { get; set; } = true;
}
