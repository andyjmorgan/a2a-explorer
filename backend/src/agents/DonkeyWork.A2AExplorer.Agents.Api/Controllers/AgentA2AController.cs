// <copyright file="AgentA2AController.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using A2A;
using Asp.Versioning;
using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Contracts.Models;
using DonkeyWork.A2AExplorer.Agents.Core;
using DonkeyWork.A2AExplorer.Agents.Core.Internal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DonkeyWork.A2AExplorer.Agents.Api.Controllers;

/// <summary>
/// First-party REST + SSE surface for the A2A protocol. The browser never talks to an external A2A
/// agent directly — it calls these endpoints; the backend uses the A2A SDK to talk to the agent,
/// injects the stored (decrypted) auth header, and relays streaming responses.
/// </summary>
[ApiController]
[ApiVersion(1.0)]
[Route("api/v{version:apiVersion}/agents")]
[Authorize]
[Produces("application/json")]
[Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("a2a-outbound")]
public sealed class AgentA2AController : ControllerBase
{
    private readonly IA2AOutboundFactory outboundFactory;
    private readonly IAgentService agentService;

    /// <summary>
    /// Initializes a new instance of the <see cref="AgentA2AController"/> class.
    /// </summary>
    /// <param name="outboundFactory">Builds the SDK's <see cref="IA2AClient"/> for a saved agent.</param>
    /// <param name="agentService">Used to touch LastUsedAt after successful forwards.</param>
    public AgentA2AController(IA2AOutboundFactory outboundFactory, IAgentService agentService)
    {
        this.outboundFactory = outboundFactory;
        this.agentService = agentService;
    }

    /// <summary>Fetches the agent card for a saved agent owned by the current user.</summary>
    /// <param name="id">The saved agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 with the card; 404 if not owned; 403 on SSRF reject; 502 on upstream failure.</returns>
    [HttpGet("{id:guid}/card")]
    [ProducesResponseType(typeof(AgentCard), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> GetCard(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var card = await this.outboundFactory.FetchCardForSavedAgentAsync(id, cancellationToken);
            return card is null ? this.NotFound() : this.Ok(card);
        }
        catch (SsrfRejectedException ex)
        {
            return this.StatusCode(StatusCodes.Status403Forbidden, new { error = "ssrf_rejected", reason = ex.Reason.ToString() });
        }
        catch (HttpRequestException ex)
        {
            return this.StatusCode(StatusCodes.Status502BadGateway, new { error = "upstream_unreachable", message = ex.Message });
        }
    }

    /// <summary>
    /// Probes an unsaved agent at a caller-supplied base URL. The only endpoint that accepts an
    /// outbound URL from the client; SSRF-validated, no persistence.
    /// </summary>
    /// <param name="request">The probe payload.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 with the agent card; 400/403/502 on failure.</returns>
    [HttpPost("test-connection")]
    [ProducesResponseType(typeof(AgentCard), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> TestConnection([FromBody] TestConnectionRequestV1 request, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(request.BaseUrl, UriKind.Absolute, out var baseUrl))
        {
            return this.BadRequest(new { error = "invalid_url" });
        }

        OutboundAuthHeader? auth = null;
        if (!string.IsNullOrEmpty(request.AuthHeaderName) && !string.IsNullOrEmpty(request.AuthHeaderValue))
        {
            auth = new OutboundAuthHeader(request.AuthHeaderName, request.AuthHeaderValue);
        }

        try
        {
            var card = await this.outboundFactory.FetchCardForUrlAsync(baseUrl, auth, cancellationToken);
            return this.Ok(card);
        }
        catch (SsrfRejectedException ex)
        {
            return this.StatusCode(StatusCodes.Status403Forbidden, new { error = "ssrf_rejected", reason = ex.Reason.ToString() });
        }
        catch (HttpRequestException ex)
        {
            return this.StatusCode(StatusCodes.Status502BadGateway, new { error = "upstream_unreachable", message = ex.Message });
        }
    }

    /// <summary>Sends a message synchronously; returns the SDK's envelope (Task or Message payload).</summary>
    /// <param name="id">The saved agent identifier.</param>
    /// <param name="request">The SDK's send-message request.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 on success, 404 when not owned, 403/502 on transport failures.</returns>
    [HttpPost("{id:guid}/messages")]
    [ProducesResponseType(typeof(SendMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var client = await this.outboundFactory.CreateClientForSavedAgentAsync(id, cancellationToken);
            if (client is null)
            {
                return this.NotFound();
            }

            var response = await client.SendMessageAsync(request, cancellationToken);
            await this.agentService.TouchLastUsedAsync(id, CancellationToken.None).ConfigureAwait(false);
            return this.Ok(response);
        }
        catch (SsrfRejectedException ex)
        {
            return this.StatusCode(StatusCodes.Status403Forbidden, new { error = "ssrf_rejected", reason = ex.Reason.ToString() });
        }
        catch (HttpRequestException ex)
        {
            return this.StatusCode(StatusCodes.Status502BadGateway, new { error = "upstream_unreachable", message = ex.Message });
        }
    }
}
