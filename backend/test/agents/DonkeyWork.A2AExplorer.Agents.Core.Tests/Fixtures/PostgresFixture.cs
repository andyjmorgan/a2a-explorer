// <copyright file="PostgresFixture.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using Testcontainers.PostgreSql;
using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests.Fixtures;

/// <summary>
/// xUnit collection fixture that boots a real PostgreSQL container once per test assembly. The
/// pgcrypto extension is loaded via a post-start command so <c>pgp_sym_encrypt</c> / <c>_decrypt</c>
/// are available in every test. Applies the app's EF migrations once before tests run.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer container = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("a2a_explorer_test")
        .WithUsername("tester")
        .WithPassword("tester")
        .Build();

    /// <summary>Gets the Npgsql connection string once the container has started.</summary>
    public string ConnectionString => this.container.GetConnectionString();

    /// <inheritdoc />
    public async Task InitializeAsync()
    {
        await this.container.StartAsync();

        var result = await this.container.ExecScriptAsync("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
        if (result.ExitCode != 0)
        {
            throw new InvalidOperationException($"Failed to load pgcrypto: {result.Stderr}");
        }
    }

    /// <inheritdoc />
    public async Task DisposeAsync()
    {
        await this.container.StopAsync();
        await this.container.DisposeAsync();
    }
}
