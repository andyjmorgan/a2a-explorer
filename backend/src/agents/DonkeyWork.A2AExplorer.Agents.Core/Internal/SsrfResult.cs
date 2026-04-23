// <copyright file="SsrfResult.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Agents.Core.Internal;

/// <summary>Outcome of an SSRF validation check on a prospective outbound URL.</summary>
public enum SsrfResult
{
    /// <summary>The URL passes every guard and is safe to call.</summary>
    Ok,

    /// <summary>The URL is not a well-formed absolute URL.</summary>
    InvalidUrl,

    /// <summary>The URL does not use HTTPS.</summary>
    NotHttps,

    /// <summary>The URL resolves to a private / link-local / loopback address.</summary>
    PrivateAddress,
}
