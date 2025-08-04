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
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);
console.log("Using API_BASE_URL =", API_BASE_URL);

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
    // Create Basic Auth header
    const basicAuth = btoa(`${credentials.username}:${credentials.password}`);
    
    // Only send remember_me in request body
    const requestBody = credentials.remember_me !== undefined 
      ? { remember_me: credentials.remember_me }
      : {};

    const response = await this.request<any>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
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
    // Check if this looks like a remote author URL
    if (id.includes("http") || (id.includes("/") && id.split("/").length > 2)) {
      // This is likely a remote author URL, use the by-url endpoint
      const encodedUrl = encodeURIComponent(id);
      return this.request<Author>(`/api/authors/by-url/${encodedUrl}/`);
    } else {
      // This is a local author ID, use the standard endpoint
      // Extract ID from URL if full URL is passed
      const authorId = id.includes("/")
        ? id.split("/").filter(Boolean).pop()
        : id;

      try {
        // First, try to get the author using the standard endpoint
        const author = await this.request<Author>(`/api/authors/${authorId}/`);

        // If the author has a node property (is remote), fetch fresh data from remote
        if (author.node) {
          try {
            const encodedUrl = encodeURIComponent(author.url || author.id);
            const remoteAuthor = await this.request<Author>(
              `/api/authors/by-url/${encodedUrl}/`
            );
            return remoteAuthor;
          } catch (remoteError) {
            console.warn(
              "Failed to fetch fresh remote author data, using cached data:",
              remoteError
            );
            // Fall back to cached local data
            return author;
          }
        }

        return author;
      } catch (error) {
        // If local lookup failed, try to find if this might be a remote author
        // by checking if we have any cached remote authors with this ID
        try {
          const allAuthors = await this.getAuthors({ type: "remote" });
          const remoteAuthor = allAuthors.results.find((a) => {
            const extractedId = a.id.includes("/")
              ? a.id.split("/").filter(Boolean).pop()
              : a.id;
            return extractedId === authorId;
          });

          if (remoteAuthor) {
            // Found a remote author with this ID, fetch fresh data
            const encodedUrl = encodeURIComponent(
              remoteAuthor.url || remoteAuthor.id
            );
            return this.request<Author>(`/api/authors/by-url/${encodedUrl}/`);
          }
        } catch (remoteError) {
          console.warn("Failed to find or fetch remote author:", remoteError);
        }

        // If all else fails, throw the original error
        throw error;
      }
    }
  }

  async getCurrentAuthor(): Promise<Author> {
    return this.request<Author>("/api/authors/me/");
  }

  async updateCurrentAuthor(data: Partial<Author>): Promise<Author> {
    // Convert to snake_case for backend
    const backendData: any = {};
    if (data.displayName !== undefined)
      backendData.displayName = data.displayName;
    if (data.github_username !== undefined)
      backendData.github_username = data.github_username;
    if (data.bio !== undefined) backendData.bio = data.bio;
    if (data.location !== undefined) backendData.location = data.location;
    if (data.website !== undefined) backendData.website = data.website;
    if (data.profileImage !== undefined)
      backendData.profileImage = data.profileImage;
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
    formData.append("profileImage", file);

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
    // If this looks like a full URL, use the by-url endpoint
    if (id.includes("http") || (id.includes("/") && id.split("/").length > 2)) {
      const encodedUrl = encodeURIComponent(id);
      return this.request<Entry>(`/api/entries/by-url/?url=${encodedUrl}`);
    }

    // Extract ID from URL if it's a path
    const entryId = id.includes("/") ? id.split("/").filter(Boolean).pop() : id;
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
    const response = await this.request<{
      type: "likes";
      web: string;
      id: string;
      page_number: number;
      size: number;
      count: number;
      src: Array<{
        type: "like";
        author: any;
        published: string;
        id: string;
        object: string;
      }>;
    }>(`/api/entries/${id}/likes/`, {
      method: "GET",
    });

    // Get current user info from context (if available) to check if user liked the entry
    const currentUserResponse = await this.request<any>('/api/author/me/');
    const currentUserId = currentUserResponse?.id;

    // Check if current user has liked this entry
    const liked_by_current_user = currentUserId 
      ? response.src.some(like => like.author.id === currentUserId)
      : false;

    return {
      like_count: response.count,
      liked_by_current_user
    };
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
    // For remote authors (full URLs), encode the URL for the API call
    // For local authors (UUIDs), use as-is
    const id = authorId.includes("/") ? encodeURIComponent(authorId) : authorId;
    const response = await this.request<{
      type: "followers";
      followers: Author[];
    }>(`/api/authors/${id}/followers/`);
    return response.followers;
  }

  async getFollowing(authorId: string): Promise<Author[]> {
    // For remote authors (full URLs), encode the URL for the API call
    // For local authors (UUIDs), use as-is
    const id = authorId.includes("/") ? encodeURIComponent(authorId) : authorId;
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

  async getPendingAuthors(): Promise<Author[]> {
    return this.request<Author[]>("/api/authors/pending/");
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
    // Check if this looks like a remote author URL
    if (
      authorId.includes("http") ||
      (authorId.includes("/") && authorId.split("/").length > 2)
    ) {
      // For remote authors, we need to get their local cached data first to find their entries
      // Since we can't directly fetch entries from remote nodes in this implementation
      try {
        // Get the remote author first to check if they exist locally
        const author = await this.getAuthor(authorId);
        if (author && author.node) {
          // This is a remote author - we can't fetch their entries directly
          // Return empty array for now since remote entries fetching isn't implemented
          console.warn("Remote author entries fetching not yet implemented");
          return [];
        }
      } catch (error) {
        console.warn(
          "Could not fetch remote author for entries lookup:",
          error
        );
        return [];
      }
    }

    // Extract ID from URL if full URL is passed (for local authors)
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;

    try {
      const response = await this.request<{
        type: "entries";
        page_number: number;
        size: number;
        count: number;
        src: Entry[];
      }>(`/api/authors/${id}/entries/`);
      // Return the entries from the CMPUT 404 compliant format
      return response.src;
    } catch (error) {
      console.warn("Failed to fetch author entries:", error);
      return [];
    }
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
    return Array.isArray(response) ? response : [];
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

  async refreshNode(host: string): Promise<any> {
    return this.request("/api/nodes/refresh/", {
      method: "POST",
      body: JSON.stringify({ host }),
    });
  }
}

// Export a singleton instance
export const api = new ApiService();

// Export the class for testing or custom instances
export default ApiService;
