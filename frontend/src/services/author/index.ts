/**
 * Author Service
 * Handles author-related API calls
 */

import { BaseApiService } from "../base";
import type {
  Author,
  AuthorUpdateData,
  AuthorSearchParams,
  PaginatedResponse,
} from "../../types";

export class AuthorService extends BaseApiService {
  /**
   * Get paginated list of authors
   */
  async getAuthors(
    params?: AuthorSearchParams
  ): Promise<PaginatedResponse<Author>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<
      | PaginatedResponse<Author> // Standard paginated format
      | { type: "authors"; authors: Author[] } // CMPUT 404 format
    >(`/api/authors/${queryString}`);

    // Handle both paginated response format and CMPUT 404 format
    if ("results" in response) {
      // Standard paginated response
      return response;
    } else if ("authors" in response) {
      // CMPUT 404 format - convert to paginated format
      return {
        count: response.authors.length,
        next: null,
        previous: null,
        results: response.authors,
      };
    } else {
      // Fallback - empty response
      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    }
  }

  /**
   * Get a specific author by ID
   */
  async getAuthor(id: string): Promise<Author> {
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
          const remoteAuthor = await this.request<Author>(`/api/authors/by-url/${encodedUrl}/`);
          return remoteAuthor;
        } catch (remoteError) {
          console.warn("Failed to fetch fresh remote author data, using cached data:", remoteError);
          // Fall back to cached local data
          return author;
        }
      }
      
      return author;
    } catch (error) {
      // If local lookup failed, try to find if this might be a remote author
      // by checking if we have any cached remote authors with this ID
      try {
        const allAuthors = await this.getAuthors({ type: 'remote' });
        const remoteAuthor = allAuthors.results.find(a => {
          const extractedId = a.id.includes("/") 
            ? a.id.split("/").filter(Boolean).pop() 
            : a.id;
          return extractedId === authorId;
        });
        
        if (remoteAuthor) {
          // Found a remote author with this ID, fetch fresh data
          const encodedUrl = encodeURIComponent(remoteAuthor.url || remoteAuthor.id);
          return this.request<Author>(`/api/authors/by-url/${encodedUrl}/`);
        }
      } catch (remoteError) {
        console.warn("Failed to find or fetch remote author:", remoteError);
      }
      
      // If all else fails, throw the original error
      throw error;
    }
  }

  /**
   * Get the current authenticated author
   */
  async getCurrentAuthor(): Promise<Author> {
    return this.request<Author>("/api/authors/me/");
  }

  /**
   * Update the current author's profile
   */
  async updateCurrentAuthor(data: AuthorUpdateData): Promise<Author> {
    return this.request<Author>("/api/authors/me/", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Upload profile image for current author
   */
  async uploadProfileImage(file: File): Promise<Author> {
    const formData = new FormData();
    formData.append("profileImage_file", file);

    return this.requestFormData<Author>("/api/authors/me/", formData, {
      method: "PATCH",
    });
  }

  /**
   * Search authors by query
   */
  async searchAuthors(
    query: string,
    params?: Omit<AuthorSearchParams, "search">
  ): Promise<PaginatedResponse<Author>> {
    return this.getAuthors({ ...params, search: query });
  }

  /**
   * Get author statistics
   */
  async getAuthorStats(id: string): Promise<{
    posts_count: number;
    followers_count: number;
    following_count: number;
    friends_count: number;
  }> {
    return this.request(`/api/authors/${id}/stats/`);
  }

  /**
   * Get author's GitHub activity
   */
  async getGitHubActivity(id: string): Promise<{
    contributions: Array<{ date: string; count: number }>;
    repositories: Array<{ name: string; stars: number; language: string }>;
    total_contributions: number;
  }> {
    return this.request(`/api/authors/${id}/github-activity/`);
  }

  /**
   * Check if current user can edit this author
   */
  canEdit(author: Author, currentUser?: Author | null): boolean {
    if (!currentUser) return false;
    return author.id === currentUser.id || currentUser.is_superuser === true;
  }

  /**
   * Check if author is remote
   */
  isRemote(author: Author): boolean {
    return author.is_remote === true || author.node !== null;
  }

  /**
   * Check if author is local
   */
  isLocal(author: Author): boolean {
    return !this.isRemote(author);
  }
}

// Export singleton instance
export const authorService = new AuthorService();

export default AuthorService;
