// <copyright file="AuditableInterceptorTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Persistence;
using DonkeyWork.A2AExplorer.Persistence.Interceptors;
using DonkeyWork.A2AExplorer.Persistence.Tests.Fakes;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DonkeyWork.A2AExplorer.Persistence.Tests.Interceptors;

/// <summary>Unit tests for <see cref="AuditableInterceptor"/>.</summary>
public sealed class AuditableInterceptorTests
{
    /// <summary>On Added state, the interceptor must populate both CreatedAt and UpdatedAt.</summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task SavingChangesAsync_OnAdded_SetsCreatedAtAndUpdatedAt()
    {
        // Arrange
        var identity = new FakeIdentityContext { UserId = Guid.NewGuid(), IsAuthenticated = true };
        await using var db = CreateContext(nameof(this.SavingChangesAsync_OnAdded_SetsCreatedAtAndUpdatedAt), identity);
        var entity = new TestEntity { Id = Guid.NewGuid(), UserId = identity.UserId, Label = "first" };
        var before = DateTimeOffset.UtcNow;

        // Act
        db.TestEntities.Add(entity);
        await db.SaveChangesAsync();

        // Assert
        Assert.NotEqual(default, entity.CreatedAt);
        Assert.NotNull(entity.UpdatedAt);
        Assert.Equal(entity.CreatedAt, entity.UpdatedAt!.Value);
        Assert.InRange(entity.CreatedAt, before, DateTimeOffset.UtcNow);
    }

    /// <summary>On Modified state, the interceptor touches only UpdatedAt and leaves CreatedAt alone.</summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task SavingChangesAsync_OnModified_OnlyUpdatesUpdatedAt()
    {
        // Arrange
        var identity = new FakeIdentityContext { UserId = Guid.NewGuid(), IsAuthenticated = true };
        await using var db = CreateContext(nameof(this.SavingChangesAsync_OnModified_OnlyUpdatesUpdatedAt), identity);
        var entity = new TestEntity { Id = Guid.NewGuid(), UserId = identity.UserId, Label = "orig" };
        db.TestEntities.Add(entity);
        await db.SaveChangesAsync();
        var originalCreatedAt = entity.CreatedAt;
        await Task.Delay(10);

        // Act
        entity.Label = "modified";
        await db.SaveChangesAsync();

        // Assert
        Assert.Equal(originalCreatedAt, entity.CreatedAt);
        Assert.NotNull(entity.UpdatedAt);
        Assert.True(entity.UpdatedAt!.Value > originalCreatedAt);
    }

    /// <summary>When no entities of <c>IAuditable</c> are present, the interceptor is a no-op.</summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task SavingChangesAsync_NoAuditableEntries_NoOp()
    {
        // Arrange
        await using var db = CreateContext(nameof(this.SavingChangesAsync_NoAuditableEntries_NoOp));

        // Act
        var changes = await db.SaveChangesAsync();

        // Assert
        Assert.Equal(0, changes);
    }

    /// <summary>The synchronous SaveChanges path applies the same logic as the async one.</summary>
    [Fact]
    public void SavingChanges_Sync_OnAdded_SetsTimestamps()
    {
        // Arrange
        var identity = new FakeIdentityContext { UserId = Guid.NewGuid(), IsAuthenticated = true };
        using var db = CreateContext(nameof(this.SavingChanges_Sync_OnAdded_SetsTimestamps), identity);
        var entity = new TestEntity { Id = Guid.NewGuid(), UserId = identity.UserId, Label = "sync" };

        // Act
        db.TestEntities.Add(entity);
        db.SaveChanges();

        // Assert
        Assert.NotEqual(default, entity.CreatedAt);
        Assert.NotNull(entity.UpdatedAt);
    }

    /// <summary>Unchanged/Detached entries are never touched by the interceptor.</summary>
    /// <returns>A task representing the asynchronous test.</returns>
    [Fact]
    public async Task SavingChangesAsync_UnchangedEntity_DoesNotTouchTimestamps()
    {
        // Arrange
        var identity = new FakeIdentityContext { UserId = Guid.NewGuid(), IsAuthenticated = true };
        await using var db = CreateContext(nameof(this.SavingChangesAsync_UnchangedEntity_DoesNotTouchTimestamps), identity);
        var entity = new TestEntity { Id = Guid.NewGuid(), UserId = identity.UserId, Label = "one" };
        db.TestEntities.Add(entity);
        await db.SaveChangesAsync();
        var capturedUpdatedAt = entity.UpdatedAt;
        await Task.Delay(10);

        // Act — SaveChanges with no modifications; entity is Unchanged
        await db.SaveChangesAsync();

        // Assert
        Assert.Equal(capturedUpdatedAt, entity.UpdatedAt);
    }

    private static TestDbContext CreateContext(string name, FakeIdentityContext? identity = null)
    {
        var options = new DbContextOptionsBuilder<A2AExplorerDbContext>()
            .UseInMemoryDatabase(name)
            .AddInterceptors(new AuditableInterceptor())
            .Options;

        return new TestDbContext(options, identity);
    }
}
