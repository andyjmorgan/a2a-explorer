// <copyright file="Program.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Asp.Versioning;
using DonkeyWork.A2AExplorer.Agents.Api;
using DonkeyWork.A2AExplorer.Api;
using DonkeyWork.A2AExplorer.Identity.Api;
using DonkeyWork.A2AExplorer.Persistence;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1.0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
    });

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());

        // Speak the A2A protocol's lowercase role values on our wire, even though the A2A SDK's
        // Role enum serialises as ROLE_USER/ROLE_AGENT internally.
        options.JsonSerializerOptions.Converters.Add(new RoleJsonConverter());
    });

builder.Services.AddHttpClient();

builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddIdentityApi(builder.Configuration);
builder.Services.AddAgentsApi(builder.Configuration);

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("a2a-outbound", httpContext =>
    {
        var partitionKey = httpContext.User?.Identity?.IsAuthenticated == true
            ? httpContext.User.FindFirst("sub")?.Value ?? "anonymous"
            : httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();
app.MapFallbackToFile("index.html");

using (var scope = app.Services.CreateScope())
{
    var migrationService = scope.ServiceProvider.GetRequiredService<IMigrationService>();
    await migrationService.MigrateAsync().ConfigureAwait(false);
}

await app.RunAsync().ConfigureAwait(false);

/// <summary>
/// Entry point for the A2A Explorer API host. Declared as a partial public class so integration
/// tests can bootstrap it via WebApplicationFactory from Microsoft.AspNetCore.Mvc.Testing.
/// </summary>
public partial class Program
{
}
