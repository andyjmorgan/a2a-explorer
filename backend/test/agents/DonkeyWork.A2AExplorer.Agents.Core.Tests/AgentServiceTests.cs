// <copyright file="AgentServiceTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Agents.Contracts.Models;
using DonkeyWork.A2AExplorer.Agents.Core;
using DonkeyWork.A2AExplorer.Agents.Core.Tests.Fakes;
using DonkeyWork.A2AExplorer.Agents.Core.Tests.Fixtures;
using DonkeyWork.A2AExplorer.Identity.Contracts;
using DonkeyWork.A2AExplorer.Persistence;
using DonkeyWork.A2AExplorer.Persistence.Interceptors;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests;

/// <summary>Integration tests for <see cref="AgentService"/> against a real PostgreSQL container.</summary>
[Collection(PostgresCollection.Name)]
public sealed class AgentServiceTests : IAsyncLifetime
{
    private const string EncryptionKey = "a2a-explorer-test-encryption-key-32c";
    private readonly PostgresFixture fixture;
    private A2AExplorerDbContext db = null!;
    private FakeIdentityContext identity = null!;
    private AgentService service = null!;

    /// <summary>
    /// Initializes a new instance of the <see cref="AgentServiceTests"/> class.
    /// </summary>
    /// <param name="fixture">Shared postgres fixture.</param>
    public AgentServiceTests(PostgresFixture fixture)
    {
        this.fixture = fixture;
    }

    /// <inheritdoc />
    public async Task InitializeAsync()
    {
        this.identity = new FakeIdentityContext { UserId = Guid.NewGuid() };
        this.db = BuildDbContext(this.fixture.ConnectionString, this.identity);
        await this.db.Database.EnsureDeletedAsync();
        await this.db.Database.MigrateAsync();

        // pgcrypto lives in the template database but EnsureDeleted drops this db; reload extension.
        await this.db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

        this.service = new AgentService(
            this.db,
            this.identity,
            Options.Create(new SecurityOptions { CredentialEncryptionKey = EncryptionKey }),
            NullLogger<AgentService>.Instance);
    }

    /// <inheritdoc />
    public async Task DisposeAsync() => await this.db.DisposeAsync();

    /// <summary>Creates an agent with an auth header; the stored column is bytea, not plaintext.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task CreateAsync_WithAuthHeader_EncryptsValueAtRest()
    {
        // Arrange
        var request = new CreateAgentRequestV1
        {
            Name = "secret-agent",
            BaseUrl = "https://agent.example.test",
            AuthMode = AgentAuthMode.Header,
            AuthHeaderName = "X-API-Key",
            AuthHeaderValue = "super-secret-value",
        };

        // Act
        var created = await this.service.CreateAsync(request);

        // Assert
        Assert.Equal(AgentAuthMode.Header, created.AuthMode);
        Assert.True(created.HasAuthHeaderValue);

        var raw = await this.db.Agents.AsNoTracking().FirstAsync(a => a.Id == created.Id);
        Assert.NotNull(raw.AuthHeaderValueEncrypted);
        Assert.NotEmpty(raw.AuthHeaderValueEncrypted!);

        // Plaintext must not appear anywhere in the ciphertext.
        var ciphertext = System.Text.Encoding.UTF8.GetString(raw.AuthHeaderValueEncrypted!);
        Assert.DoesNotContain("super-secret-value", ciphertext, StringComparison.Ordinal);
    }

