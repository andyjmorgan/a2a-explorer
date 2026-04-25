// <copyright file="AuditableInterceptor.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Persistence.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace DonkeyWork.A2AExplorer.Persistence.Interceptors;

/// <summary>
/// Populates <see cref="IAuditable.CreatedAt"/> and <see cref="IAuditable.UpdatedAt"/> on every
/// <c>SaveChanges</c>/<c>SaveChangesAsync</c> call. Registered as a singleton; safe across scopes
/// because it holds no state.
/// </summary>
public sealed class AuditableInterceptor : SaveChangesInterceptor
{
    /// <inheritdoc />
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyTimestamps(eventData);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    /// <inheritdoc />
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplyTimestamps(eventData);
        return base.SavingChanges(eventData, result);
    }

    private static void ApplyTimestamps(DbContextEventData eventData)
    {
        if (eventData.Context is null)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;

        foreach (var entry in eventData.Context.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
