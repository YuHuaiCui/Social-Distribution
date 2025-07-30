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
 * Check if an author is remote by examining backend flags
 * Remote authors have a node property (not null), local authors have node = null
 */
export function isRemoteAuthor(author: { id: string; node?: any; is_remote?: boolean }): boolean {
  // Check explicit remote flag first
  if (author.is_remote === true) {
    return true;
  }
  
  // Check if author has a node property - this is the authoritative backend field
  // Local authors have node = null, remote authors have node = <node_object>
  return author.node != null;
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