    /// <summary>A saved agent with an encrypted header decrypts to the original via ResolveAuthHeaderAsync.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task ResolveAuthHeaderAsync_OwnedAgent_ReturnsDecryptedValue()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "resolver",
            BaseUrl = "https://agent.example.test",
            AuthMode = AgentAuthMode.Header,
            AuthHeaderName = "X-API-Key",
            AuthHeaderValue = "round-trip-me",
        });

        // Act
        var header = await this.service.ResolveAuthHeaderAsync(created.Id);

        // Assert
        Assert.NotNull(header);
        Assert.Equal("X-API-Key", header!.Name);
        Assert.Equal("round-trip-me", header.Value);
    }

    /// <summary>Resolving an agent belonging to another user returns null (query filter applies).</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task ResolveAuthHeaderAsync_WrongUser_ReturnsNull()
    {
        // Arrange — user A creates an agent
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "alice-agent",
            BaseUrl = "https://agent.example.test",
            AuthMode = AgentAuthMode.Header,
            AuthHeaderName = "X-API-Key",
            AuthHeaderValue = "alice-secret",
        });

        // Act — switch identity to user B and try to resolve
        this.identity.UserId = Guid.NewGuid();
        var header = await this.service.ResolveAuthHeaderAsync(created.Id);

        // Assert
        Assert.Null(header);
    }

    /// <summary>Resolving an agent with AuthMode.None returns null even for the owner.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task ResolveAuthHeaderAsync_NoAuthConfigured_ReturnsNull()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "open-agent",
            BaseUrl = "https://agent.example.test",
            AuthMode = AgentAuthMode.None,
        });

        // Act
        var header = await this.service.ResolveAuthHeaderAsync(created.Id);

        // Assert
        Assert.Null(header);
    }

    /// <summary>GetByIdAsync returns a detailed view for the owner, with HasAuthHeaderValue reflecting the row.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetByIdAsync_OwnedAgent_ReturnsDetailsWithFlag()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "my-agent",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.Header,
            AuthHeaderName = "X-API-Key",
            AuthHeaderValue = "v",
        });

        // Act
        var details = await this.service.GetByIdAsync(created.Id);

        // Assert
        Assert.NotNull(details);
        Assert.Equal("my-agent", details!.Name);
        Assert.True(details.HasAuthHeaderValue);
    }

    /// <summary>GetByIdAsync returns null when the calling user does not own the agent.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetByIdAsync_WrongUser_ReturnsNull()
    {
        // Arrange — created as user A
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "anothers-agent",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.None,
        });

        // Act — read as user B
        this.identity.UserId = Guid.NewGuid();
        var details = await this.service.GetByIdAsync(created.Id);

        // Assert
        Assert.Null(details);
    }

    /// <summary>ListAsync returns only the current user's agents.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task ListAsync_DifferentUser_ReturnsEmpty()
    {
        // Arrange
        await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "one",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.None,
        });
        await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "two",
            BaseUrl = "https://b.example.test",
            AuthMode = AgentAuthMode.None,
        });

        // Act — list as a different user
        this.identity.UserId = Guid.NewGuid();
        var result = await this.service.ListAsync();

        // Assert
        Assert.Empty(result);
    }

    /// <summary>ListAsync for the owner returns all owned agents.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task ListAsync_OwnedAgents_ReturnsAll()
    {
        // Arrange
        await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "alpha",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.None,
        });
        await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "beta",
            BaseUrl = "https://b.example.test",
            AuthMode = AgentAuthMode.None,
        });

        // Act
        var result = await this.service.ListAsync();

        // Assert
        Assert.Equal(2, result.Count);
    }

    /// <summary>UpdateAsync with null AuthHeaderValue leaves the stored ciphertext intact.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task UpdateAsync_NullAuthHeaderValue_PreservesExistingCiphertext()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "preserve-me",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.Header,
            AuthHeaderName = "X-API-Key",
            AuthHeaderValue = "keep",
        });

        // Act — change only the name; leave AuthHeaderValue null
        var updated = await this.service.UpdateAsync(created.Id, new UpdateAgentRequestV1 { Name = "renamed" });

        // Assert
        Assert.NotNull(updated);
        Assert.Equal("renamed", updated!.Name);
        Assert.True(updated.HasAuthHeaderValue);

        var stillResolves = await this.service.ResolveAuthHeaderAsync(created.Id);
        Assert.NotNull(stillResolves);
        Assert.Equal("keep", stillResolves!.Value);
    }

    /// <summary>UpdateAsync with empty AuthHeaderValue clears the ciphertext and forces AuthMode=None.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task UpdateAsync_EmptyAuthHeaderValue_ClearsCiphertextAndForcesNone()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "clear-me",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.Header,
            AuthHeaderName = "X-API-Key",
            AuthHeaderValue = "clear",
        });

        // Act
        var updated = await this.service.UpdateAsync(created.Id, new UpdateAgentRequestV1 { AuthHeaderValue = string.Empty });

        // Assert
        Assert.NotNull(updated);
        Assert.Equal(AgentAuthMode.None, updated!.AuthMode);
        Assert.False(updated.HasAuthHeaderValue);

        var gone = await this.service.ResolveAuthHeaderAsync(created.Id);
        Assert.Null(gone);
    }

    /// <summary>UpdateAsync with a new non-empty AuthHeaderValue re-encrypts the stored secret.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task UpdateAsync_NewAuthHeaderValue_ReEncryptsCiphertext()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "rotate",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.Header,
            AuthHeaderName = "X-API-Key",
            AuthHeaderValue = "original",
        });

        // Act
        await this.service.UpdateAsync(created.Id, new UpdateAgentRequestV1 { AuthHeaderValue = "rotated" });

        // Assert
        var header = await this.service.ResolveAuthHeaderAsync(created.Id);
        Assert.NotNull(header);
        Assert.Equal("rotated", header!.Value);
    }

    /// <summary>UpdateAsync against another user's agent returns null.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task UpdateAsync_WrongUser_ReturnsNull()
    {
        // Arrange — user A creates
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "hidden",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.None,
        });

        // Act — user B tries to update
        this.identity.UserId = Guid.NewGuid();
        var result = await this.service.UpdateAsync(created.Id, new UpdateAgentRequestV1 { Name = "pwned" });

        // Assert
        Assert.Null(result);
    }

    /// <summary>DeleteAsync against another user's agent returns false.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task DeleteAsync_WrongUser_ReturnsFalse()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "safe",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.None,
        });

        // Act
        this.identity.UserId = Guid.NewGuid();
        var deleted = await this.service.DeleteAsync(created.Id);

        // Assert
        Assert.False(deleted);
    }

    /// <summary>DeleteAsync against the owner's agent returns true and removes the row.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task DeleteAsync_Owner_RemovesRow()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "bye",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.None,
        });

        // Act
        var deleted = await this.service.DeleteAsync(created.Id);

        // Assert
        Assert.True(deleted);
        Assert.Null(await this.service.GetByIdAsync(created.Id));
    }

    /// <summary>TouchLastUsedAsync updates LastUsedAt for the owner.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task TouchLastUsedAsync_Owner_UpdatesLastUsedAt()
    {
        // Arrange
        var created = await this.service.CreateAsync(new CreateAgentRequestV1
        {
            Name = "touched",
            BaseUrl = "https://a.example.test",
            AuthMode = AgentAuthMode.None,
        });
        Assert.Null(created.LastUsedAt);
        var before = DateTimeOffset.UtcNow;

        // Act
        await this.service.TouchLastUsedAsync(created.Id);

        // Assert
        var after = await this.service.GetByIdAsync(created.Id);
        Assert.NotNull(after);
        Assert.NotNull(after!.LastUsedAt);
        Assert.InRange(after.LastUsedAt!.Value, before.AddSeconds(-1), DateTimeOffset.UtcNow);
    }

    private static A2AExplorerDbContext BuildDbContext(string connectionString, IIdentityContext identityContext)
    {
        var options = new DbContextOptionsBuilder<A2AExplorerDbContext>()
            .UseNpgsql(connectionString)
            .AddInterceptors(new AuditableInterceptor())
            .Options;
        return new A2AExplorerDbContext(options, identityContext);
    }
}
