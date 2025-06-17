/**
 * Base API Service class that provides common functionality for all API services
 */

// Use relative URLs in production, absolute URLs in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? "http://localhost:8000" : "");

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class BaseApiService {
  protected baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get CSRF token from cookies
   */
  protected getCsrfToken(): string | undefined {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];
  }

  /**
   * Get auth token from localStorage or sessionStorage
   */
  protected getAuthToken(): string | undefined {
    return (
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken") ||
      undefined
    );
  }

  /**
   * Helper method for making HTTP requests
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { skipAuth = false, ...fetchOptions } = options;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add CSRF token if available
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      defaultHeaders["X-CSRFToken"] = csrfToken;
    }

    // Add auth token if available and not skipped
    if (!skipAuth) {
      const authToken = this.getAuthToken();
      if (authToken) {
        defaultHeaders["Authorization"] = `Token ${authToken}`;
      }
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...fetchOptions.headers,
      },
      credentials: "include", // Always include cookies
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(
          error.message ||
            error.detail ||
            `HTTP error! status: ${response.status}`
        );
      }

      // Handle empty responses (like 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  /**
   * Helper method for building query strings
   */
  protected buildQueryString(params: Record<string, any>): string {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  /**
   * Helper method for handling FormData requests (e.g., file uploads)
   */
  protected async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    options: RequestOptions = {}
  ): Promise<T> {
    const { headers = {}, ...otherOptions } = options;

    // Remove Content-Type header to let browser set it with boundary for FormData
    const { "Content-Type": _, ...otherHeaders } = headers as Record<
      string,
      string
    >;

    return this.request<T>(endpoint, {
      ...otherOptions,
      method: "POST",
      headers: otherHeaders,
      body: formData,
    });
  }
}

export default BaseApiService;
