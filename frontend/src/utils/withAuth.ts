/**
 * Higher-order function to wrap API calls with authentication checks
 */

export function withAuth<T extends (...args: any[]) => Promise<any>>(
  apiCall: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      // Check if it's an authentication error
      if (error instanceof Error && 
          (error.message.includes('401') || 
           error.message.includes('403') || 
           error.message.includes('Unauthorized') ||
           error.message.includes('Forbidden'))) {
        
        // Session will be cleared by Django
        
        // Redirect to login if not already there
        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '/signup' && currentPath !== '/auth/callback') {
          window.location.href = '/';
        }
      }
      
      // Re-throw the error for component-level handling
      throw error;
    }
  }) as T;
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: string): boolean {
  // This can be expanded based on your permission system
  // For now, we'll check if user has a session cookie
  const hasSession = document.cookie.includes('sessionid');
  
  return hasSession;
}