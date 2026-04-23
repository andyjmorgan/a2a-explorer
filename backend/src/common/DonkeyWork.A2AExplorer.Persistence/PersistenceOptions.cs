// <copyright file="PersistenceOptions.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.ComponentModel.DataAnnotations;

namespace DonkeyWork.A2AExplorer.Persistence;

/// <summary>Options bound from the <c>Persistence</c> configuration section.</summary>
public sealed class PersistenceOptions
{
    /// <summary>The configuration section name these options bind from.</summary>
    public const string SectionName = "Persistence";

    /// <summary>Gets or sets the PostgreSQL connection string.</summary>
    [Required]
    public required string ConnectionString { get; set; }
}
