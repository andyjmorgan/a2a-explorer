// <copyright file="StubHttpMessageHandler.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests.Fakes;

/// <summary>
/// Records every outbound request and returns a caller-provided response. Used to drive the
/// <c>A2AOutboundFactory</c> tests without hitting a real agent.
/// </summary>
public sealed class StubHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> responder;

    /// <summary>
    /// Initializes a new instance of the <see cref="StubHttpMessageHandler"/> class.
    /// </summary>
    /// <param name="responder">Function producing the canned response for each request.</param>
    public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        this.responder = responder;
    }

    /// <summary>Gets the list of requests observed by the handler, in order.</summary>
    public List<HttpRequestMessage> Requests { get; } = new();

    /// <inheritdoc />
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        this.Requests.Add(request);
        return Task.FromResult(this.responder(request));
    }
}
