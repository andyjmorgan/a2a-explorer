// <copyright file="StubHttpMessageHandler.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Identity.Api.Tests.Fakes;

/// <summary>
/// Hand-rolled <see cref="HttpMessageHandler"/> that returns a pre-canned response for any request.
/// Used to drive <c>AuthController</c> tests without hitting a real Keycloak.
/// </summary>
public sealed class StubHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> responder;

    /// <summary>
    /// Initializes a new instance of the <see cref="StubHttpMessageHandler"/> class.
    /// </summary>
    /// <param name="responder">Function producing the response for each request.</param>
    public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        this.responder = responder;
    }

    /// <summary>Gets the list of requests observed by the handler, in order.</summary>
    public List<HttpRequestMessage> Requests { get; } = new();

    /// <inheritdoc />
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        this.Requests.Add(request);
        return Task.FromResult(this.responder(request));
    }
}
