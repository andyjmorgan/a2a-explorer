// <copyright file="AuthController.cs" company="Andrew Morgan">
// Copyright (c) Andrew Morgan. All rights reserved.
// </copyright>

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Asp.Versioning;
using DonkeyWork.A2AExplorer.Identity.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DonkeyWork.A2AExplorer.Identity.Api.Controllers;

/// <summary>
/// Handles backend-brokered PKCE login against Keycloak. Browsers hit <c>/api/v1/auth/login</c>
/// which redirects to Keycloak; Keycloak redirects back to <c>/api/v1/auth/callback</c> which
/// exchanges the code for tokens and hands them to the SPA in a URL fragment.
/// </summary>
[ApiController]
[ApiVersion(1.0)]
[Route("api/v{version:apiVersion}/auth")]
[Produces("application/json")]
public sealed class AuthController : ControllerBase
{
    /// <summary>HttpOnly cookie name that carries the PKCE code verifier across the redirect round-trip.</summary>
    private const string CodeVerifierCookieName = "pkce_code_verifier";

    private readonly KeycloakOptions keycloakOptions;
    private readonly IHttpClientFactory httpClientFactory;
    private readonly ILogger<AuthController> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthController"/> class.
    /// </summary>
    /// <param name="keycloakOptions">Bound Keycloak configuration.</param>
    /// <param name="httpClientFactory">Factory used to create the back-channel HTTP client.</param>
    /// <param name="logger">Logger for audit + error output.</param>
    public AuthController(
        IOptions<KeycloakOptions> keycloakOptions,
        IHttpClientFactory httpClientFactory,
        ILogger<AuthController> logger)
    {
        this.keycloakOptions = keycloakOptions.Value;
        this.httpClientFactory = httpClientFactory;
        this.logger = logger;
    }

    private string EffectiveClientId =>
        !string.IsNullOrEmpty(this.keycloakOptions.ClientId)
            ? this.keycloakOptions.ClientId
            : this.keycloakOptions.Audience;

    /// <summary>
    /// Starts the OAuth2 PKCE flow. Generates a verifier + challenge, stores the verifier in a
    /// short-lived HttpOnly cookie, and redirects the browser to Keycloak's authorization endpoint.
    /// </summary>
    /// <param name="idpHint">Optional Keycloak identity-provider hint (e.g. <c>github</c>, <c>google</c>).</param>
    /// <returns>A 302 redirect to the Keycloak authorization URL.</returns>
    [HttpGet("login")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public IActionResult Login([FromQuery] string? idpHint = null)
    {
        var codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);

        this.Response.Cookies.Append(CodeVerifierCookieName, codeVerifier, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromMinutes(10),
        });

        var redirectUri = $"{this.Request.Scheme}://{this.Request.Host}/api/v1/auth/callback";

        var authorizationUrl = $"{this.keycloakOptions.Authority}/protocol/openid-connect/auth?" +
            $"client_id={Uri.EscapeDataString(this.EffectiveClientId)}" +
            "&response_type=code" +
            $"&scope={Uri.EscapeDataString("openid profile email")}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
            $"&code_challenge={Uri.EscapeDataString(codeChallenge)}" +
            "&code_challenge_method=S256";

        if (!string.IsNullOrEmpty(idpHint))
        {
            authorizationUrl += $"&kc_idp_hint={Uri.EscapeDataString(idpHint)}";
        }

