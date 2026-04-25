// <copyright file="TestDbContext.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Identity.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DonkeyWork.A2AExplorer.Persistence.Tests.Fakes;

/// <summary>
/// A DbContext inheriting from <see cref="A2AExplorerDbContext"/> and adding a <see cref="TestEntity"/>
/// <see cref="DbSet{TEntity}"/>. The base class's reflection-based query filter picks up
/// <see cref="TestEntity"/> automatically because it derives from <c>BaseEntity</c>.
/// </summary>
public sealed class TestDbContext : A2AExplorerDbContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="TestDbContext"/> class.
    /// </summary>
    /// <param name="options">EF Core options (InMemory for unit tests).</param>
    /// <param name="identityContext">Per-scope identity; null simulates unauthenticated scope.</param>
    public TestDbContext(DbContextOptions<A2AExplorerDbContext> options, IIdentityContext? identityContext = null)
        : base(options, identityContext)
    {
    }

    /// <summary>Gets the test-only entity set.</summary>
    public DbSet<TestEntity> TestEntities => this.Set<TestEntity>();
}
