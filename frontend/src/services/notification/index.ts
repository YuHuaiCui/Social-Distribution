import { BaseApiService } from "../base";

interface Like {
  id: string;
  type: "like";
  author: {
    id: string;
    displayName: string;
    username: string;
    profileImage: string | null;
    url: string;
  };
  entry: {
    id: string;
    title: string;
    url: string;
  };
  created: string;
}

interface FollowRequest {
  id: string;
  type: "follow";
  follower: {
    id: string;
    displayName: string;
    username: string;
    profileImage: string | null;
    url: string;
  };
  followed: string;
  status: "requesting" | "accepted" | "rejected";
  created_at: string;
}

export class NotificationService extends BaseApiService {
  /**
   * Get all likes received on the user's posts
   */
  async getReceivedLikes(): Promise<Like[]> {
    try {
      const response = await this.request<{ type: string; items: Like[] }>(
        "/api/likes/received/"
      );
      return response.items || [];
    } catch (error) {
      console.error("Error fetching received likes:", error);
      return [];
    }
  }

  /**
   * Get all follow requests (with optional status filter)
   */
  async getFollowRequests(allStatuses: boolean = true): Promise<FollowRequest[]> {
    try {
      const url = allStatuses
        ? "/api/follows/requests/?all_statuses=true"
        : "/api/follows/requests/";
      const response = await this.request<FollowRequest[]>(url);
      return response || [];
    } catch (error) {
      console.error("Error fetching follow requests:", error);
      return [];
    }
  }

  /**
   * Combine likes and follow requests into a unified notification format
   */
  async getAllNotifications() {
    const [likes, followRequests] = await Promise.all([
      this.getReceivedLikes(),
      this.getFollowRequests(true), // Get all statuses as requested
    ]);

    // Transform likes into notification format
    const likeNotifications = likes.map((like) => ({
      id: `like-${like.id}`,
      item_type: "like" as const,
      sender: like.author,
      content_data: {
        type: "like",
        data: {
          entry: like.entry.url,
          entry_id: like.entry.id,
          entry_title: like.entry.title,
        },
      },
      created_at: like.created,
      is_read: false, // We don't track read status anymore
    }));

    // Transform follow requests into notification format
    const followNotifications = followRequests.map((follow) => ({
      id: `follow-${follow.id}`,
      item_type: "follow" as const,
      sender: follow.actor,
      content_data: {
        type: "follow",
        data: {
          status: follow.status,
        },
      },
      created_at: follow.created_at,
      is_read: false,
    }));

    // Combine and sort by created date (newest first)
    const allNotifications = [...likeNotifications, ...followNotifications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return allNotifications;
  }
}