        return this.Redirect(authorizationUrl);
    }

    /// <summary>
    /// Handles the OAuth2 redirect from Keycloak. Exchanges the authorization code + PKCE verifier
    /// for tokens and redirects the browser to the SPA with tokens in the URL fragment.
    /// </summary>
    /// <param name="code">The Keycloak-issued authorization code.</param>
    /// <param name="error">Optional error code from Keycloak when the user cancelled or auth failed.</param>
    /// <param name="errorDescription">Optional human-readable error description.</param>
    /// <returns>A 302 redirect to the SPA callback URL with either tokens or an error fragment.</returns>
    [HttpGet("callback")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? error,
        [FromQuery(Name = "error_description")] string? errorDescription)
    {
        var frontendCallbackUrl = $"{this.FrontendBaseUrl()}/login/callback";

        if (!string.IsNullOrEmpty(error))
        {
            this.logger.LogWarning("Keycloak returned an error on callback: {Error} {Description}", error, errorDescription);
            return this.Redirect(BuildErrorFragment(frontendCallbackUrl, error, errorDescription));
        }

        if (string.IsNullOrEmpty(code))
        {
            return this.Redirect(BuildErrorFragment(frontendCallbackUrl, "missing_code", "Authorization code is required."));
        }

        if (!this.Request.Cookies.TryGetValue(CodeVerifierCookieName, out var codeVerifier) || string.IsNullOrEmpty(codeVerifier))
        {
            return this.Redirect(BuildErrorFragment(frontendCallbackUrl, "missing_verifier", "PKCE code verifier not found. Please start the login flow again."));
        }

        this.Response.Cookies.Delete(CodeVerifierCookieName);

        var redirectUri = $"{this.Request.Scheme}://{this.Request.Host}/api/v1/auth/callback";
        var tokenEndpoint = $"{this.BackchannelAuthority()}/protocol/openid-connect/token";

        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = this.EffectiveClientId,
            ["code"] = code,
            ["redirect_uri"] = redirectUri,
            ["code_verifier"] = codeVerifier,
        };

        if (!string.IsNullOrEmpty(this.keycloakOptions.ClientSecret))
        {
            form["client_secret"] = this.keycloakOptions.ClientSecret;
        }

        var httpClient = this.httpClientFactory.CreateClient();
        var response = await httpClient.PostAsync(tokenEndpoint, new FormUrlEncodedContent(form)).ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            this.logger.LogWarning("Keycloak token exchange failed: {Status} {Body}", (int)response.StatusCode, body);
            return this.Redirect(BuildErrorFragment(frontendCallbackUrl, "token_exchange_failed", body));
        }

        var json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        var tokens = JsonSerializer.Deserialize<TokenResponse>(json);

        if (tokens is null || string.IsNullOrEmpty(tokens.AccessToken))
        {
            return this.Redirect(BuildErrorFragment(frontendCallbackUrl, "invalid_token_response", "Failed to parse token response."));
        }

        var fragment = new List<string>
        {
            $"access_token={Uri.EscapeDataString(tokens.AccessToken)}",
            $"expires_in={tokens.ExpiresIn}",
            $"token_type={Uri.EscapeDataString(tokens.TokenType ?? "Bearer")}",
        };

        if (!string.IsNullOrEmpty(tokens.RefreshToken))
        {
            fragment.Add($"refresh_token={Uri.EscapeDataString(tokens.RefreshToken)}");
        }

        return this.Redirect($"{frontendCallbackUrl}#{string.Join("&", fragment)}");
    }

    /// <summary>
    /// Exchanges a refresh token for a new access token. Called by the SPA's <c>fetchWithAuth</c>
    /// wrapper when a stored access token is close to expiry or has been rejected with 401.
    /// </summary>
    /// <param name="request">The refresh token payload.</param>
    /// <returns>The new access token and rotated refresh token.</returns>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(RefreshTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrEmpty(request.RefreshToken))
        {
            return this.BadRequest(new { error = "refresh_token_required", error_description = "Refresh token is required." });
        }

        var tokenEndpoint = $"{this.BackchannelAuthority()}/protocol/openid-connect/token";

        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = this.EffectiveClientId,
            ["refresh_token"] = request.RefreshToken,
        };

        if (!string.IsNullOrEmpty(this.keycloakOptions.ClientSecret))
        {
            form["client_secret"] = this.keycloakOptions.ClientSecret;
        }

        var httpClient = this.httpClientFactory.CreateClient();
        var response = await httpClient.PostAsync(tokenEndpoint, new FormUrlEncodedContent(form)).ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            this.logger.LogWarning("Token refresh failed: {Status} {Body}", (int)response.StatusCode, body);
            return this.BadRequest(new { error = "refresh_failed", error_description = body });
        }

        var json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        var tokens = JsonSerializer.Deserialize<TokenResponse>(json);

        if (tokens is null || string.IsNullOrEmpty(tokens.AccessToken))
        {
            return this.BadRequest(new { error = "invalid_response", error_description = "Failed to parse token response." });
        }

        return this.Ok(new RefreshTokenResponse
        {
            AccessToken = tokens.AccessToken,
            RefreshToken = tokens.RefreshToken,
            ExpiresIn = tokens.ExpiresIn,
            TokenType = tokens.TokenType ?? "Bearer",
        });
    }

    /// <summary>
    /// Logs the user out of Keycloak and returns them to the SPA's login page. The browser clears
    /// its local tokens separately via <c>authStore.logout()</c>.
    /// </summary>
    /// <returns>A 302 redirect to the Keycloak logout endpoint.</returns>
    [HttpGet("logout")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public IActionResult Logout()
    {
        var postLogoutRedirectUri = $"{this.FrontendBaseUrl()}/login";
        var logoutUrl = $"{this.keycloakOptions.Authority}/protocol/openid-connect/logout?" +
            $"client_id={Uri.EscapeDataString(this.EffectiveClientId)}" +
            $"&post_logout_redirect_uri={Uri.EscapeDataString(postLogoutRedirectUri)}";
        return this.Redirect(logoutUrl);
    }

    private static string GenerateCodeVerifier()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string GenerateCodeChallenge(string codeVerifier)
    {
        var bytes = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));
        return Base64UrlEncode(bytes);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string BuildErrorFragment(string baseUrl, string error, string? description) =>
        $"{baseUrl}#error={Uri.EscapeDataString(error)}&error_description={Uri.EscapeDataString(description ?? string.Empty)}";

    private string FrontendBaseUrl() =>
        !string.IsNullOrEmpty(this.keycloakOptions.FrontendUrl)
            ? this.keycloakOptions.FrontendUrl.TrimEnd('/')
            : $"{this.Request.Scheme}://{this.Request.Host}";

    private string BackchannelAuthority() =>
        !string.IsNullOrEmpty(this.keycloakOptions.InternalAuthority)
            ? this.keycloakOptions.InternalAuthority
            : this.keycloakOptions.Authority;

    /// <summary>Refresh request body posted by the SPA.</summary>
    public sealed class RefreshTokenRequest
    {
        /// <summary>Gets or sets the refresh token previously issued by Keycloak.</summary>
        [JsonPropertyName("refreshToken")]
        public string? RefreshToken { get; set; }
    }

    /// <summary>Refresh response body returned to the SPA.</summary>
    public sealed class RefreshTokenResponse
    {
        /// <summary>Gets or sets the new access token.</summary>
        [JsonPropertyName("accessToken")]
        public string? AccessToken { get; set; }

        /// <summary>Gets or sets the (potentially rotated) refresh token.</summary>
        [JsonPropertyName("refreshToken")]
        public string? RefreshToken { get; set; }

        /// <summary>Gets or sets the access-token lifetime in seconds.</summary>
        [JsonPropertyName("expiresIn")]
        public int ExpiresIn { get; set; }

        /// <summary>Gets or sets the token type (usually <c>Bearer</c>).</summary>
        [JsonPropertyName("tokenType")]
        public string? TokenType { get; set; }
    }

    /// <summary>Minimal token payload deserialised from Keycloak's <c>/token</c> endpoint.</summary>
    private sealed class TokenResponse
    {
        /// <summary>Gets or sets the bearer access token.</summary>
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        /// <summary>Gets or sets the refresh token.</summary>
        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        /// <summary>Gets or sets the access-token lifetime in seconds.</summary>
        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        /// <summary>Gets or sets the token type (usually <c>Bearer</c>).</summary>
        [JsonPropertyName("token_type")]
        public string? TokenType { get; set; }
    }
}
