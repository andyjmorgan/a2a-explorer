// <copyright file="OutboundAuthHeader.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Agents.Contracts;

/// <summary>
/// Header-name + decrypted header-value pair returned by <c>IAgentService.ResolveAuthHeaderAsync</c>
/// to the proxy layer. Never exposed via HTTP — this type only crosses in-process boundaries.
/// </summary>
/// <param name="Name">The HTTP header name to inject on the outbound request.</param>
/// <param name="Value">The decrypted header value.</param>
public sealed record OutboundAuthHeader(string Name, string Value);
