// <copyright file="IdentityContextTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Identity.Core;
using Xunit;

namespace DonkeyWork.A2AExplorer.Identity.Core.Tests;

/// <summary>Unit tests for <see cref="IdentityContext"/>.</summary>
public sealed class IdentityContextTests
{
    /// <summary>A fresh IdentityContext is unauthenticated with empty claims.</summary>
    [Fact]
    public void NewInstance_IsUnauthenticatedWithEmptyValues()
    {
        // Arrange
        var context = new IdentityContext();

        // Act (no-op — assert initial state)

        // Assert
        Assert.False(context.IsAuthenticated);
        Assert.Equal(Guid.Empty, context.UserId);
        Assert.Null(context.Email);
        Assert.Null(context.Name);
        Assert.Null(context.Username);
    }

    /// <summary>SetIdentity copies all fields and flips IsAuthenticated to true.</summary>
    [Fact]
    public void SetIdentity_PopulatesAllFieldsAndMarksAuthenticated()
    {
        // Arrange
        var context = new IdentityContext();
        var userId = Guid.NewGuid();

        // Act
        context.SetIdentity(userId, "u@example.test", "Ursula User", "ursula");

        // Assert
        Assert.True(context.IsAuthenticated);
        Assert.Equal(userId, context.UserId);
        Assert.Equal("u@example.test", context.Email);
        Assert.Equal("Ursula User", context.Name);
        Assert.Equal("ursula", context.Username);
    }

    /// <summary>SetIdentity accepts null email/name/username and still authenticates.</summary>
    [Fact]
    public void SetIdentity_AllowsNullOptionalClaims()
    {
        // Arrange
        var context = new IdentityContext();
        var userId = Guid.NewGuid();

        // Act
        context.SetIdentity(userId, email: null, name: null, username: null);

        // Assert
        Assert.True(context.IsAuthenticated);
        Assert.Equal(userId, context.UserId);
        Assert.Null(context.Email);
        Assert.Null(context.Name);
        Assert.Null(context.Username);
    }
}
