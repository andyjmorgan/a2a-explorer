// <copyright file="SecurityOptions.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.ComponentModel.DataAnnotations;

namespace DonkeyWork.A2AExplorer.Agents.Core;

/// <summary>Options bound from the <c>Security</c> configuration section.</summary>
public sealed class SecurityOptions
{
    /// <summary>The configuration section name these options bind from.</summary>
    public const string SectionName = "Security";

    /// <summary>
    /// Gets or sets the symmetric key passed to pgcrypto's <c>pgp_sym_encrypt</c> /
    /// <c>pgp_sym_decrypt</c> when encrypting saved agent auth-header values at rest.
    /// </summary>
    [Required]
    [StringLength(256, MinimumLength = 16)]
    public required string CredentialEncryptionKey { get; set; }
}
