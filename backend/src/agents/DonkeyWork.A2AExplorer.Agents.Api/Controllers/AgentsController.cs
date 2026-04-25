// <copyright file="AgentsController.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using Asp.Versioning;
using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Contracts.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DonkeyWork.A2AExplorer.Agents.Api.Controllers;

/// <summary>CRUD surface for saved A2A agents. Scoped to the authenticated user by the DbContext filter.</summary>
[ApiController]
[ApiVersion(1.0)]
[Route("api/v{version:apiVersion}/agents")]
[Authorize]
[Produces("application/json")]
public sealed class AgentsController : ControllerBase
{
    private readonly IAgentService agentService;

    /// <summary>
    /// Initializes a new instance of the <see cref="AgentsController"/> class.
    /// </summary>
    /// <param name="agentService">The scoped agents service.</param>
    public AgentsController(IAgentService agentService)
    {
        this.agentService = agentService;
    }

    /// <summary>Creates a new saved agent owned by the current user.</summary>
    /// <param name="request">The create payload.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>201 with the created agent's details, or 400 on validation failure.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(AgentDetailsV1), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] CreateAgentRequestV1 request, CancellationToken cancellationToken)
    {
        var result = await this.agentService.CreateAsync(request, cancellationToken);
        return this.CreatedAtAction(nameof(this.Get), new { version = "1", id = result.Id }, result);
    }

    /// <summary>Fetches a single saved agent by id.</summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 with the details, or 404 when not found for the current user.</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AgentDetailsV1), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await this.agentService.GetByIdAsync(id, cancellationToken);
        return result is null ? this.NotFound() : this.Ok(result);
    }

    /// <summary>Lists every saved agent owned by the current user.</summary>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 with the summary list (possibly empty).</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AgentSummaryV1>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await this.agentService.ListAsync(cancellationToken);
        return this.Ok(result);
    }

    /// <summary>Updates a saved agent. Only provided (non-null) fields are applied.</summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="request">The update payload.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>200 with the updated details, or 404 when not found for the current user.</returns>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AgentDetailsV1), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAgentRequestV1 request, CancellationToken cancellationToken)
    {
        var result = await this.agentService.UpdateAsync(id, request, cancellationToken);
        return result is null ? this.NotFound() : this.Ok(result);
    }

    /// <summary>Deletes a saved agent.</summary>
    /// <param name="id">The agent identifier.</param>
    /// <param name="cancellationToken">Propagates a cancellation signal.</param>
    /// <returns>204 on success, 404 when not found for the current user.</returns>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await this.agentService.DeleteAsync(id, cancellationToken);
        return deleted ? this.NoContent() : this.NotFound();
    }
}
