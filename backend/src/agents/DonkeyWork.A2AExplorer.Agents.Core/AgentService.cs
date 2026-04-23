// <copyright file="AgentService.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Contracts.Models;
using DonkeyWork.A2AExplorer.Identity.Contracts;
using DonkeyWork.A2AExplorer.Persistence;
using DonkeyWork.A2AExplorer.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DonkeyWork.A2AExplorer.Agents.Core;

/// <summary>
/// Default <see cref="IAgentService"/> implementation backed by <see cref="A2AExplorerDbContext"/>.
/// Auth-header values are encrypted at rest via pgcrypto's <c>pgp_sym_encrypt</c> in SQL so the CLR
/// only ever handles plaintext on ingress (user-submitted input) and egress (outbound proxy forwards).
/// </summary>
public sealed class AgentService : IAgentService
{
    private readonly A2AExplorerDbContext db;
    private readonly IIdentityContext identity;
    private readonly string encryptionKey;
    private readonly ILogger<AgentService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AgentService"/> class.
    /// </summary>
    /// <param name="db">The scoped DbContext.</param>
    /// <param name="identity">The scoped identity context.</param>
    /// <param name="securityOptions">Bound security options providing the pgcrypto key.</param>
    /// <param name="logger">Logger for audit output.</param>
    public AgentService(
        A2AExplorerDbContext db,
        IIdentityContext identity,
        IOptions<SecurityOptions> securityOptions,
        ILogger<AgentService> logger)
    {
        this.db = db;
        this.identity = identity;
        this.encryptionKey = securityOptions.Value.CredentialEncryptionKey;
        this.logger = logger;
    }

    /// <inheritdoc />
    public async Task<AgentDetailsV1> CreateAsync(CreateAgentRequestV1 request, CancellationToken cancellationToken = default)
    {
        var userId = this.identity.UserId;
        var id = Guid.NewGuid();

        var entity = new AgentEntity
        {
            Id = id,
            UserId = userId,
            Name = request.Name,
            BaseUrl = request.BaseUrl,
            AuthMode = request.AuthMode,
            AuthHeaderName = request.AuthHeaderName,
            AuthHeaderValueEncrypted = null,
        };

        this.db.Agents.Add(entity);
        await this.db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var hasAuthHeaderValue = false;
        if (request.AuthMode == AgentAuthMode.Header && !string.IsNullOrEmpty(request.AuthHeaderValue))
        {
            await this.EncryptAuthHeaderValueAsync(id, userId, request.AuthHeaderValue, cancellationToken).ConfigureAwait(false);
            hasAuthHeaderValue = true;
        }

        this.logger.LogInformation("Created agent {AgentId} for user {UserId}", id, userId);

        return new AgentDetailsV1
        {
            Id = entity.Id,
            Name = entity.Name,
            BaseUrl = entity.BaseUrl,
            AuthMode = entity.AuthMode,
            AuthHeaderName = entity.AuthHeaderName,
            HasAuthHeaderValue = hasAuthHeaderValue,
            LastUsedAt = entity.LastUsedAt,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
        };
    }

    /// <inheritdoc />
    public async Task<AgentDetailsV1?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await this.db.Agents
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            .ConfigureAwait(false);

        return entity is null ? null : MapDetails(entity);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<AgentSummaryV1>> ListAsync(CancellationToken cancellationToken = default)
    {
        var entities = await this.db.Agents
            .AsNoTracking()
            .OrderByDescending(a => a.LastUsedAt)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return entities.Select(MapSummary).ToList();
    }

