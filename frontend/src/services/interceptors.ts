/**
 * API interceptors for handling authentication errors globally
 */

import { api } from './api';

// Store original fetch to avoid circular references
const originalFetch = window.fetch;

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/signup', '/forgot-password', '/auth/callback'];

// Override global fetch to intercept all requests
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    const response = await originalFetch(input, init);
    
    // Check if response indicates authentication failure
    if (response.status === 401 || response.status === 403) {
      // Get current path
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on public routes
      if (!PUBLIC_ROUTES.includes(currentPath)) {
        // Session will be cleared by Django on logout
        
        // Force a page reload to trigger auth check and redirect
        window.location.href = '/';
      }
    }
    
    return response;
  } catch (error) {
    // Re-throw network errors
    throw error;
  }
};

export default {};