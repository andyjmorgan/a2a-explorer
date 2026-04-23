// <copyright file="SsrfRejectedException.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Agents.Core.Internal;

/// <summary>Thrown by <see cref="SsrfValidatingHandler"/> when an outbound URL fails the SSRF guard.</summary>
public sealed class SsrfRejectedException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="SsrfRejectedException"/> class.
    /// </summary>
    /// <param name="url">The URL that was rejected.</param>
    /// <param name="reason">The specific SSRF failure mode.</param>
    public SsrfRejectedException(Uri url, SsrfResult reason)
        : base($"Outbound URL '{url}' rejected by SSRF guard: {reason}.")
    {
        this.Url = url;
        this.Reason = reason;
    }

    /// <summary>Gets the URL that failed the SSRF check.</summary>
    public Uri Url { get; }

    /// <summary>Gets the reason the URL was rejected.</summary>
    public SsrfResult Reason { get; }
}
