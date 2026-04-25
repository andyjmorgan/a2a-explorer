// <copyright file="DependencyInjection.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Core;
using DonkeyWork.A2AExplorer.Agents.Core.Internal;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DonkeyWork.A2AExplorer.Agents.Api;

/// <summary>DI wiring for the agents module.</summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers <see cref="SecurityOptions"/> (validated on start), the <see cref="IAgentService"/>
    /// implementation, the <see cref="IA2AOutboundFactory"/>, and the SSRF-guarded named HttpClient
    /// used for outbound A2A protocol calls.
    /// </summary>
    /// <param name="services">The service collection to extend.</param>
    /// <param name="configuration">Configuration source for the Security section.</param>
    /// <returns>The same service collection for chaining.</returns>
    public static IServiceCollection AddAgentsApi(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SecurityOptions>()
            .Bind(configuration.GetSection(SecurityOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddScoped<IAgentService, AgentService>();
        services.AddScoped<IA2AOutboundFactory, A2AOutboundFactory>();

        services.AddTransient<SsrfValidatingHandler>();
        services.AddHttpClient(A2AOutboundFactory.HttpClientName, http =>
            {
                // Agents routinely run multi-step LLM/tool chains; 30s was killing
                // legitimate calls. 10 minutes is the synchronous send-message ceiling
                // until streaming lands.
                http.Timeout = TimeSpan.FromMinutes(10);
            })
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
            {
                AllowAutoRedirect = false,
            })
            .AddHttpMessageHandler<SsrfValidatingHandler>();

        return services;
    }
}
