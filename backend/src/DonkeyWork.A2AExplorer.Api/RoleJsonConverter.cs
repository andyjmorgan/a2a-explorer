// <copyright file="RoleJsonConverter.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Text.Json;
using System.Text.Json.Serialization;
using A2A;

namespace DonkeyWork.A2AExplorer.Api;

/// <summary>
/// The A2A SDK's <see cref="Role"/> enum ships with <c>[JsonStringEnumMemberName]</c> attributes that
/// emit <c>ROLE_USER</c> / <c>ROLE_AGENT</c> on the wire. That disagrees with the A2A JSON spec,
/// which uses lowercase <c>user</c> / <c>agent</c>. Our SPA speaks the spec; this converter is
/// registered on the controller's JsonSerializerOptions so the first-party wire format stays correct,
/// independent of the SDK's internal serialization when talking to external agents.
/// </summary>
public sealed class RoleJsonConverter : JsonConverter<Role>
{
    /// <inheritdoc />
    public override Role Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var raw = reader.GetString();
        return raw switch
        {
            "user" or "ROLE_USER" => Role.User,
            "agent" or "ROLE_AGENT" => Role.Agent,
            _ => Role.Unspecified,
        };
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, Role value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value switch
        {
            Role.User => "user",
            Role.Agent => "agent",
            _ => "unspecified",
        });
    }
}
