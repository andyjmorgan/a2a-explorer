// <copyright file="MigrationService.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DonkeyWork.A2AExplorer.Persistence;

/// <summary>Default <see cref="IMigrationService"/> that delegates to EF Core's <c>MigrateAsync</c>.</summary>
public sealed class MigrationService : IMigrationService
{
    private readonly A2AExplorerDbContext dbContext;
    private readonly ILogger<MigrationService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="MigrationService"/> class.
    /// </summary>
    /// <param name="dbContext">The context whose migrations should be applied.</param>
    /// <param name="logger">Logger for progress messages.</param>
    public MigrationService(A2AExplorerDbContext dbContext, ILogger<MigrationService> logger)
    {
        this.dbContext = dbContext;
        this.logger = logger;
    }

    /// <inheritdoc />
    public async Task MigrateAsync(CancellationToken cancellationToken = default)
    {
        this.logger.LogInformation("Applying pending database migrations");
        await this.dbContext.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);
        this.logger.LogInformation("Database migrations applied");
    }
}
