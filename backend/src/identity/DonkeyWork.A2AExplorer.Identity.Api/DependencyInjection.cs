// <copyright file="DependencyInjection.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Security.Claims;
using DonkeyWork.A2AExplorer.Identity.Contracts;
using DonkeyWork.A2AExplorer.Identity.Core;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace DonkeyWork.A2AExplorer.Identity.Api;

/// <summary>DI wiring for the identity module — Keycloak options, JWT bearer, and IdentityContext.</summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers <see cref="KeycloakOptions"/>, the JwtBearer authentication scheme, and the scoped
    /// <see cref="IdentityContext"/> (plus its <see cref="IIdentityContext"/> facade).
    /// </summary>
    /// <param name="services">The service collection to extend.</param>
    /// <param name="configuration">Configuration source containing the Keycloak section.</param>
    /// <returns>The same service collection for chaining.</returns>
    public static IServiceCollection AddIdentityApi(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<KeycloakOptions>()
            .Bind(configuration.GetSection(KeycloakOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        var options = configuration.GetSection(KeycloakOptions.SectionName).Get<KeycloakOptions>()
            ?? throw new InvalidOperationException(
                $"Missing configuration section '{KeycloakOptions.SectionName}'.");

        var effectiveClientId = !string.IsNullOrEmpty(options.ClientId) ? options.ClientId : options.Audience;

        services.AddScoped<IdentityContext>();
        services.AddScoped<IIdentityContext>(sp => sp.GetRequiredService<IdentityContext>());

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, jwt =>
            {
                jwt.Authority = options.Authority;
                jwt.Audience = options.Audience;
                jwt.RequireHttpsMetadata = options.RequireHttpsMetadata;

                // Keycloak's 'sub' claim is the user id; surface it as NameIdentifier.
                jwt.MapInboundClaims = false;

                jwt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = options.Authority,
                    ValidateAudience = true,
                    AudienceValidator = (audiences, securityToken, _) =>
                    {
                        // Keycloak leaves aud as ["account"] by default and puts the caller's
                        // client id in azp (authorized party). Accept a match on either claim
                        // against the configured Audience or ClientId.
                        var expected = options.Audience;
                        if (audiences.Any(a => string.Equals(a, expected, StringComparison.Ordinal))
                            || audiences.Any(a => string.Equals(a, effectiveClientId, StringComparison.Ordinal)))
                        {
                            return true;
                        }

                        if (securityToken is JsonWebToken jwtToken)
                        {
                            var azp = jwtToken.GetPayloadValue<string?>("azp");
                            if (!string.IsNullOrEmpty(azp)
                                && (string.Equals(azp, expected, StringComparison.Ordinal)
                                    || string.Equals(azp, effectiveClientId, StringComparison.Ordinal)))
                            {
                                return true;
                            }
                        }

                        return false;
                    },
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    NameClaimType = "sub",
                    RoleClaimType = "roles",
                };

                jwt.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        var logger = context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("JwtBearer.OnTokenValidated");

                        var subClaim = context.Principal?.FindFirst("sub")?.Value
                            ?? context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                        if (string.IsNullOrEmpty(subClaim) || !Guid.TryParse(subClaim, out var userId))
                        {
                            logger.LogWarning("Rejecting token: 'sub' claim is missing or not a GUID ({Sub})", subClaim);
                            context.Fail("Token 'sub' claim missing or not a GUID.");
                            return Task.CompletedTask;
                        }

                        var email = context.Principal?.FindFirst("email")?.Value;
                        var name = context.Principal?.FindFirst("name")?.Value;
                        var username = context.Principal?.FindFirst("preferred_username")?.Value;

                        var identityContext = context.HttpContext.RequestServices
                            .GetRequiredService<IdentityContext>();
                        identityContext.SetIdentity(userId, email, name, username);
                        return Task.CompletedTask;
                    },
                };
            });

        services.AddAuthorization();

        return services;
    }
}
