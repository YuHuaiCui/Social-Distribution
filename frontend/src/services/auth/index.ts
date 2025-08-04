/**
 * Authentication Service
 * Handles login, logout, signup, and auth status
 */

import { BaseApiService } from "../base";
import type {
  LoginCredentials,
  SignupData,
  AuthResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordData,
  Author,
} from "../../types";

// Backend login response format
interface BackendLoginResponse {
  success: boolean;
  user: Author;
  message: string;
  token?: string;
}

export class AuthService extends BaseApiService {
  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Create Basic Auth header
    const basicAuth = btoa(`${credentials.username}:${credentials.password}`);
    
    // Only send remember_me in request body
    const requestBody = credentials.remember_me !== undefined 
      ? { remember_me: credentials.remember_me }
      : {};

    const response = await this.request<BackendLoginResponse>(
      "/api/auth/login/",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
        skipAuth: true,
      }
    );

    // Session authentication is handled by Django - no token storage needed

    // Transform backend response to match AuthResponse interface
    return {
      user: response.user,
      token: response.token,
      isAuthenticated: response.success || false,
    };
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await this.request("/api/auth/logout/", {
        method: "POST",
      });
    } finally {
      // Session will be cleared by Django
    }
  }

  /**
   * Sign up a new user
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/signup/", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
  }

  /**
   * Get current authentication status
   */
  async getAuthStatus(): Promise<AuthResponse> {
    try {
      return await this.request<AuthResponse>("/api/auth/status/");
    } catch (error) {
      console.error("Auth status check failed:", error);
      // If auth check fails, user is not authenticated
      return {
        user: null,
        isAuthenticated: false,
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    data: PasswordResetRequest
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      "/api/auth/password-reset/",
      {
        method: "POST",
        body: JSON.stringify(data),
        skipAuth: true,
      }
    );
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(
    data: PasswordResetConfirm
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      "/api/auth/password-reset/confirm/",
      {
        method: "POST",
        body: JSON.stringify(data),
        skipAuth: true,
      }
    );
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    data: ChangePasswordData
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      "/api/auth/change-password/",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Get OAuth2 redirect URL
   */
  getOAuth2Url(provider: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      provider,
      ...(redirectUri && { redirect_uri: redirectUri }),
    });
    return `${this.baseUrl}/api/auth/oauth2/authorize/?${params.toString()}`;
  }

  /**
   * Exchange OAuth2 code for token
   */
  async exchangeOAuth2Code(
    provider: string,
    code: string
  ): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      "/api/auth/oauth2/callback/",
      {
        method: "POST",
        body: JSON.stringify({ provider, code }),
        skipAuth: true,
      }
    );

    // Session authentication is handled by Django
    return response;
  }
}

// Export singleton instance
export const authService = new AuthService();

export default AuthService;
