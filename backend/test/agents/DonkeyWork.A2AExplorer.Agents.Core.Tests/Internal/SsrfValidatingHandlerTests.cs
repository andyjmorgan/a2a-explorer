// <copyright file="SsrfValidatingHandlerTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Net;
using DonkeyWork.A2AExplorer.Agents.Core.Internal;
using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests.Internal;

/// <summary>Unit tests for the DelegatingHandler that applies <see cref="SsrfValidator"/> to every outbound request.</summary>
public sealed class SsrfValidatingHandlerTests
{
    /// <summary>A public HTTPS request passes through to the inner handler.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task SendAsync_PublicUrl_PassesThroughInnerHandler()
    {
        // Arrange
        var inner = new RecordingHandler(new HttpResponseMessage(HttpStatusCode.OK));
        var handler = new SsrfValidatingHandler { InnerHandler = inner };
        var client = new HttpClient(handler);

        // Act
        var response = await client.GetAsync("https://example.com/");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, inner.Calls);
    }

    /// <summary>A private-IP request is rejected before reaching the inner handler.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task SendAsync_PrivateIp_ThrowsAndDoesNotCallInner()
    {
        // Arrange
        var inner = new RecordingHandler(new HttpResponseMessage(HttpStatusCode.OK));
        var handler = new SsrfValidatingHandler { InnerHandler = inner };
        var client = new HttpClient(handler);

        // Act + Assert
        var ex = await Assert.ThrowsAsync<SsrfRejectedException>(() => client.GetAsync("https://10.0.0.1/"));
        Assert.Equal(SsrfResult.PrivateAddress, ex.Reason);
        Assert.Equal(0, inner.Calls);
    }

    /// <summary>A non-HTTPS URL is rejected before reaching the inner handler.</summary>
    /// <returns>Async task.</returns>
    [Fact]
    public async Task SendAsync_NonHttps_ThrowsAndDoesNotCallInner()
    {
        // Arrange
        var inner = new RecordingHandler(new HttpResponseMessage(HttpStatusCode.OK));
        var handler = new SsrfValidatingHandler { InnerHandler = inner };
        var client = new HttpClient(handler);

        // Act + Assert
        var ex = await Assert.ThrowsAsync<SsrfRejectedException>(() => client.GetAsync("http://example.com/"));
        Assert.Equal(SsrfResult.NotHttps, ex.Reason);
        Assert.Equal(0, inner.Calls);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private readonly HttpResponseMessage response;

        public RecordingHandler(HttpResponseMessage response)
        {
            this.response = response;
        }

        public int Calls { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            this.Calls++;
            return Task.FromResult(this.response);
        }
    }
}
