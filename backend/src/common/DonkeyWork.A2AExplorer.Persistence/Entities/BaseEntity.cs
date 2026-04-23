// <copyright file="BaseEntity.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Persistence.Interfaces;

namespace DonkeyWork.A2AExplorer.Persistence.Entities;

/// <summary>
/// Base class for all user-scoped, auditable persisted entities. The <see cref="UserId"/> column
/// participates in the automatic EF Core query filter applied by <c>A2AExplorerDbContext</c>,
/// so services never need to filter by user manually on reads.
/// </summary>
public abstract class BaseEntity : IEntity, IAuditable
{
    /// <summary>Gets or sets the entity's primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the owning user's identifier. Always set explicitly on create.</summary>
    public Guid UserId { get; set; }

    /// <summary>Gets or sets the UTC timestamp the entity was first persisted.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the UTC timestamp of the most recent persisted update.</summary>
    public DateTimeOffset? UpdatedAt { get; set; }
}
