/**
 * API interceptors for handling authentication errors globally
 */

import { api } from './api';

// Store original fetch to avoid circular references
const originalFetch = window.fetch;

// Override global fetch to intercept all requests
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    const response = await originalFetch(input, init);
    
    // Check if response indicates authentication failure
    if (response.status === 401 || response.status === 403) {
      // Get current path
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on auth pages
      if (currentPath !== '/' && currentPath !== '/signup' && currentPath !== '/auth/callback') {
        // Clear any auth data
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        
        // Redirect to login
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