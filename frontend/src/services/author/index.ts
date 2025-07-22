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
    const response = await this.request<{ type: "authors"; authors: Author[] }>(
      `/api/authors/${queryString}`
    );

    // Convert CMPUT 404 format to expected PaginatedResponse format
    return {
      count: response.authors.length,
      next: null,
      previous: null,
      results: response.authors,
    };
  }

  /**
   * Get a specific author by ID
   */
  async getAuthor(id: string): Promise<Author> {
    // Extract ID from URL if full URL is passed
    const authorId = id.includes("/")
      ? id.split("/").filter(Boolean).pop()
      : id;
    return this.request<Author>(`/api/authors/${authorId}/`);
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
    formData.append("profile_image_file", file);

    return this.requestFormData<Author>("/api/authors/me/", {
      method: "PATCH",
      body: formData,
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
