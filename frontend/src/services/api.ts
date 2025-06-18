/**
 * @deprecated This file is deprecated. Use individual service imports from './services' instead.
 * This file is kept for backwards compatibility only.
 */

import type {
  Author,
  Entry,
  Comment,
  Like,
  Follow,
  InboxItem as Inbox,
  PaginatedResponse,
  LoginCredentials,
  SignupData,
  AuthResponse,
} from "../types";

// Use relative URLs in production, absolute URLs in development
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" ? "http://localhost:8000" : "");

/**
 * @deprecated Use individual service classes instead
 */
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Helper method for requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Get CSRF token from cookie if it exists
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    if (csrfToken) {
      defaultHeaders["X-CSRFToken"] = csrfToken;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: "include", // Always include cookies
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message ||
          error.detail ||
          `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<any>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return response;
  }

  async logout(): Promise<void> {
    await this.request("/accounts/logout/", {
      method: "POST",
    });
  }

  async signup(
    data: SignupData
  ): Promise<{ success: boolean; user: Author; message: string }> {
    return this.request<{ success: boolean; user: Author; message: string }>(
      "/api/auth/signup/",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getAuthStatus(): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/status/");
  }

  // Author endpoints
  async getAuthors(params?: {
    is_approved?: boolean;
    is_active?: boolean;
    type?: "local" | "remote";
    search?: string;
    page?: number;
  }): Promise<PaginatedResponse<Author>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    return this.request<PaginatedResponse<Author>>(
      `/api/authors/?${queryParams.toString()}`
    );
  }

  async getAuthor(id: string): Promise<Author> {
    return this.request<Author>(`/api/authors/${id}/`);
  }

  async getCurrentAuthor(): Promise<Author> {
    return this.request<Author>("/api/authors/me/");
  }

  async updateCurrentAuthor(data: Partial<Author>): Promise<Author> {
    // Convert to snake_case for backend
    const backendData: any = {};
    if (data.display_name !== undefined)
      backendData.display_name = data.display_name;
    if (data.github_username !== undefined)
      backendData.github_username = data.github_username;
    if (data.bio !== undefined) backendData.bio = data.bio;
    if (data.profile_image !== undefined)
      backendData.profile_image = data.profile_image;
    if (data.email !== undefined) backendData.email = data.email;

    return this.request<Author>("/api/authors/me/", {
      method: "PATCH",
      body: JSON.stringify(backendData),
    });
  }

  async uploadProfileImage(file: File): Promise<Author> {
    const formData = new FormData();
    formData.append("profile_image_file", file);

    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    return this.request<Author>("/api/authors/me/", {
      method: "PATCH",
      headers: {
        // Don't set Content-Type for FormData
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: formData,
    });
  }

  // Entry endpoints (when implemented in backend)
  async getEntries(params?: {
    author?: string;
    visibility?: string;
    page?: number;
  }): Promise<PaginatedResponse<Entry>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    // This endpoint needs to be implemented in backend
    return this.request<PaginatedResponse<Entry>>(
      `/api/entries/?${queryParams.toString()}`
    );
  }

  async getEntry(id: string): Promise<Entry> {
    // This endpoint needs to be implemented in backend
    return this.request<Entry>(`/api/entries/${id}/`);
  }

  async createEntry(data: {
    title: string;
    content: string;
    content_type: string;
    visibility: string;
    categories?: string[];
  }): Promise<Entry> {
    // This endpoint needs to be implemented in backend
    return this.request<Entry>("/api/entries/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateEntry(id: string, data: Partial<Entry>): Promise<Entry> {
    // This endpoint needs to be implemented in backend
    return this.request<Entry>(`/api/entries/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteEntry(id: string): Promise<void> {
    // This endpoint needs to be implemented in backend
    await this.request(`/api/entries/${id}/`, {
      method: "DELETE",
    });
  }

  // Comment endpoints - backend completed
  async getComments(entryId: string): Promise<Comment[]> {
    return this.request<Comment[]>(`/api/entries/${entryId}/comments/`);
  }

  async createComment(
    entryId: string,
    data: {
      content: string;
      content_type?: string;
    }
  ): Promise<Comment> {
    return this.request<Comment>(`/api/entries/${entryId}/comments/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Like endpoints - backend completed
  async likeEntry(entryId: string): Promise<Like> {
    return this.request<Like>(`/api/entries/${entryId}/likes/`, {
      method: "POST",
    });
  }

  async unlikeEntry(entryId: string): Promise<void> {
    await this.request(`/api/entries/${entryId}/likes/`, {
      method: "DELETE",
    });
  }

  async getEntryLikeStatus(
    entryId: string
  ): Promise<{ like_count: number; liked_by_current_user: boolean }> {
    return this.request<{ like_count: number; liked_by_current_user: boolean }>(
      `/api/entries/${entryId}/likes/`,
      {
        method: "GET",
      }
    );
  }

  // Follow endpoints (when implemented in backend)
  async followAuthor(authorId: string): Promise<Follow> {
    // This endpoint needs to be implemented in backend
    return this.request<Follow>(`/api/authors/${authorId}/follow/`, {
      method: "POST",
    });
  }

  async unfollowAuthor(authorId: string): Promise<void> {
    // This endpoint needs to be implemented in backend
    await this.request(`/api/authors/${authorId}/follow/`, {
      method: "DELETE",
    });
  }

  async getFollowers(authorId: string): Promise<Author[]> {
    // This endpoint needs to be implemented in backend
    return this.request<Author[]>(`/api/authors/${authorId}/followers/`);
  }

  async getFollowing(authorId: string): Promise<Author[]> {
    // This endpoint needs to be implemented in backend
    return this.request<Author[]>(`/api/authors/${authorId}/following/`);
  }

  // Inbox endpoints (when implemented in backend)
  async getInbox(): Promise<Inbox[]> {
    // This endpoint needs to be implemented in backend
    return this.request<Inbox[]>("/api/inbox/");
  }

  async markInboxItemRead(id: string): Promise<Inbox> {
    // This endpoint needs to be implemented in backend
    return this.request<Inbox>(`/api/inbox/${id}/read/`, {
      method: "POST",
    });
  }
  async getAuthorEntries(authorId: string): Promise<Entry[]> {
    const response = await this.request<Entry[]>(
      `/api/authors/${authorId}/entries/`
    );
    // The backend returns the entries directly as an array, not in a results field
    return response;
  }

  async clearInbox(): Promise<void> {
    // This endpoint needs to be implemented in backend
    await this.request("/api/inbox/clear/", {
      method: "POST",
    });
  }
}

// Export a singleton instance
export const api = new ApiService();

// Export the class for testing or custom instances
export default ApiService;
