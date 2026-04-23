// <copyright file="A2AExplorerDbContext.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Reflection;
using DonkeyWork.A2AExplorer.Identity.Contracts;
using DonkeyWork.A2AExplorer.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace DonkeyWork.A2AExplorer.Persistence;

/// <summary>
/// EF Core context for all persisted state in A2A Explorer. Applies a global query filter to every
/// entity derived from <see cref="BaseEntity"/> so reads are automatically scoped to the current user.
/// </summary>
public class A2AExplorerDbContext : DbContext
{
    private readonly IIdentityContext? identityContext;

    /// <summary>
    /// Initializes a new instance of the <see cref="A2AExplorerDbContext"/> class.
    /// </summary>
    /// <param name="options">EF Core options injected by DI.</param>
    /// <param name="identityContext">Per-request identity; null at design time and in migration tools.</param>
    public A2AExplorerDbContext(
        DbContextOptions<A2AExplorerDbContext> options,
        IIdentityContext? identityContext = null)
        : base(options)
    {
        this.identityContext = identityContext;
    }

    /// <summary>
    /// Gets the current user's ID used by the per-entity query filter. Returns <see cref="Guid.Empty"/>
    /// when no identity is attached — that value matches no real row, so unauthenticated scopes see nothing.
    /// </summary>
    public Guid CurrentUserId => this.identityContext?.UserId ?? Guid.Empty;

    /// <summary>Gets the saved A2A agents owned by the current user.</summary>
    public DbSet<Entities.AgentEntity> Agents => this.Set<Entities.AgentEntity>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(A2AExplorerDbContext).Assembly);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(A2AExplorerDbContext)
                    .GetMethod(nameof(this.ApplyUserFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType);

                method.Invoke(this, new object[] { modelBuilder });
            }
        }
    }

    private void ApplyUserFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : BaseEntity
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => e.UserId == this.CurrentUserId);
    }
}
