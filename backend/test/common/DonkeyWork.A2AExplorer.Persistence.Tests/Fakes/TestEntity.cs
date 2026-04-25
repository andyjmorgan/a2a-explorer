// <copyright file="TestEntity.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Persistence.Entities;

namespace DonkeyWork.A2AExplorer.Persistence.Tests.Fakes;

/// <summary>
/// Minimal <see cref="BaseEntity"/>-derived entity used only in tests to exercise the DbContext
/// query filter and the <c>AuditableInterceptor</c>. Not part of the production schema.
/// </summary>
public sealed class TestEntity : BaseEntity
{
    /// <summary>Gets or sets a free-form label so assertions can distinguish rows.</summary>
    public string Label { get; set; } = string.Empty;
}
