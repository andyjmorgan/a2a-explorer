// <copyright file="AgentA2AControllerTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using A2A;
using DonkeyWork.A2AExplorer.Agents.Api.Controllers;
using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Contracts.Models;
using DonkeyWork.A2AExplorer.Agents.Core;
using DonkeyWork.A2AExplorer.Agents.Core.Internal;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Api.Tests.Controllers;

/// <summary>Unit tests for <see cref="AgentA2AController"/>'s non-streaming endpoints.</summary>
public sealed class AgentA2AControllerTests
{
    /// <summary>GET card returns 200 with the agent card for a saved agent.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetCard_OwnedAgent_ReturnsOkWithCard()
    {
        // Arrange
        var card = BuildCard();
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.FetchCardForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(card);
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.GetCard(Guid.NewGuid(), CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(card, ok.Value);
    }

    /// <summary>GET card returns 404 when the saved agent is not owned by the user.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetCard_UnknownAgent_ReturnsNotFound()
    {
        // Arrange
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.FetchCardForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AgentCard?)null);
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.GetCard(Guid.NewGuid(), CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    /// <summary>GET card returns 403 when SSRF rejects the outbound URL.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetCard_SsrfReject_Returns403()
    {
        // Arrange
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.FetchCardForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new SsrfRejectedException(new Uri("https://192.168.1.1"), SsrfResult.PrivateAddress));
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.GetCard(Guid.NewGuid(), CancellationToken.None);

        // Assert
        var obj = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, obj.StatusCode);
    }

    /// <summary>GET card returns 502 when the upstream fetch fails.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetCard_UpstreamError_Returns502()
    {
        // Arrange
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.FetchCardForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.GetCard(Guid.NewGuid(), CancellationToken.None);

        // Assert
        var obj = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, obj.StatusCode);
    }

    /// <summary>test-connection returns 400 when the body has a malformed URL.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task TestConnection_InvalidUrl_ReturnsBadRequest()
    {
        // Arrange
        var controller = new AgentA2AController(Mock.Of<IA2AOutboundFactory>(), Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.TestConnection(
            new TestConnectionRequestV1 { BaseUrl = "not a url" },
            CancellationToken.None);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    /// <summary>test-connection returns 200 on success.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task TestConnection_ValidUrl_ReturnsOkWithCard()
    {
        // Arrange
        var card = BuildCard();
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.FetchCardForUrlAsync(
                It.IsAny<Uri>(),
                It.IsAny<OutboundAuthHeader?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(card);
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.TestConnection(
            new TestConnectionRequestV1 { BaseUrl = "https://example.com", AuthHeaderName = "X-API-Key", AuthHeaderValue = "v" },
            CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(card, ok.Value);
    }

    /// <summary>test-connection returns 403 when SSRF rejects.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task TestConnection_SsrfReject_Returns403()
    {
        // Arrange
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.FetchCardForUrlAsync(
                It.IsAny<Uri>(),
                It.IsAny<OutboundAuthHeader?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new SsrfRejectedException(new Uri("https://10.0.0.1"), SsrfResult.PrivateAddress));
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.TestConnection(
            new TestConnectionRequestV1 { BaseUrl = "https://10.0.0.1" },
            CancellationToken.None);

        // Assert
        var obj = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, obj.StatusCode);
    }

    /// <summary>SendMessage returns 404 when the saved agent is not owned.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task SendMessage_UnknownAgent_ReturnsNotFound()
    {
        // Arrange
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.CreateClientForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IA2AClient?)null);
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.SendMessage(Guid.NewGuid(), new SendMessageRequest(), CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    /// <summary>SendMessage returns 200 with the SDK response and fires TouchLastUsedAsync.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task SendMessage_OwnedAgent_ReturnsOkAndTouchesLastUsed()
    {
        // Arrange
        var agentId = Guid.NewGuid();
        var sdkResponse = new SendMessageResponse { Message = new Message { MessageId = "m1", Role = Role.Agent } };
        var a2aClient = new Mock<IA2AClient>();
        a2aClient.Setup(c => c.SendMessageAsync(It.IsAny<SendMessageRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(sdkResponse);
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.CreateClientForSavedAgentAsync(agentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(a2aClient.Object);
        var agents = new Mock<IAgentService>();
        var controller = new AgentA2AController(outbound.Object, agents.Object, Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.SendMessage(agentId, new SendMessageRequest(), CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(sdkResponse, ok.Value);
        agents.Verify(s => s.TouchLastUsedAsync(agentId, It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>GetTask returns 200 with the SDK task and touches LastUsedAt for an owned agent.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetTask_returns_200_with_task_when_agent_owned()
    {
        // Arrange
        var agentId = Guid.NewGuid();
        var task = new AgentTask { Id = "t-1", ContextId = "c-1" };
        var a2aClient = new Mock<IA2AClient>();
        a2aClient.Setup(c => c.GetTaskAsync(It.Is<GetTaskRequest>(r => r.Id == "t-1"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(task);
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.CreateClientForSavedAgentAsync(agentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(a2aClient.Object);
        var agents = new Mock<IAgentService>();
        var controller = new AgentA2AController(outbound.Object, agents.Object, Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.GetTask(agentId, "t-1", CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(task, ok.Value);
        agents.Verify(s => s.TouchLastUsedAsync(agentId, It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>GetTask returns 404 when the saved agent is not owned by the user.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetTask_returns_404_when_agent_not_owned()
    {
        // Arrange
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.CreateClientForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IA2AClient?)null);
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.GetTask(Guid.NewGuid(), "t-1", CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    /// <summary>GetTask returns 502 when the upstream call fails.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task GetTask_returns_502_on_upstream_failure()
    {
        // Arrange
        var a2aClient = new Mock<IA2AClient>();
        a2aClient.Setup(c => c.GetTaskAsync(It.IsAny<GetTaskRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.CreateClientForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(a2aClient.Object);
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.GetTask(Guid.NewGuid(), "t-1", CancellationToken.None);

        // Assert
        var obj = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, obj.StatusCode);
    }

    /// <summary>CancelTask returns 200 with the updated task and touches LastUsedAt.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task CancelTask_returns_200_with_updated_task()
    {
        // Arrange
        var agentId = Guid.NewGuid();
        var task = new AgentTask { Id = "t-1", ContextId = "c-1" };
        var a2aClient = new Mock<IA2AClient>();
        a2aClient.Setup(c => c.CancelTaskAsync(It.Is<CancelTaskRequest>(r => r.Id == "t-1"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(task);
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.CreateClientForSavedAgentAsync(agentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(a2aClient.Object);
        var agents = new Mock<IAgentService>();
        var controller = new AgentA2AController(outbound.Object, agents.Object, Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.CancelTask(agentId, "t-1", CancellationToken.None);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(task, ok.Value);
        agents.Verify(s => s.TouchLastUsedAsync(agentId, It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>CancelTask returns 404 when the saved agent is not owned by the user.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task CancelTask_returns_404_when_agent_not_owned()
    {
        // Arrange
        var outbound = new Mock<IA2AOutboundFactory>();
        outbound.Setup(f => f.CreateClientForSavedAgentAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IA2AClient?)null);
        var controller = new AgentA2AController(outbound.Object, Mock.Of<IAgentService>(), Mock.Of<ILogger<AgentA2AController>>());

        // Act
        var result = await controller.CancelTask(Guid.NewGuid(), "t-1", CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    private static AgentCard BuildCard() => new()
    {
        Name = "sample",
        Description = "sample",
        Version = "1.0.0",
        DefaultInputModes = new List<string> { "text/plain" },
        DefaultOutputModes = new List<string> { "text/plain" },
        Skills = new List<AgentSkill>(),
    };
}
