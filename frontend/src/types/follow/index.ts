export interface Follow {
    id: number;
    follower: string;  // URL of the follower
    followed: string;  // URL of the followed author
    status: 'requesting' | 'accepted' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface FollowRequest {
    followed: string;  // URL of the author to follow
} 