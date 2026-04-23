// <copyright file="IAuditable.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Persistence.Interfaces;

/// <summary>
/// Entities implementing this interface have their <see cref="CreatedAt"/> and <see cref="UpdatedAt"/>
/// properties populated automatically by <c>AuditableInterceptor</c> on <c>SaveChanges</c>.
/// </summary>
public interface IAuditable
{
    /// <summary>Gets or sets the UTC timestamp the entity was first persisted.</summary>
    DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the UTC timestamp of the most recent persisted update (null until the first update).</summary>
    DateTimeOffset? UpdatedAt { get; set; }
}
