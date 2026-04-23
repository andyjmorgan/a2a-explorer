// <copyright file="DependencyInjection.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Persistence.Interceptors;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DonkeyWork.A2AExplorer.Persistence;

/// <summary>DI wiring for the persistence module.</summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers the DbContext, <see cref="AuditableInterceptor"/>, and <see cref="IMigrationService"/>.
    /// Connection string is bound from the <c>Persistence</c> configuration section.
    /// </summary>
    /// <param name="services">The service collection to extend.</param>
    /// <param name="configuration">Configuration source for the Persistence section.</param>
    /// <returns>The same service collection for chaining.</returns>
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<PersistenceOptions>()
            .Bind(configuration.GetSection(PersistenceOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        var connectionString = configuration.GetSection(PersistenceOptions.SectionName)
            .Get<PersistenceOptions>()?.ConnectionString
            ?? throw new InvalidOperationException(
                $"Missing configuration value '{PersistenceOptions.SectionName}:{nameof(PersistenceOptions.ConnectionString)}'.");

        services.AddSingleton<AuditableInterceptor>();

        services.AddDbContext<A2AExplorerDbContext>((serviceProvider, dbContextOptions) =>
        {
            var interceptor = serviceProvider.GetRequiredService<AuditableInterceptor>();

            dbContextOptions
                .UseNpgsql(connectionString, npgsql =>
                {
                    npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "public");
                    npgsql.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(10),
                        errorCodesToAdd: null);
                })
                .AddInterceptors(interceptor);
        });

        services.AddScoped<IMigrationService, MigrationService>();

        return services;
    }
}
