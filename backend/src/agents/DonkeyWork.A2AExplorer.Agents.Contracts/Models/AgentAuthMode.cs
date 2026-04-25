// <copyright file="AgentAuthMode.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

namespace DonkeyWork.A2AExplorer.Agents.Contracts.Models;

/// <summary>The authentication strategy a user has configured for a saved A2A agent.</summary>
public enum AgentAuthMode
{
    /// <summary>The agent is open — no authentication header is attached.</summary>
    None = 0,

    /// <summary>A single HTTP header (name + value) is attached on every forwarded request.</summary>
    Header = 1,
}
