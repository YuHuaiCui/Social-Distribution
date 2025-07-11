import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  Image,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  Maximize2,
  Minimize2,
  HelpCircle,
  FileText,
  Split,
  Undo,
  Redo,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  disabled?: boolean;
}

interface ToolbarButton {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  action: () => void;
  shortcut?: string;
}

type ViewMode = "edit" | "preview" | "split";

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your content in Markdown...",
  minHeight = 300,
  maxHeight = 600,
  className = "",
  disabled = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Insert text at cursor position
  const insertText = useCallback(
    (before: string, after: string = "", defaultText: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || defaultText;
      const newValue =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newValue);

      // Update history
      const newHistory = [...history.slice(0, historyIndex + 1), newValue];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange, history, historyIndex]
  );

  // Toolbar actions
  const toolbarButtons: ToolbarButton[] = [
    {
      icon: Bold,
      label: "Bold",
      action: () => insertText("**", "**", "bold text"),
      shortcut: "Ctrl+B",
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => insertText("*", "*", "italic text"),
      shortcut: "Ctrl+I",
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      action: () => insertText("~~", "~~", "strikethrough"),
    },
    {
      icon: Code,
      label: "Code",
      action: () => insertText("`", "`", "code"),
      shortcut: "Ctrl+`",
    },
    {
      icon: Link2,
      label: "Link",
      action: () => insertText("[", "](url)", "link text"),
      shortcut: "Ctrl+K",
    },
    {
      icon: Image,
      label: "Image",
      action: () => insertText("![", "](url)", "alt text"),
    },
    {
      icon: List,
      label: "Bullet List",
      action: () => insertText("- ", "", "list item"),
    },
    {
      icon: ListOrdered,
      label: "Numbered List",
      action: () => insertText("1. ", "", "list item"),
    },
    {
      icon: Quote,
      label: "Quote",
      action: () => insertText("> ", "", "quote"),
    },
    {
      icon: Heading1,
      label: "Heading 1",
      action: () => insertText("# ", "", "Heading 1"),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      action: () => insertText("## ", "", "Heading 2"),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      action: () => insertText("### ", "", "Heading 3"),
    },
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          toolbarButtons.find((btn) => btn.label === "Bold")?.action();
          break;
        case "i":
          e.preventDefault();
          toolbarButtons.find((btn) => btn.label === "Italic")?.action();
          break;
        case "k":
          e.preventDefault();
          toolbarButtons.find((btn) => btn.label === "Link")?.action();
          break;
        case "`":
          e.preventDefault();
          toolbarButtons.find((btn) => btn.label === "Code")?.action();
          break;
        case "z":
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
      }
    }
  };

  // Undo/Redo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Render markdown preview
  const renderMarkdown = (markdown: string) => {
    // Simple markdown rendering - in production, use a proper markdown parser
    let html = markdown
      // Headers
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-xl font-semibold mb-2 mt-4 text-text-1">$1</h3>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-2xl font-semibold mb-3 mt-6 text-text-1">$1</h2>'
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="text-3xl font-bold mb-4 text-text-1">$1</h1>'
      )
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Strikethrough
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      // Code blocks
      .replace(
        /```([^`]+)```/g,
        '<pre class="bg-glass-low rounded-lg p-4 mb-4 overflow-x-auto"><code class="text-sm text-text-1">$1</code></pre>'
      )
      // Inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-glass-low px-1.5 py-0.5 rounded text-sm text-[var(--primary-violet)]">$1</code>'
      )
      // Links
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-[var(--primary-violet)] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
      )
      // Images
      .replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" class="rounded-lg max-w-full h-auto my-4" />'
      )
      // Blockquotes
      .replace(
        /^> (.*$)/gim,
        '<blockquote class="border-l-4 border-[var(--primary-violet)] pl-4 py-2 my-4 text-text-2">$1</blockquote>'
      )
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc text-text-1">$1</li>')
      .replace(
        /^\d+\. (.*$)/gim,
        '<li class="ml-6 list-decimal text-text-1">$1</li>'
      )
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4 text-text-1">')
      .replace(/\n/g, "<br>");

    return `<div class="prose prose-lg max-w-none"><p class="mb-4 text-text-1">${html}</p></div>`;
  };

  const viewModeButtons = [
    { mode: "edit" as ViewMode, icon: FileText, label: "Edit Only" },
    { mode: "split" as ViewMode, icon: Split, label: "Split View" },
    { mode: "preview" as ViewMode, icon: Eye, label: "Preview Only" },
  ];

  return (
    <div
      className={`${className} ${
        isFullscreen ? "fixed inset-0 z-50 bg-bg-1" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="glass-card-subtle rounded-t-lg border-b border-border-1 p-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Formatting Tools */}
          <div className="flex items-center space-x-1">
            {toolbarButtons.map((button) => {
              const Icon = button.icon;
              return (
                <motion.button
                  key={button.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.preventDefault();
                    button.action();
                  }}
                  disabled={disabled}
                  className="p-2 rounded hover:bg-glass-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
                  title={`${button.label}${
                    button.shortcut ? ` (${button.shortcut})` : ""
                  }`}
                >
                  <Icon
                    size={18}
                    className="text-text-2 group-hover:text-text-1"
                  />
                </motion.button>
              );
            })}

            <div className="w-px h-6 bg-border-1 mx-1" />

            {/* Undo/Redo */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUndo}
              disabled={disabled || historyIndex === 0}
              className="p-2 rounded hover:bg-glass-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={18} className="text-text-2" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRedo}
              disabled={disabled || historyIndex === history.length - 1}
              className="p-2 rounded hover:bg-glass-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo size={18} className="text-text-2" />
            </motion.button>
          </div>

          {/* View Mode & Actions */}
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-glass-low rounded-lg p-1">
              {viewModeButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <motion.button
                    key={btn.mode}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode(btn.mode)}
                    className={`p-1.5 rounded transition-all ${
                      viewMode === btn.mode
                        ? "bg-[var(--primary-violet)] text-white"
                        : "text-text-2 hover:text-text-1"
                    }`}
                    title={btn.label}
                  >
                    <Icon size={16} />
                  </motion.button>
                );
              })}
            </div>

            {/* Help */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded hover:bg-glass-low transition-colors"
              title="Markdown Help"
            >
              <HelpCircle size={18} className="text-text-2" />
            </motion.button>

            {/* Fullscreen */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded hover:bg-glass-low transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={18} className="text-text-2" />
              ) : (
                <Maximize2 size={18} className="text-text-2" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div
        className="glass-card-subtle rounded-b-lg overflow-hidden"
        style={{
          height: isFullscreen ? "calc(100vh - 60px)" : "auto",
          minHeight: !isFullscreen ? minHeight : undefined,
          maxHeight: !isFullscreen ? maxHeight : undefined,
        }}
      >
        <div
          className={`flex h-full ${
            viewMode === "split" ? "divide-x divide-border-1" : ""
          }`}
        >
          {/* Editor */}
          {(viewMode === "edit" || viewMode === "split") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={viewMode === "split" ? "w-1/2" : "w-full"}
            >
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onChange(newValue);

                  // Update history
                  const newHistory = [
                    ...history.slice(0, historyIndex + 1),
                    newValue,
                  ];
                  setHistory(newHistory);
                  setHistoryIndex(newHistory.length - 1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full h-full p-4 bg-transparent text-text-1 placeholder:text-text-2 resize-none focus:outline-none font-mono text-sm"
                style={{ minHeight: minHeight }}
              />
            </motion.div>
          )}

          {/* Preview */}
          {(viewMode === "preview" || viewMode === "split") && (
            <motion.div
              ref={previewRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${
                viewMode === "split" ? "w-1/2" : "w-full"
              } p-4 overflow-auto`}
              style={{ minHeight: minHeight }}
            >
              {value ? (
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
                />
              ) : (
                <p className="text-text-2 italic">Nothing to preview</p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Markdown Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl glass-card-prominent rounded-lg p-6 z-50 max-h-[80vh] overflow-auto"
            >
              <h3 className="text-xl font-semibold text-text-1 mb-4">
                Markdown Cheat Sheet
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-text-1 mb-2">Headers</h4>
                  <pre className="bg-glass-low rounded p-2 text-text-2">
                    {`# H1
## H2
### H3`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-text-1 mb-2">Emphasis</h4>
                  <pre className="bg-glass-low rounded p-2 text-text-2">
                    {`**bold text**
*italic text*
~~strikethrough~~`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-text-1 mb-2">Lists</h4>
                  <pre className="bg-glass-low rounded p-2 text-text-2">
                    {`- Unordered item
- Another item

1. Ordered item
2. Another item`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-text-1 mb-2">
                    Links & Images
                  </h4>
                  <pre className="bg-glass-low rounded p-2 text-text-2">
                    {`[Link text](https://example.com)
![Alt text](image-url.jpg)`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-text-1 mb-2">Code</h4>
                  <pre className="bg-glass-low rounded p-2 text-text-2">
                    {`\`inline code\`

\`\`\`
code block
\`\`\``}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-text-1 mb-2">Blockquote</h4>
                  <pre className="bg-glass-low rounded p-2 text-text-2">
                    {`> This is a quote`}
                  </pre>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHelp(false)}
                className="mt-6 px-4 py-2 bg-[var(--primary-violet)] text-white rounded-lg font-medium"
              >
                Close
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarkdownEditor;
