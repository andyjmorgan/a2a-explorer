// <copyright file="IEntity.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Persistence.Interfaces;

/// <summary>Marker contract for every persisted entity — exposes the primary key.</summary>
public interface IEntity
{
    /// <summary>Gets or sets the entity's primary key.</summary>
    Guid Id { get; set; }
}
