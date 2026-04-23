// <copyright file="IMigrationService.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Persistence;

/// <summary>Applies pending EF Core migrations at host startup.</summary>
public interface IMigrationService
{
    /// <summary>Applies all pending migrations against the configured database.</summary>
    /// <param name="cancellationToken">Propagates a cancellation signal from the host.</param>
    /// <returns>A task that completes when the migration run finishes.</returns>
    Task MigrateAsync(CancellationToken cancellationToken = default);
}
