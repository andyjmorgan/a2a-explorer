// <copyright file="SsrfValidatorTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using DonkeyWork.A2AExplorer.Agents.Core.Internal;
using Xunit;

namespace DonkeyWork.A2AExplorer.Agents.Core.Tests.Internal;

/// <summary>Unit tests for the SSRF guard.</summary>
public sealed class SsrfValidatorTests
{
    /// <summary>A well-formed http or https URL with a public host passes.</summary>
    /// <param name="url">Candidate URL.</param>
    [Theory]
    [InlineData("https://example.com")]
    [InlineData("https://api.example.com/path?q=1")]
    [InlineData("https://k3s-agentling.donkeywork.dev")]
    [InlineData("http://example.com")]
    [InlineData("http://api.example.com:8080/path")]
    public void Validate_PublicWebUrl_ReturnsOk(string url)
    {
        Assert.Equal(SsrfResult.Ok, SsrfValidator.Validate(url));
    }

    /// <summary>Malformed and relative URLs are rejected as InvalidUrl.</summary>
    /// <param name="url">Candidate URL.</param>
    [Theory]
    [InlineData("not a url")]
    [InlineData("")]
    [InlineData("http:///no-host")]
    [InlineData("/relative/path")]
    public void Validate_InvalidUrl_ReturnsInvalidUrl(string url)
    {
        Assert.Equal(SsrfResult.InvalidUrl, SsrfValidator.Validate(url));
    }

    /// <summary>Schemes other than http and https are rejected as UnsupportedScheme.</summary>
    /// <param name="url">Candidate URL.</param>
    [Theory]
    [InlineData("ftp://example.com/file")]
    [InlineData("ws://example.com")]
    [InlineData("gopher://example.com")]
    public void Validate_NonWebScheme_ReturnsUnsupportedScheme(string url)
    {
        Assert.Equal(SsrfResult.UnsupportedScheme, SsrfValidator.Validate(url));
    }

    /// <summary>Private / loopback / link-local IPv4 hosts are rejected.</summary>
    /// <param name="url">Candidate URL.</param>
    [Theory]
    [InlineData("https://10.0.0.1")]
    [InlineData("https://10.255.255.255")]
    [InlineData("https://172.16.5.1")]
    [InlineData("https://172.31.255.255")]
    [InlineData("https://192.168.1.1")]
    [InlineData("https://127.0.0.1")]
    [InlineData("https://169.254.1.1")]
    [InlineData("https://0.0.0.0")]
    public void Validate_PrivateIpv4_ReturnsPrivateAddress(string url)
    {
        Assert.Equal(SsrfResult.PrivateAddress, SsrfValidator.Validate(url));
    }

    /// <summary>Reserved hostnames are rejected by name, not by IP resolution.</summary>
    /// <param name="url">Candidate URL.</param>
    [Theory]
    [InlineData("https://localhost")]
    [InlineData("https://localhost:8080")]
    [InlineData("https://something.local")]
    [InlineData("https://something.internal")]
    [InlineData("https://svc.internal/path")]
    public void Validate_ReservedHostname_ReturnsPrivateAddress(string url)
    {
        Assert.Equal(SsrfResult.PrivateAddress, SsrfValidator.Validate(url));
    }

    /// <summary>IPv6 literals are rejected by default (loopback ::1, link-local fe80::, ULA fc00::).</summary>
    /// <param name="url">Candidate URL.</param>
    [Theory]
    [InlineData("https://[::1]")]
    [InlineData("https://[fe80::1]")]
    [InlineData("https://[fc00::1]")]
    [InlineData("https://[2001:db8::1]")]
    public void Validate_Ipv6Literal_ReturnsPrivateAddress(string url)
    {
        Assert.Equal(SsrfResult.PrivateAddress, SsrfValidator.Validate(url));
    }

    /// <summary>A public IPv4 address passes (no private-range match).</summary>
    [Fact]
    public void Validate_PublicIpv4_ReturnsOk()
    {
        Assert.Equal(SsrfResult.Ok, SsrfValidator.Validate("https://8.8.8.8"));
    }

    /// <summary>Overload accepting a Uri returns the same result as the string overload.</summary>
    [Fact]
    public void Validate_UriOverload_ReturnsSameAsString()
    {
        var uri = new Uri("https://192.168.5.5/path");
        Assert.Equal(SsrfResult.PrivateAddress, SsrfValidator.Validate(uri));
    }
}
