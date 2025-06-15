/**
 * Authentication related types
 */

import type { Author } from "../author";

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  display_name?: string;
  github_username?: string;
}

export interface AuthResponse {
  user: Author | null;
  token?: string;
  isAuthenticated: boolean;
}

export interface TokenResponse {
  token: string;
  expires_at?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  password_confirm: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface OAuth2Provider {
  name: string;
  display_name: string;
  icon?: string;
  auth_url: string;
}
