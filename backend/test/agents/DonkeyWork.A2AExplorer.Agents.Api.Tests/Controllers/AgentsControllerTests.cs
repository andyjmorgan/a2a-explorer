// <copyright file="AgentsControllerTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Agents.Api.Controllers;
using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Contracts.Models;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Api.Tests.Controllers;

/// <summary>Unit tests for <see cref="AgentsController"/> — verbs map to the service and return the right action results.</summary>
public sealed class AgentsControllerTests
{
    /// <summary>POST returns 201 Created with the created details and a Location header pointing at the GET action.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task Create_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var id = Guid.NewGuid();
        var details = BuildDetails(id);
        var service = new Mock<IAgentService>();
        service.Setup(s => s.CreateAsync(It.IsAny<CreateAgentRequestV1>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.Create(
            new CreateAgentRequestV1 { Name = "n", BaseUrl = "https://a.example.test" },
            CancellationToken.None);

        // Assert
        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(AgentsController.Get), created.ActionName);
        Assert.Same(details, created.Value);
    }

    /// <summary>GET with a known id returns 200 OK with the details.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task Get_ExistingId_ReturnsOk()
    {
        // Arrange
        var id = Guid.NewGuid();
        var details = BuildDetails(id);
        var service = new Mock<IAgentService>();
        service.Setup(s => s.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(details);
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.Get(id, CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(details, ok.Value);
    }

    /// <summary>GET with an unknown id returns 404 Not Found.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task Get_UnknownId_ReturnsNotFound()
    {
        // Arrange
        var service = new Mock<IAgentService>();
        service.Setup(s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((AgentDetailsV1?)null);
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.Get(Guid.NewGuid(), CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    /// <summary>LIST returns 200 OK with the service's list (possibly empty).</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task List_ReturnsOkWithSummaries()
    {
        // Arrange
        var service = new Mock<IAgentService>();
        service.Setup(s => s.ListAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<AgentSummaryV1>());
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.List(CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IReadOnlyList<AgentSummaryV1>>(ok.Value);
        Assert.Empty(list);
    }

    /// <summary>PUT with a known id returns 200 OK with the updated details.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task Update_ExistingId_ReturnsOk()
    {
        // Arrange
        var id = Guid.NewGuid();
        var details = BuildDetails(id);
        var service = new Mock<IAgentService>();
        service.Setup(s => s.UpdateAsync(id, It.IsAny<UpdateAgentRequestV1>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.Update(id, new UpdateAgentRequestV1 { Name = "renamed" }, CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(details, ok.Value);
    }

    /// <summary>PUT against an unknown id returns 404 Not Found.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task Update_UnknownId_ReturnsNotFound()
    {
        // Arrange
        var service = new Mock<IAgentService>();
        service.Setup(s => s.UpdateAsync(It.IsAny<Guid>(), It.IsAny<UpdateAgentRequestV1>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AgentDetailsV1?)null);
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.Update(Guid.NewGuid(), new UpdateAgentRequestV1 { Name = "x" }, CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    /// <summary>DELETE against an owned id returns 204 No Content.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task Delete_ExistingId_ReturnsNoContent()
    {
        // Arrange
        var service = new Mock<IAgentService>();
        service.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.Delete(Guid.NewGuid(), CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    /// <summary>DELETE against an unknown or unowned id returns 404 Not Found.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task Delete_UnknownId_ReturnsNotFound()
    {
        // Arrange
        var service = new Mock<IAgentService>();
        service.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var controller = new AgentsController(service.Object);

        // Act
        var result = await controller.Delete(Guid.NewGuid(), CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    private static AgentDetailsV1 BuildDetails(Guid id) => new()
    {
        Id = id,
        Name = "sample",
        BaseUrl = "https://agent.example.test",
        AuthMode = AgentAuthMode.None,
        AuthHeaderName = null,
        HasAuthHeaderValue = false,
        CreatedAt = DateTimeOffset.UtcNow,
    };
}
