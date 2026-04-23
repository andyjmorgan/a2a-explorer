// <copyright file="PostgresCollection.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests.Fixtures;

/// <summary>
/// xUnit collection definition so every test class annotated with
/// <c>[Collection(PostgresCollection.Name)]</c> shares one postgres container per assembly.
/// </summary>
[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>
{
    /// <summary>The collection name referenced by <c>[Collection]</c> on test classes.</summary>
    public const string Name = "Postgres";
}
