// <copyright file="SsrfValidator.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Net;
using System.Net.Sockets;

namespace DonkeyWork.A2AExplorer.Agents.Core.Internal;

/// <summary>
/// SSRF guard ported from <c>server/proxy.ts</c>. Ensures outbound URLs use http/https and do not
/// point at private, loopback, or link-local addresses. Runs before every outbound call so a user
/// cannot coax the backend into scanning the internal network or hitting non-web schemes.
/// </summary>
public static class SsrfValidator
{
    private static readonly (uint Start, uint End)[] PrivateRanges =
    {
        ToRange("10.0.0.0", "10.255.255.255"),
        ToRange("172.16.0.0", "172.31.255.255"),
        ToRange("192.168.0.0", "192.168.255.255"),
        ToRange("127.0.0.0", "127.255.255.255"),
        ToRange("169.254.0.0", "169.254.255.255"),
        ToRange("0.0.0.0", "0.255.255.255"),
    };

    /// <summary>Validates a prospective outbound URL.</summary>
    /// <param name="url">The URL to inspect.</param>
    /// <returns>One of the <see cref="SsrfResult"/> variants.</returns>
    public static SsrfResult Validate(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed))
        {
            return SsrfResult.InvalidUrl;
        }

        return Validate(parsed);
    }

    /// <summary>Validates a prospective outbound URI.</summary>
    /// <param name="uri">The URI to inspect.</param>
    /// <returns>One of the <see cref="SsrfResult"/> variants.</returns>
    public static SsrfResult Validate(Uri uri)
    {
        if (!uri.IsAbsoluteUri)
        {
            return SsrfResult.InvalidUrl;
        }

        var host = uri.Host;
        if (string.IsNullOrEmpty(host))
        {
            return SsrfResult.InvalidUrl;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase))
        {
            return SsrfResult.UnsupportedScheme;
        }

        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".local", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase))
        {
            return SsrfResult.PrivateAddress;
        }

        if (IPAddress.TryParse(host, out var ip))
        {
            if (ip.AddressFamily != AddressFamily.InterNetwork)
            {
                // IPv6 literal — reject by default to avoid loopback ::1 / link-local fe80:: / ULA fc00::.
                return SsrfResult.PrivateAddress;
            }

            var numeric = ToUint(ip);
            foreach (var (start, end) in PrivateRanges)
            {
                if (numeric >= start && numeric <= end)
                {
                    return SsrfResult.PrivateAddress;
                }
            }
        }

        return SsrfResult.Ok;
    }

    private static (uint Start, uint End) ToRange(string start, string end)
        => (ToUint(IPAddress.Parse(start)), ToUint(IPAddress.Parse(end)));

    private static uint ToUint(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return ((uint)bytes[0] << 24) | ((uint)bytes[1] << 16) | ((uint)bytes[2] << 8) | bytes[3];
    }
}
