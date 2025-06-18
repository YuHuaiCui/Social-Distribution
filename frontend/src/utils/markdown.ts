/**
 * Shared markdown rendering utility
 * Provides consistent markdown rendering across the application
 */

export const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  
  // Comprehensive markdown rendering
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-2 mt-4 text-text-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 mt-6 text-text-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 mt-6 text-text-1">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre class="bg-glass-low rounded-lg p-4 mb-4 overflow-x-auto"><code class="text-sm text-text-1">$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-glass-low px-1.5 py-0.5 rounded text-sm text-[var(--primary-violet)]">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--primary-violet)] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full h-auto my-4" />')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-[var(--primary-violet)] pl-4 py-2 my-4 text-text-2 italic">$1</blockquote>')
    // Unordered lists
    .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc text-text-1">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-6 list-decimal text-text-1">$1</li>')
    // Line breaks - handle double newlines as paragraph breaks
    .replace(/\n\n/g, '</p><p class="mb-4 text-text-1">')
    // Single newlines as line breaks
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if content exists
  if (html.trim()) {
    html = `<p class="mb-4 text-text-1">${html}</p>`;
  }
  
  return html;
}; 