    /// <inheritdoc />
    public async Task<AgentDetailsV1?> UpdateAsync(Guid id, UpdateAgentRequestV1 request, CancellationToken cancellationToken = default)
    {
        var entity = await this.db.Agents
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            .ConfigureAwait(false);
        if (entity is null)
        {
            return null;
        }

        if (request.Name is not null)
        {
            entity.Name = request.Name;
        }

        if (request.BaseUrl is not null)
        {
            entity.BaseUrl = request.BaseUrl;
        }

        if (request.AuthMode is not null)
        {
            entity.AuthMode = request.AuthMode.Value;
        }

        if (request.AuthHeaderName is not null)
        {
            entity.AuthHeaderName = request.AuthHeaderName;
        }

        await this.db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var hasAuthHeaderValue = entity.AuthHeaderValueEncrypted is not null;
        if (request.AuthHeaderValue is not null)
        {
            if (request.AuthHeaderValue.Length == 0)
            {
                await this.ClearAuthHeaderValueAsync(entity.Id, entity.UserId, cancellationToken).ConfigureAwait(false);
                entity.AuthHeaderValueEncrypted = null;
                entity.AuthMode = AgentAuthMode.None;
                hasAuthHeaderValue = false;

                // Persist the AuthMode flip alongside the cleared ciphertext.
                this.db.Agents.Update(entity);
                await this.db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            else
            {
                await this.EncryptAuthHeaderValueAsync(entity.Id, entity.UserId, request.AuthHeaderValue, cancellationToken).ConfigureAwait(false);
                hasAuthHeaderValue = true;
            }
        }

        return new AgentDetailsV1
        {
            Id = entity.Id,
            Name = entity.Name,
            BaseUrl = entity.BaseUrl,
            AuthMode = entity.AuthMode,
            AuthHeaderName = entity.AuthHeaderName,
            HasAuthHeaderValue = hasAuthHeaderValue,
            LastUsedAt = entity.LastUsedAt,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
        };
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await this.db.Agents
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            .ConfigureAwait(false);
        if (entity is null)
        {
            return false;
        }

        this.db.Agents.Remove(entity);
        await this.db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <inheritdoc />
    public async Task<OutboundAuthHeader?> ResolveAuthHeaderAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = this.identity.UserId;
        var connection = this.db.Database.GetDbConnection();

        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        }

        try
        {
            await using var cmd = connection.CreateCommand();
            cmd.CommandText =
                "SELECT auth_header_name, pgp_sym_decrypt(auth_header_value_encrypted, @key)::text " +
                "FROM agents " +
                "WHERE id = @id AND user_id = @userId AND auth_mode = 1 AND auth_header_value_encrypted IS NOT NULL";
            AddParameter(cmd, "@key", this.encryptionKey);
            AddParameter(cmd, "@id", id);
            AddParameter(cmd, "@userId", userId);

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
            if (!await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
            {
                return null;
            }

            var name = reader.IsDBNull(0) ? null : reader.GetString(0);
            var value = reader.IsDBNull(1) ? null : reader.GetString(1);
            if (string.IsNullOrEmpty(name) || value is null)
            {
                return null;
            }

            return new OutboundAuthHeader(name, value);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync().ConfigureAwait(false);
            }
        }
    }

    /// <inheritdoc />
    public async Task TouchLastUsedAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = this.identity.UserId;
        var now = DateTimeOffset.UtcNow;
        await this.db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE agents SET last_used_at = {now}, updated_at = {now} WHERE id = {id} AND user_id = {userId}",
            cancellationToken).ConfigureAwait(false);
    }

    private static AgentSummaryV1 MapSummary(AgentEntity entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        BaseUrl = entity.BaseUrl,
        AuthMode = entity.AuthMode,
        HasAuthHeaderValue = entity.AuthHeaderValueEncrypted is not null,
        LastUsedAt = entity.LastUsedAt,
        CreatedAt = entity.CreatedAt,
    };

    private static AgentDetailsV1 MapDetails(AgentEntity entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        BaseUrl = entity.BaseUrl,
        AuthMode = entity.AuthMode,
        AuthHeaderName = entity.AuthHeaderName,
        HasAuthHeaderValue = entity.AuthHeaderValueEncrypted is not null,
        LastUsedAt = entity.LastUsedAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
    };

    private static void AddParameter(System.Data.Common.DbCommand cmd, string name, object value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value;
        cmd.Parameters.Add(p);
    }

    private async Task EncryptAuthHeaderValueAsync(Guid id, Guid userId, string value, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        await this.db.Database.ExecuteSqlInterpolatedAsync(
            $@"UPDATE agents
               SET auth_header_value_encrypted = pgp_sym_encrypt({value}, {this.encryptionKey}),
                   updated_at = {now}
               WHERE id = {id} AND user_id = {userId}",
            cancellationToken).ConfigureAwait(false);

        // Reloads any tracked copy of this row so its AuthHeaderValueEncrypted reflects the raw-SQL write.
        var tracked = this.db.ChangeTracker.Entries<AgentEntity>().FirstOrDefault(e => e.Entity.Id == id);
        if (tracked is not null)
        {
            await tracked.ReloadAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task ClearAuthHeaderValueAsync(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        await this.db.Database.ExecuteSqlInterpolatedAsync(
            $@"UPDATE agents
               SET auth_header_value_encrypted = NULL,
                   updated_at = {now}
               WHERE id = {id} AND user_id = {userId}",
            cancellationToken).ConfigureAwait(false);

        var tracked = this.db.ChangeTracker.Entries<AgentEntity>().FirstOrDefault(e => e.Entity.Id == id);
        if (tracked is not null)
        {
            await tracked.ReloadAsync(cancellationToken).ConfigureAwait(false);
        }
    }
}
