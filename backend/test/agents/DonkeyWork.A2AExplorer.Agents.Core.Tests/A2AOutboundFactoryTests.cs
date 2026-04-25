// <copyright file="A2AOutboundFactoryTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Net;
using System.Text;
using DonkeyWork.A2AExplorer.Agents.Contracts;
using DonkeyWork.A2AExplorer.Agents.Contracts.Models;
using DonkeyWork.A2AExplorer.Agents.Core;
using DonkeyWork.A2AExplorer.Agents.Core.Internal;
using DonkeyWork.A2AExplorer.Agents.Core.Tests.Fakes;
using Moq;
using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests;

/// <summary>Unit tests for <see cref="A2AOutboundFactory"/>.</summary>
public sealed class A2AOutboundFactoryTests
{
    private const string SampleCardJson = """
    {
      "name": "sample",
      "description": "sample agent",
      "version": "1.0.0",
      "url": "https://agent.example.test/rpc",
      "preferredTransport": "JSONRPC",
      "supportedInterfaces": [
        { "url": "https://agent.example.test/rpc", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }
      ],
      "capabilities": { "streaming": true, "pushNotifications": false },
      "defaultInputModes": ["text/plain"],
      "defaultOutputModes": ["text/plain"],
      "skills": []
    }
    """;

    /// <summary>Fetching a saved agent's card attaches the decrypted auth header to the outbound request.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task FetchCardForSavedAgentAsync_AttachesAuthHeaderToOutboundCall()
    {
        // Arrange
        var agentId = Guid.NewGuid();
        var agentService = new Mock<IAgentService>();
        agentService.Setup(s => s.GetByIdAsync(agentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AgentDetailsV1
            {
                Id = agentId,
                Name = "sample",
                BaseUrl = "https://agent.example.test",
                AuthMode = AgentAuthMode.Header,
                HasAuthHeaderValue = true,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        agentService.Setup(s => s.ResolveAuthHeaderAsync(agentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OutboundAuthHeader("X-API-Key", "secret-value"));

        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(SampleCardJson, Encoding.UTF8, "application/json"),
        });
        var factory = BuildFactory(agentService.Object, handler);

        // Act
        var card = await factory.FetchCardForSavedAgentAsync(agentId);

        // Assert
        Assert.NotNull(card);
        Assert.Equal("sample", card!.Name);
        Assert.Single(handler.Requests);
        Assert.True(handler.Requests[0].Headers.TryGetValues("X-API-Key", out var values));
        Assert.Equal("secret-value", values!.Single());
        Assert.EndsWith("/.well-known/agent-card.json", handler.Requests[0].RequestUri!.AbsolutePath);
    }

    /// <summary>Fetching returns null when the saved agent is not owned by the current user.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task FetchCardForSavedAgentAsync_UnknownAgent_ReturnsNull()
    {
        // Arrange
        var agentService = new Mock<IAgentService>();
        agentService.Setup(s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AgentDetailsV1?)null);
        var handler = new StubHttpMessageHandler(_ => throw new InvalidOperationException("unexpected"));
        var factory = BuildFactory(agentService.Object, handler);

        // Act
        var card = await factory.FetchCardForSavedAgentAsync(Guid.NewGuid());

        // Assert
        Assert.Null(card);
        Assert.Empty(handler.Requests);
    }

    /// <summary>test-connection style call does not require a saved agent and honours the supplied auth.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task FetchCardForUrlAsync_AttachesSuppliedAuthHeader()
    {
        // Arrange
        var agentService = new Mock<IAgentService>();
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(SampleCardJson, Encoding.UTF8, "application/json"),
        });
        var factory = BuildFactory(agentService.Object, handler);

        // Act
        var card = await factory.FetchCardForUrlAsync(
            new Uri("https://agent.example.test"),
            new OutboundAuthHeader("X-API-Key", "wizard-value"));

        // Assert
        Assert.Equal("sample", card.Name);
        Assert.True(handler.Requests[0].Headers.TryGetValues("X-API-Key", out var values));
        Assert.Equal("wizard-value", values!.Single());
    }

    /// <summary>A private-IP URL is rejected by the SsrfValidatingHandler before reaching the stub.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task FetchCardForUrlAsync_PrivateUrl_ThrowsSsrfRejected()
    {
        // Arrange
        var agentService = new Mock<IAgentService>();
        var handler = new StubHttpMessageHandler(_ => throw new InvalidOperationException("unexpected"));
        var factory = BuildFactory(agentService.Object, handler);

        // Act + Assert
        var ex = await Assert.ThrowsAsync<SsrfRejectedException>(() =>
            factory.FetchCardForUrlAsync(new Uri("https://192.168.1.1"), null));
        Assert.Equal(SsrfResult.PrivateAddress, ex.Reason);
        Assert.Empty(handler.Requests);
    }

    /// <summary>CreateClientForSavedAgentAsync returns null for a non-existent agent.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task CreateClientForSavedAgentAsync_UnknownAgent_ReturnsNull()
    {
        // Arrange
        var agentService = new Mock<IAgentService>();
        agentService.Setup(s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AgentDetailsV1?)null);
        var handler = new StubHttpMessageHandler(_ => throw new InvalidOperationException("unexpected"));
        var factory = BuildFactory(agentService.Object, handler);

        // Act
        var client = await factory.CreateClientForSavedAgentAsync(Guid.NewGuid());

        // Assert
        Assert.Null(client);
    }

    /// <summary>CreateClientForSavedAgentAsync returns a usable client for an owned agent.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task CreateClientForSavedAgentAsync_OwnedAgent_ReturnsClient()
    {
        // Arrange
        var agentId = Guid.NewGuid();
        var agentService = new Mock<IAgentService>();
        agentService.Setup(s => s.GetByIdAsync(agentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AgentDetailsV1
            {
                Id = agentId,
                Name = "sample",
                BaseUrl = "https://agent.example.test",
                AuthMode = AgentAuthMode.None,
                HasAuthHeaderValue = false,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        agentService.Setup(s => s.ResolveAuthHeaderAsync(agentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((OutboundAuthHeader?)null);

        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(SampleCardJson, Encoding.UTF8, "application/json"),
        });
        var factory = BuildFactory(agentService.Object, handler);

        // Act
        var client = await factory.CreateClientForSavedAgentAsync(agentId);

        // Assert
        Assert.NotNull(client);
    }

    private static A2AOutboundFactory BuildFactory(IAgentService agentService, StubHttpMessageHandler handler)
    {
        var ssrfHandler = new SsrfValidatingHandler { InnerHandler = handler };
        var httpClient = new HttpClient(ssrfHandler);
        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);
        return new A2AOutboundFactory(agentService, httpClientFactory.Object);
    }
}
