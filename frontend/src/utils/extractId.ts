/**
 * Extract UUID from a URL or return the string if it's already a UUID
 */
export function extractUUID(idOrUrl: string): string {
  if (!idOrUrl) return "";

  // If it contains slashes, it's likely a URL
  if (idOrUrl.includes("/")) {
    // Extract the UUID from the URL (last segment)
    const segments = idOrUrl.split("/").filter((segment) => segment.length > 0);

    // Look for a UUID-like segment from the end
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (isValidUUID(segment)) {
        return segment;
      }
    }

    // If no UUID found, return the last segment
    return segments[segments.length - 1] || idOrUrl;
  }

  // Otherwise, return as-is (should be a UUID)
  return idOrUrl;
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Extract IP address or hostname from a URL
 */
export function extractIPFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Check if an author is remote by examining if their ID/URL matches the backend IP address
 * Local authors have IDs that match the backend IP, remote authors have different IPs
 */
export function isRemoteAuthor(author: { id: string; url?: string; node?: any; is_remote?: boolean }): boolean {
  // First check explicit flags if available
  if (author.is_remote === true) {
    return true;
  }
  
  // Check if author has a node property (backend indicator for remote authors)
  if (author.node != null) {
    return true;
  }
  
  // Get the backend IP address from environment or default to localhost
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const backendIP = extractIPFromUrl(backendUrl);
  
  // Check if the author's ID or URL matches the backend IP address
  const authorId = author.url || author.id;
  
  if (authorId) {
    // If it's just a UUID, it's local
    if (isValidUUID(authorId)) {
      return false;
    }
    
    // If it starts with http/https, check if the IP matches the backend IP
    if (authorId.startsWith('http://') || authorId.startsWith('https://')) {
      const authorIP = extractIPFromUrl(authorId);
      // If the IP matches the backend IP, it's local; otherwise it's remote
      return authorIP !== backendIP;
    }
  }
  
  return false;
}

/**
 * Generate the correct author URL for routing
 * For remote authors: use FQID (full URL)
 * For local authors: use UUID
 */
export function getAuthorUrl(author: { id: string; url?: string; node?: any; is_remote?: boolean }): string {
  if (isRemoteAuthor(author)) {
    // This is a remote author - use the full URL (FQID)
    const fqid = author.url || author.id;
    return `/authors/${encodeURIComponent(fqid)}`;
  } else {
    // This is a local author - use UUID
    const uuid = extractUUID(author.id);
    return `/authors/${uuid}`;
  }
}

/**
 * Check if an entry is remote by examining its URL or author
 */
export function isRemoteEntry(entry: { id: string; url?: string; author?: any }): boolean {
  // If entry has a URL that starts with http and doesn't match our backend
  if (entry.url && (entry.url.startsWith('http://') || entry.url.startsWith('https://'))) {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const backendIP = extractIPFromUrl(backendUrl);
    const entryIP = extractIPFromUrl(entry.url);
    
    // If the entry URL's IP doesn't match our backend, it's remote
    if (entryIP !== backendIP) {
      return true;
    }
  }
  
  // If the entry's author is remote, the entry is likely remote too
  if (entry.author && isRemoteAuthor(entry.author)) {
    return true;
  }
  
  return false;
}

/**
 * Get the appropriate entry identifier for API calls
 * For remote entries: return the full URL
 * For local entries: return the UUID
 */
export function getEntryIdentifier(entry: { id: string; url?: string; author?: any }): string {
  if (isRemoteEntry(entry)) {
    // For remote entries, use the full URL
    return entry.url || entry.id;
  } else {
    // For local entries, use the UUID
    return extractUUID(entry.id);
  }
}

/**
 * Generate the correct entry URL for routing
 * For remote entries: use a special route that indicates remote handling
 * For local entries: use UUID
 */
export function getEntryUrl(entry: { id: string; url?: string; author?: any }): string {
  if (isRemoteEntry(entry)) {
    // For remote entries, we'll use a special route format
    const entryUrl = entry.url || entry.id;
    return `/posts/remote/${encodeURIComponent(entryUrl)}`;
  } else {
    // For local entries, use UUID
    const uuid = extractUUID(entry.id);
    return `/posts/${uuid}`;
  }
}
