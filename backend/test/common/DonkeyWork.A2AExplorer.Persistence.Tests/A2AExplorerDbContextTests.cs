// <copyright file="A2AExplorerDbContextTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Persistence;
using DonkeyWork.A2AExplorer.Persistence.Tests.Fakes;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DonkeyWork.A2AExplorer.Persistence.Tests;

/// <summary>
/// Tests that <see cref="A2AExplorerDbContext"/> correctly applies its reflection-based query filter
/// so queries only return rows owned by the current user.
/// </summary>
public sealed class A2AExplorerDbContextTests
{
    /// <summary>CurrentUserId falls back to <see cref="Guid.Empty"/> when no identity is attached.</summary>
    [Fact]
    public void CurrentUserId_NoIdentityContext_ReturnsGuidEmpty()
    {
        // Arrange
        using var db = CreateContext(nameof(this.CurrentUserId_NoIdentityContext_ReturnsGuidEmpty), identity: null);

        // Act
        var current = db.CurrentUserId;

        // Assert
        Assert.Equal(Guid.Empty, current);
    }

    /// <summary>CurrentUserId reflects the attached identity's UserId.</summary>
    [Fact]
    public void CurrentUserId_WithIdentityContext_ReturnsUserId()
    {
        // Arrange
        var userId = Guid.NewGuid();
        using var db = CreateContext(
            nameof(this.CurrentUserId_WithIdentityContext_ReturnsUserId),
            new FakeIdentityContext { UserId = userId, IsAuthenticated = true });

        // Act
        var current = db.CurrentUserId;

        // Assert
        Assert.Equal(userId, current);
    }

    /// <summary>Users see only rows they own — verifies the reflection-based query filter works end-to-end.</summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task ListAsync_DifferentUser_ReturnsEmpty()
    {
        // Arrange
        const string dbName = nameof(this.ListAsync_DifferentUser_ReturnsEmpty);
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();

        // Seed as userA
        await using (var db = CreateContext(dbName, new FakeIdentityContext { UserId = userA, IsAuthenticated = true }))
        {
            db.TestEntities.Add(new TestEntity { Id = Guid.NewGuid(), UserId = userA, Label = "a1" });
            db.TestEntities.Add(new TestEntity { Id = Guid.NewGuid(), UserId = userA, Label = "a2" });
            await db.SaveChangesAsync();
        }

        // Act — read as userB
        await using var readDb = CreateContext(dbName, new FakeIdentityContext { UserId = userB, IsAuthenticated = true });
        var visible = await readDb.TestEntities.AsNoTracking().ToListAsync();

        // Assert
        Assert.Empty(visible);
    }

    /// <summary>Users do see their own rows — happy-path counterpart to the cross-user assertion.</summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task ListAsync_SameUser_ReturnsOwnedRows()
    {
        // Arrange
        const string dbName = nameof(this.ListAsync_SameUser_ReturnsOwnedRows);
        var userId = Guid.NewGuid();

        await using (var db = CreateContext(dbName, new FakeIdentityContext { UserId = userId, IsAuthenticated = true }))
        {
            db.TestEntities.Add(new TestEntity { Id = Guid.NewGuid(), UserId = userId, Label = "mine-1" });
            db.TestEntities.Add(new TestEntity { Id = Guid.NewGuid(), UserId = userId, Label = "mine-2" });
            await db.SaveChangesAsync();
        }

        // Act
        await using var readDb = CreateContext(dbName, new FakeIdentityContext { UserId = userId, IsAuthenticated = true });
        var visible = await readDb.TestEntities.AsNoTracking().OrderBy(e => e.Label).ToListAsync();

        // Assert
        Assert.Equal(2, visible.Count);
        Assert.Equal("mine-1", visible[0].Label);
        Assert.Equal("mine-2", visible[1].Label);
    }

    /// <summary>An unauthenticated scope (no identity context) sees nothing — Guid.Empty matches no real row.</summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task ListAsync_UnauthenticatedScope_ReturnsEmpty()
    {
        // Arrange
        const string dbName = nameof(this.ListAsync_UnauthenticatedScope_ReturnsEmpty);
        var userId = Guid.NewGuid();

        await using (var db = CreateContext(dbName, new FakeIdentityContext { UserId = userId, IsAuthenticated = true }))
        {
            db.TestEntities.Add(new TestEntity { Id = Guid.NewGuid(), UserId = userId, Label = "hidden" });
            await db.SaveChangesAsync();
        }

        // Act — read with no identity
        await using var readDb = CreateContext(dbName, identity: null);
        var visible = await readDb.TestEntities.AsNoTracking().ToListAsync();

        // Assert
        Assert.Empty(visible);
    }

    private static TestDbContext CreateContext(string name, FakeIdentityContext? identity)
    {
        var options = new DbContextOptionsBuilder<A2AExplorerDbContext>()
            .UseInMemoryDatabase(name)
            .Options;

        return new TestDbContext(options, identity);
    }
}
