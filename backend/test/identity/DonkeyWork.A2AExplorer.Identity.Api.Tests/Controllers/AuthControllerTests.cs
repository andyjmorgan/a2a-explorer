// <copyright file="AuthControllerTests.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Net;
using System.Text;
using DonkeyWork.A2AExplorer.Identity.Api.Controllers;
using DonkeyWork.A2AExplorer.Identity.Api.Tests.Fakes;
using DonkeyWork.A2AExplorer.Identity.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace DonkeyWork.A2AExplorer.Identity.Api.Tests.Controllers;

/// <summary>
/// Unit tests for the backend-brokered PKCE flow implemented by <see cref="AuthController"/>.
/// No real HTTP calls — <see cref="StubHttpMessageHandler"/> stands in for Keycloak's token endpoint.
/// </summary>
public sealed class AuthControllerTests
{
    private const string TokenEndpoint = "https://auth.example.test/realms/Agents/protocol/openid-connect/token";

    /// <summary>Login generates a verifier cookie and a Keycloak redirect with PKCE S256 params.</summary>
    [Fact]
    public void Login_SetsVerifierCookieAndRedirectsWithPkceChallenge()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => throw new InvalidOperationException("unexpected"));

        // Act
        var result = controller.Login(idpHint: null);

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.StartsWith("https://auth.example.test/realms/Agents/protocol/openid-connect/auth?", redirect.Url);
        Assert.Contains("client_id=a2a-explorer", redirect.Url);
        Assert.Contains("code_challenge_method=S256", redirect.Url);
        Assert.Contains("code_challenge=", redirect.Url);
        Assert.Contains("redirect_uri=http%3A%2F%2Flocalhost%3A5050%2Fapi%2Fv1%2Fauth%2Fcallback", redirect.Url);

        // Verifier cookie was set via Response.Cookies.Append (appears in Set-Cookie headers).
        var setCookies = controller.HttpContext.Response.Headers["Set-Cookie"].ToString();
        Assert.Contains("pkce_code_verifier=", setCookies);
        Assert.Contains("httponly", setCookies, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", setCookies, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Login forwards an idpHint to Keycloak via the <c>kc_idp_hint</c> query parameter.</summary>
    [Fact]
    public void Login_WithIdpHint_AppendsKeycloakIdpHint()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => throw new InvalidOperationException("unexpected"));

        // Act
        var result = controller.Login(idpHint: "github");

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Contains("kc_idp_hint=github", redirect.Url);
    }

    /// <summary>Callback with a Keycloak-returned error redirects to the SPA with the error fragment.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Callback_KeycloakError_RedirectsToSpaWithErrorFragment()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => throw new InvalidOperationException("unexpected"));

        // Act
        var result = await controller.Callback(code: null, error: "access_denied", errorDescription: "user cancelled");

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.StartsWith("http://localhost:5199/login/callback#", redirect.Url);
        Assert.Contains("error=access_denied", redirect.Url);
        Assert.Contains("error_description=user%20cancelled", redirect.Url);
    }

    /// <summary>Callback without a <c>code</c> param redirects with the missing_code error.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Callback_MissingCode_RedirectsWithMissingCodeError()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => throw new InvalidOperationException("unexpected"));

        // Act
        var result = await controller.Callback(code: null, error: null, errorDescription: null);

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Contains("error=missing_code", redirect.Url);
    }

    /// <summary>Callback without the PKCE verifier cookie redirects with the missing_verifier error.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Callback_MissingVerifierCookie_RedirectsWithMissingVerifierError()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => throw new InvalidOperationException("unexpected"));

        // Act
        var result = await controller.Callback(code: "abc", error: null, errorDescription: null);

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Contains("error=missing_verifier", redirect.Url);
    }

    /// <summary>Callback happy path redirects to the SPA with tokens in the URL fragment.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Callback_HappyPath_RedirectsWithAccessAndRefreshTokens()
    {
        // Arrange
        var (controller, handler) = BuildController(responder: _ => TokenResponse(
            "access-token-xyz",
            "refresh-token-abc",
            expiresIn: 300));
        AttachVerifierCookie(controller, "test-verifier-32bytes");

        // Act
        var result = await controller.Callback(code: "auth-code-1", error: null, errorDescription: null);

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.StartsWith("http://localhost:5199/login/callback#", redirect.Url);
        Assert.Contains("access_token=access-token-xyz", redirect.Url);
        Assert.Contains("refresh_token=refresh-token-abc", redirect.Url);
        Assert.Contains("expires_in=300", redirect.Url);
        Assert.Single(handler.Requests);
        Assert.Equal(TokenEndpoint, handler.Requests[0].RequestUri!.ToString());
    }

    /// <summary>Callback redirects with a token_exchange_failed error when Keycloak returns non-2xx.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Callback_KeycloakRejectsCode_RedirectsWithTokenExchangeFailed()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("{\"error\":\"invalid_grant\"}", Encoding.UTF8, "application/json"),
        });
        AttachVerifierCookie(controller, "test-verifier-32bytes");

        // Act
        var result = await controller.Callback(code: "auth-code-1", error: null, errorDescription: null);

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.Contains("error=token_exchange_failed", redirect.Url);
    }

    /// <summary>Refresh with an empty refresh token returns 400 without hitting Keycloak.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Refresh_EmptyRefreshToken_ReturnsBadRequest()
    {
        // Arrange
        var (controller, handler) = BuildController(responder: _ => throw new InvalidOperationException("unexpected"));

        // Act
        var result = await controller.Refresh(new AuthController.RefreshTokenRequest { RefreshToken = string.Empty });

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(handler.Requests);
    }

    /// <summary>Refresh happy path returns a new access token plus the rotated refresh token.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Refresh_ValidToken_ReturnsRotatedTokens()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => TokenResponse("new-access", "new-refresh", 600));

        // Act
        var result = await controller.Refresh(new AuthController.RefreshTokenRequest { RefreshToken = "old-refresh" });

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<AuthController.RefreshTokenResponse>(ok.Value);
        Assert.Equal("new-access", body.AccessToken);
        Assert.Equal("new-refresh", body.RefreshToken);
        Assert.Equal(600, body.ExpiresIn);
        Assert.Equal("Bearer", body.TokenType);
    }

    /// <summary>Refresh returns 400 when Keycloak rejects the refresh token.</summary>
    /// <returns>Async task for the test.</returns>
    [Fact]
    public async Task Refresh_KeycloakRejects_ReturnsBadRequest()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("{\"error\":\"invalid_grant\"}", Encoding.UTF8, "application/json"),
        });

        // Act
        var result = await controller.Refresh(new AuthController.RefreshTokenRequest { RefreshToken = "bogus" });

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    /// <summary>Logout redirects to Keycloak's logout endpoint with the SPA /login as post-logout target.</summary>
    [Fact]
    public void Logout_RedirectsToKeycloakLogout()
    {
        // Arrange
        var (controller, _) = BuildController(responder: _ => throw new InvalidOperationException("unexpected"));

        // Act
        var result = controller.Logout();

        // Assert
        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.StartsWith("https://auth.example.test/realms/Agents/protocol/openid-connect/logout?", redirect.Url);
        Assert.Contains("client_id=a2a-explorer", redirect.Url);
        Assert.Contains("post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A5199%2Flogin", redirect.Url);
    }

    private static (AuthController Controller, StubHttpMessageHandler Handler) BuildController(
        Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        var options = Options.Create(new KeycloakOptions
        {
            Authority = "https://auth.example.test/realms/Agents",
            Audience = "a2a-explorer",
            ClientId = "a2a-explorer",
            ClientSecret = "secret",
            FrontendUrl = "http://localhost:5199",
            RequireHttpsMetadata = true,
        });

        var handler = new StubHttpMessageHandler(responder);
        var httpClient = new HttpClient(handler);
        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);

        var controller = new AuthController(options, httpClientFactory.Object, NullLogger<AuthController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    Request =
                    {
                        Scheme = "http",
                        Host = new HostString("localhost", 5050),
                    },
                },
            },
        };
        return (controller, handler);
    }

    private static void AttachVerifierCookie(AuthController controller, string verifier)
    {
        controller.HttpContext.Request.Headers.Cookie = $"pkce_code_verifier={verifier}";
    }

    private static HttpResponseMessage TokenResponse(string accessToken, string? refreshToken, int expiresIn)
    {
        var payload = $"{{\"access_token\":\"{accessToken}\",\"expires_in\":{expiresIn},\"token_type\":\"Bearer\""
            + (refreshToken is null ? string.Empty : $",\"refresh_token\":\"{refreshToken}\"")
            + "}";
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json"),
        };
    }
}
