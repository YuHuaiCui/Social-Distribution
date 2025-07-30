/**
 * Node Management Service
 * Handles CRUD operations for federated nodes
 */

import { BaseApiService } from "../base";

export interface Node {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  is_active: boolean;
  created_at: string;
}

export interface NodeFormData {
  name: string;
  host: string;
  username: string;
  password: string;
  is_active: boolean;
}

export interface NodeUpdateData {
  oldHost: string;
  host: string;
  username: string;
  password: string;
  isAuth: boolean;
}

export class NodeService extends BaseApiService {
  /**
   * Get all nodes (admin only)
   */
  async getNodes(): Promise<Node[]> {
    console.log("NodeService: Calling getNodes API...");
    const response = await this.request<Node[]>("/api/nodes/");
    console.log("NodeService: getNodes API response:", response);
    return Array.isArray(response) ? response : [];
  }

  /**
   * Add a new node (admin only)
   */
  async addNode(nodeData: NodeFormData): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/nodes/add/", {
      method: "POST",
      body: JSON.stringify(nodeData),
    });
  }

  /**
   * Update an existing node (admin only)
   */
  async updateNode(nodeData: NodeUpdateData): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/nodes/update/", {
      method: "PUT",
      body: JSON.stringify(nodeData),
    });
  }

  /**
   * Delete a node (admin only)
   */
  async deleteNode(host: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/nodes/remove/", {
      method: "DELETE",
      body: JSON.stringify({ host }),
    });
  }
}

// Export singleton instance
export const nodeService = new NodeService();

export default NodeService;