/**
 * Main services export file
 * Re-exports all service instances for convenient importing
 */

// Export individual services
export { authService } from './auth';
export { authorService } from './author';
export { entryService } from './entry';
export { socialService } from './social';
export { nodeService } from './node';

// Export service classes for custom instances
export { default as AuthService } from './auth';
export { default as AuthorService } from './author';
export { default as EntryService } from './entry';
export { default as SocialService } from './social';
export { default as NodeService } from './node';
export { default as BaseApiService } from './base';

// Legacy api export for backwards compatibility
import { authService } from './auth';
import { authorService } from './author';
import { entryService } from './entry';
import { socialService } from './social';
import { nodeService } from './node';

/**
 * Legacy API object for backwards compatibility
 * @deprecated Use individual service imports instead
 */
export const api = {
  // Auth methods
  login: authService.login.bind(authService),
  logout: authService.logout.bind(authService),
  signup: authService.signup.bind(authService),
  getAuthStatus: authService.getAuthStatus.bind(authService),

  // Author methods
  getAuthors: authorService.getAuthors.bind(authorService),
  getAuthor: authorService.getAuthor.bind(authorService),
  getCurrentAuthor: authorService.getCurrentAuthor.bind(authorService),
  updateCurrentAuthor: authorService.updateCurrentAuthor.bind(authorService),
  uploadProfileImage: authorService.uploadProfileImage.bind(authorService),
  changePassword: authorService.changePassword.bind(authorService),
  getAuthorEntries: authorService.getAuthorEntries.bind(authorService),
  
  // Admin methods
  approveAuthor: authorService.approveAuthor.bind(authorService),
  deactivateAuthor: authorService.deactivateAuthor.bind(authorService),
  activateAuthor: authorService.activateAuthor.bind(authorService),
  deleteAuthor: authorService.deleteAuthor.bind(authorService),
  promoteToAdmin: authorService.promoteToAdmin.bind(authorService),

  // Entry methods
  getEntries: entryService.getEntries.bind(entryService),
  getEntry: entryService.getEntry.bind(entryService),
  createEntry: entryService.createEntry.bind(entryService),
  updateEntry: entryService.updateEntry.bind(entryService),
  deleteEntry: entryService.deleteEntry.bind(entryService),

  // Comment methods
  getComments: entryService.getComments.bind(entryService),
  createComment: entryService.createComment.bind(entryService),

  // Like methods
  likeEntry: socialService.likeEntry.bind(socialService),
  unlikeEntry: socialService.unlikeEntry.bind(socialService),

  // Follow methods
  followAuthor: socialService.followAuthor.bind(socialService),
  unfollowAuthor: socialService.unfollowAuthor.bind(socialService),
  getFollowers: socialService.getFollowers.bind(socialService),
  getFollowing: socialService.getFollowing.bind(socialService),

  // Node management methods (admin only)
  getNodes: nodeService.getNodes.bind(nodeService),
  addNode: nodeService.addNode.bind(nodeService),
  updateNode: nodeService.updateNode.bind(nodeService),
  deleteNode: nodeService.deleteNode.bind(nodeService),

};