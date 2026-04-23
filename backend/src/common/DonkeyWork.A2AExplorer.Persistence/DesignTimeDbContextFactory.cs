// <copyright file="DesignTimeDbContextFactory.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DonkeyWork.A2AExplorer.Persistence;

/// <summary>
/// EF Core design-time factory used by <c>dotnet ef migrations</c>. Reads the connection string from
/// the <c>PERSISTENCE__CONNECTIONSTRING</c> environment variable and falls back to the local docker-compose
/// postgres default. Only invoked by the EF tooling, not at runtime.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<A2AExplorerDbContext>
{
    /// <summary>The fallback connection string matching the docker-compose postgres service.</summary>
    private const string FallbackConnectionString =
        "Host=localhost;Port=5433;Database=a2a_explorer;Username=a2a_explorer;Password=a2a_explorer_dev";

    /// <inheritdoc />
    public A2AExplorerDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("PERSISTENCE__CONNECTIONSTRING")
            ?? FallbackConnectionString;

        var options = new DbContextOptionsBuilder<A2AExplorerDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "public"))
            .Options;

        return new A2AExplorerDbContext(options);
    }
}
