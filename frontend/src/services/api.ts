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
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);


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

    const defaultHeaders: HeadersInit = {};

    // Only set Content-Type if not FormData
    if (!(options.body instanceof FormData)) {
      defaultHeaders["Content-Type"] = "application/json";
    }

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

    // Handle empty responses (like 204 No Content for DELETE operations)
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType?.includes("application/json")) {
      return {} as T;
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

  async searchAuthors(
    query: string,
    params?: {
      is_approved?: boolean;
      is_active?: boolean;
      type?: "local" | "remote";
      page?: number;
    }
  ): Promise<PaginatedResponse<Author>> {
    return this.getAuthors({ ...params, search: query });
  }

  async getAuthor(id: string): Promise<Author> {
    // Extract ID from URL if full URL is passed
    const authorId = id.includes("/")
      ? id.split("/").filter(Boolean).pop()
      : id;
    return this.request<Author>(`/api/authors/${authorId}/`);
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
    if (data.location !== undefined) backendData.location = data.location;
    if (data.website !== undefined) backendData.website = data.website;
    if (data.profile_image !== undefined)
      backendData.profile_image = data.profile_image;
    if (data.email !== undefined) backendData.email = data.email;

    return this.request<Author>("/api/authors/me/", {
      method: "PATCH",
      body: JSON.stringify(backendData),
    });
  }

  async changePassword(data: {
    password: string;
    password_confirm: string;
  }): Promise<Author> {
    return this.request<Author>("/api/authors/me/", {
      method: "PATCH",
      body: JSON.stringify(data),
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
    // Extract ID from URL if full URL is passed
    const entryId = id.includes("/") ? id.split("/").filter(Boolean).pop() : id;
    // This endpoint needs to be implemented in backend
    return this.request<Entry>(`/api/entries/${entryId}/`);
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
    // Extract ID from URL if full URL is passed
    const entryId = id.includes("/") ? id.split("/").filter(Boolean).pop() : id;
    // This endpoint needs to be implemented in backend
    return this.request<Entry>(`/api/entries/${entryId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteEntry(id: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const entryId = id.includes("/") ? id.split("/").filter(Boolean).pop() : id;
    // This endpoint needs to be implemented in backend
    await this.request(`/api/entries/${entryId}/`, {
      method: "DELETE",
    });
  }

  // Comment endpoints - backend completed
  async getComments(entryId: string): Promise<Comment[]> {
    // Extract ID from URL if full URL is passed
    const id = entryId.includes("/")
      ? entryId.split("/").filter(Boolean).pop()
      : entryId;
    return this.request<Comment[]>(`/api/entries/${id}/comments/`);
  }

  async createComment(
    entryId: string,
    data: {
      content: string;
      content_type?: string;
    }
  ): Promise<Comment> {
    // Extract ID from URL if full URL is passed
    const id = entryId.includes("/")
      ? entryId.split("/").filter(Boolean).pop()
      : entryId;
    return this.request<Comment>(`/api/entries/${id}/comments/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Like endpoints - backend completed
  async likeEntry(entryId: string): Promise<Like> {
    // Extract ID from URL if full URL is passed
    const id = entryId.includes("/")
      ? entryId.split("/").filter(Boolean).pop()
      : entryId;
    return this.request<Like>(`/api/entries/${id}/likes/`, {
      method: "POST",
    });
  }

  async unlikeEntry(entryId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = entryId.includes("/")
      ? entryId.split("/").filter(Boolean).pop()
      : entryId;
    await this.request(`/api/entries/${id}/likes/`, {
      method: "DELETE",
    });
  }

  async getEntryLikeStatus(
    entryId: string
  ): Promise<{ like_count: number; liked_by_current_user: boolean }> {
    // Extract ID from URL if full URL is passed
    const id = entryId.includes("/")
      ? entryId.split("/").filter(Boolean).pop()
      : entryId;
    return this.request<{ like_count: number; liked_by_current_user: boolean }>(
      `/api/entries/${id}/likes/`,
      {
        method: "GET",
      }
    );
  }

  // Follow endpoints - backend implemented
  async followAuthor(authorId: string): Promise<Follow> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request<Follow>(`/api/authors/${id}/follow/`, {
      method: "POST",
    });
  }

  async unfollowAuthor(authorId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    await this.request(`/api/authors/${id}/follow/`, {
      method: "DELETE",
    });
  }

  async getFollowers(authorId: string): Promise<Author[]> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    const response = await this.request<{
      type: "followers";
      followers: Author[];
    }>(`/api/authors/${id}/followers/`);
    return response.followers;
  }

  async getFollowing(authorId: string): Promise<Author[]> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    const response = await this.request<{
      type: "following";
      following: Author[];
    }>(`/api/authors/${id}/following/`);
    return response.following;
  }

  async getFriends(authorId: string): Promise<Author[]> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    const response = await this.request<{ type: "friends"; friends: Author[] }>(
      `/api/authors/${id}/friends/`
    );
    return response.friends;
  }

  // Admin endpoints
  async approveAuthor(authorId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request(`/api/authors/${id}/approve/`, {
      method: "POST",
    });
  }

  async deactivateAuthor(authorId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request(`/api/authors/${id}/deactivate/`, {
      method: "POST",
    });
  }

  async activateAuthor(authorId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request(`/api/authors/${id}/activate/`, {
      method: "POST",
    });
  }

  async deleteAuthor(authorId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request(`/api/authors/${id}/`, { method: "DELETE" });
  }

  async promoteToAdmin(authorId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request(`/api/authors/${id}/promote_to_admin/`, {
      method: "POST",
    });
  }

  // Inbox endpoints (when implemented in backend)
  async getInbox(): Promise<Inbox[]> {
    // This endpoint needs to be implemented in backend
    return this.request<Inbox[]>("/api/inbox/");
  }

  async markInboxItemRead(id: string): Promise<Inbox> {
    // Extract ID from URL if full URL is passed
    const inboxId = id.includes("/") ? id.split("/").filter(Boolean).pop() : id;
    // This endpoint needs to be implemented in backend
    return this.request<Inbox>(`/api/inbox/${inboxId}/read/`, {
      method: "POST",
    });
  }
  async getAuthorEntries(authorId: string): Promise<Entry[]> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    const response = await this.request<{
      type: "entries";
      page_number: number;
      size: number;
      count: number;
      src: Entry[];
    }>(`/api/authors/${id}/entries/`);
    // Return the entries from the CMPUT 404 compliant format
    return response.src;
  }

  async clearInbox(): Promise<void> {
    // This endpoint needs to be implemented in backend
    await this.request("/api/inbox/clear/", {
      method: "POST",
    });
  }

  async getLikedEntries(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Entry>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    return this.request<PaginatedResponse<Entry>>(
      `/api/entries/liked/?${queryParams.toString()}`
    );
  }

  // Node Management
  async getNodes(): Promise<any[]> {
    console.log("Calling getNodes API...");
    const response = await this.request("/api/nodes/");
    console.log("getNodes API response:", response);
    return response;
  }

  async addNode(nodeData: {
    name: string;
    host: string;
    username: string;
    password: string;
    is_active: boolean;
  }): Promise<any> {
    return this.request("/api/nodes/add/", {
      method: "POST",
      body: JSON.stringify(nodeData),
    });
  }

  async updateNode(nodeData: {
    oldHost: string;
    host: string;
    username: string;
    password: string;
    isAuth: boolean;
  }): Promise<any> {
    return this.request("/api/nodes/update/", {
      method: "PUT",
      body: JSON.stringify(nodeData),
    });
  }

  async deleteNode(host: string): Promise<any> {
    return this.request("/api/nodes/remove/", {
      method: "DELETE",
      body: JSON.stringify({ host }),
    });
  }
}

// Export a singleton instance
export const api = new ApiService();

// Export the class for testing or custom instances
export default ApiService;
