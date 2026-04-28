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
using Microsoft.Extensions.Logging;

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
    private readonly ILogger<AgentA2AController> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AgentA2AController"/> class.
    /// </summary>
    /// <param name="outboundFactory">Builds the SDK's <see cref="IA2AClient"/> for a saved agent.</param>
    /// <param name="agentService">Used to touch LastUsedAt after successful forwards.</param>
    /// <param name="logger">Logs the full exception when surfacing structured 5xx bodies.</param>
    public AgentA2AController(
        IA2AOutboundFactory outboundFactory,
        IAgentService agentService,
        ILogger<AgentA2AController> logger)
    {
        this.outboundFactory = outboundFactory;
        this.agentService = agentService;
        this.logger = logger;
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
            this.logger.LogWarning(ex, "Card fetch failed for agent {AgentId}", id);
            return this.StatusCode(StatusCodes.Status502BadGateway, BuildErrorBody("upstream_unreachable", ex));
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error fetching card for agent {AgentId}", id);
            return this.StatusCode(StatusCodes.Status500InternalServerError, BuildErrorBody("internal_error", ex));
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
            this.logger.LogWarning(ex, "Test-connection card fetch failed for {BaseUrl}", baseUrl);
            return this.StatusCode(StatusCodes.Status502BadGateway, BuildErrorBody("upstream_unreachable", ex));
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error in test-connection for {BaseUrl}", baseUrl);
            return this.StatusCode(StatusCodes.Status500InternalServerError, BuildErrorBody("internal_error", ex));
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
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            this.logger.LogWarning(ex, "Outbound A2A request timed out for agent {AgentId}", id);
            return this.StatusCode(StatusCodes.Status504GatewayTimeout, BuildErrorBody("upstream_timeout", ex));
        }
        catch (HttpRequestException ex)
        {
            this.logger.LogWarning(ex, "Outbound A2A request failed for agent {AgentId}", id);
            return this.StatusCode(StatusCodes.Status502BadGateway, BuildErrorBody("upstream_unreachable", ex));
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error sending message to agent {AgentId}", id);
            return this.StatusCode(StatusCodes.Status500InternalServerError, BuildErrorBody("internal_error", ex));
        }
    }

    /// <summary>Fetches a single task by ID for a saved agent owned by the caller.</summary>
    /// <param name="id">The saved agent identifier.</param>
    /// <param name="taskId">The remote A2A task identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 with the task; 404 when not owned or task missing; 403/502/504 on transport failures.</returns>
    [HttpGet("{id:guid}/tasks/{taskId}")]
    [ProducesResponseType(typeof(AgentTask), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> GetTask(Guid id, string taskId, CancellationToken cancellationToken)
    {
        try
        {
            var client = await this.outboundFactory.CreateClientForSavedAgentAsync(id, cancellationToken);
            if (client is null)
            {
                return this.NotFound();
            }

            var task = await client.GetTaskAsync(new GetTaskRequest { Id = taskId }, cancellationToken);
            await this.agentService.TouchLastUsedAsync(id, CancellationToken.None).ConfigureAwait(false);
            return this.Ok(task);
        }
        catch (SsrfRejectedException ex)
        {
            return this.StatusCode(StatusCodes.Status403Forbidden, new { error = "ssrf_rejected", reason = ex.Reason.ToString() });
        }
        catch (A2AException ex) when (ex.ErrorCode == A2AErrorCode.TaskNotFound)
        {
            return this.NotFound();
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            this.logger.LogWarning(ex, "Outbound A2A get-task timed out for agent {AgentId} task {TaskId}", id, taskId);
            return this.StatusCode(StatusCodes.Status504GatewayTimeout, BuildErrorBody("upstream_timeout", ex));
        }
        catch (HttpRequestException ex)
        {
            this.logger.LogWarning(ex, "Outbound A2A get-task failed for agent {AgentId} task {TaskId}", id, taskId);
            return this.StatusCode(StatusCodes.Status502BadGateway, BuildErrorBody("upstream_unreachable", ex));
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error fetching task {TaskId} for agent {AgentId}", taskId, id);
            return this.StatusCode(StatusCodes.Status500InternalServerError, BuildErrorBody("internal_error", ex));
        }
    }

    /// <summary>
    /// Cancels a task on the remote agent. Cancel is asynchronous on the agent side, so the returned
    /// task may still be in <c>working</c> state — the frontend re-polls via <see cref="GetTask"/>.
    /// </summary>
    /// <param name="id">The saved agent identifier.</param>
    /// <param name="taskId">The remote A2A task identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 with the (possibly still-working) task; 404 when not owned or task missing; 403/502/504 on transport failures.</returns>
    [HttpPost("{id:guid}/tasks/{taskId}/cancel")]
    [ProducesResponseType(typeof(AgentTask), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> CancelTask(Guid id, string taskId, CancellationToken cancellationToken)
    {
        try
        {
            var client = await this.outboundFactory.CreateClientForSavedAgentAsync(id, cancellationToken);
            if (client is null)
            {
                return this.NotFound();
            }

            var task = await client.CancelTaskAsync(new CancelTaskRequest { Id = taskId }, cancellationToken);
            await this.agentService.TouchLastUsedAsync(id, CancellationToken.None).ConfigureAwait(false);
            return this.Ok(task);
        }
        catch (SsrfRejectedException ex)
        {
            return this.StatusCode(StatusCodes.Status403Forbidden, new { error = "ssrf_rejected", reason = ex.Reason.ToString() });
        }
        catch (A2AException ex) when (ex.ErrorCode == A2AErrorCode.TaskNotFound)
        {
            return this.NotFound();
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            this.logger.LogWarning(ex, "Outbound A2A cancel-task timed out for agent {AgentId} task {TaskId}", id, taskId);
            return this.StatusCode(StatusCodes.Status504GatewayTimeout, BuildErrorBody("upstream_timeout", ex));
        }
        catch (HttpRequestException ex)
        {
            this.logger.LogWarning(ex, "Outbound A2A cancel-task failed for agent {AgentId} task {TaskId}", id, taskId);
            return this.StatusCode(StatusCodes.Status502BadGateway, BuildErrorBody("upstream_unreachable", ex));
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error cancelling task {TaskId} for agent {AgentId}", taskId, id);
            return this.StatusCode(StatusCodes.Status500InternalServerError, BuildErrorBody("internal_error", ex));
        }
    }

    private static object BuildErrorBody(string code, Exception ex)
    {
        var inner = ex.InnerException;
        return new
        {
            error = code,
            type = ex.GetType().FullName,
            message = ex.Message,
            innerType = inner?.GetType().FullName,
            innerMessage = inner?.Message,
        };
    }
}
