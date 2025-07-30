import type { Follow, FollowRequest } from '../../types/follow/index';

const API_URL = import.meta.env.VITE_API_URL || '';

export const followService = {
    // Get all pending follow requests for the current user
    getRequestingFollowRequests: async (): Promise<Follow[]> => {
        const response = await fetch(`${API_URL}/api/follows/`, {
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to fetch follow requests');
        }
        return response.json();
    },

    // Send a follow request
    sendFollowRequest: async (request: FollowRequest): Promise<Follow> => {
        const response = await fetch(`${API_URL}/api/follows/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error('Failed to send follow request');
        }
        return response.json();
    },

    // Accept a follow request
    acceptFollowRequest: async (followId: number): Promise<{ status: string }> => {
        const response = await fetch(`${API_URL}/api/follows/${followId}/accept/`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to accept follow request');
        }
        return response.json();
    },

    // Reject a follow request
    rejectFollowRequest: async (followId: number): Promise<{ status: string }> => {
        const response = await fetch(`${API_URL}/api/follows/${followId}/reject/`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to reject follow request');
        }
        return response.json();
    },

    // Unfollow an author
    unfollow: async (followId: number): Promise<void> => {
        const response = await fetch(`${API_URL}/api/follows/${followId}/`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to unfollow');
        }
    },
}; 