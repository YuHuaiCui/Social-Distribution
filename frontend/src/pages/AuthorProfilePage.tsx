import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import type { Entry, Author } from "../types/models";
import { api } from "../services/api";
import AuthorCard from "../components/AuthorCard";
import PostCard from "../components/PostCard";
import Loader from "../components/ui/Loader";
import Card from "../components/ui/Card";
import { useAuth } from "../components/context/AuthContext";
import { useToast } from "../components/context/ToastContext";
import AnimatedButton from "../components/ui/AnimatedButton";
import { Shield, Trash2, UserX, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { GitHubActivity } from "../components/GitHubActivity";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const AuthorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [author, setAuthor] = useState<Author | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: "delete" | "promote" | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: null,
    title: "",
    message: "",
  });

  // Check if current user is admin
  const isAdmin = user?.is_staff || user?.is_superuser;

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!id) return;

      try {
        // Determine if this is a FQID (contains full URL path) or UUID
        const authorId = id.includes("http") || location.pathname.includes("authors/") && location.pathname.split("/").length > 3
          ? location.pathname.replace("/authors/", "") // Get full path after /authors/
          : id;

        // Fetch author data first
        const authorData = await api.getAuthor(authorId);
        setAuthor(authorData);
        
        // Try to fetch entries separately - don't fail if this doesn't work
        try {
          const postData = await api.getAuthorEntries(authorId);
          setEntries(postData);
        } catch (entriesErr) {
          console.warn("Error loading author entries:", entriesErr);
          // Set empty entries array if entries can't be loaded
          setEntries([]);
        }
      } catch (err) {
        console.error("Error loading author profile:", err);
        // Only set author to null if author fetch specifically fails
        setAuthor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" message="Loading profile..." />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card variant="main" className="p-8 text-center">
          <h2 className="text-xl font-semibold text-text-1 mb-2">
            Author not found
          </h2>
          <p className="text-text-2">
            The author you're looking for doesn't exist.
          </p>
        </Card>
      </div>
    );
  }

  // Handle dialog actions
  const handleShowConfirmDialog = (action: "delete" | "promote") => {
    if (!author) return;

    if (action === "delete") {
      setConfirmDialog({
        isOpen: true,
        action,
        title: "Delete User",
        message: `Are you sure you want to delete ${author.displayName || author.display_name}? This action cannot be undone.`,
      });
    } else if (action === "promote") {
      setConfirmDialog({
        isOpen: true,
        action,
        title: "Promote to Admin",
        message: `Are you sure you want to promote ${author.displayName || author.display_name} to admin? This will give them full administrative privileges.`,
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.action || !author) return;

    setAdminActionLoading(true);
    try {
      if (confirmDialog.action === "delete") {
        await api.deleteAuthor(author.id);
        showSuccess(`${author.displayName || author.display_name} has been deleted`);
        navigate("/authors");
      } else if (confirmDialog.action === "promote") {
        await api.promoteToAdmin(author.id);
        showSuccess(`${author.displayName || author.display_name} has been promoted to admin`);
        setAuthor({
          ...author,
          is_staff: true,
          is_approved: true,
          is_active: true,
        });
      }
    } catch {
      showError(`Failed to ${confirmDialog.action} user`);
    } finally {
      setAdminActionLoading(false);
      setConfirmDialog({ isOpen: false, action: null, title: "", message: "" });
    }
  };

  // Admin actions
  const handleAdminAction = async (
    action: "approve" | "deactivate" | "activate" | "delete" | "promote"
  ) => {
    if (!isAdmin || !author) return;

    // For delete and promote, show confirmation dialog
    if (action === "delete" || action === "promote") {
      handleShowConfirmDialog(action);
      return;
    }

    setAdminActionLoading(true);
    try {
      switch (action) {
        case "approve":
          await api.approveAuthor(author.id);
          showSuccess(`${author.displayName || author.display_name} has been approved`);
          setAuthor({ ...author, is_approved: true });
          break;
        case "deactivate":
          await api.deactivateAuthor(author.id);
          showSuccess(`${author.displayName || author.display_name} has been deactivated`);
          setAuthor({ ...author, is_active: false });
          break;
        case "activate":
          await api.activateAuthor(author.id);
          showSuccess(`${author.displayName || author.display_name} has been activated`);
          setAuthor({ ...author, is_active: true });
          break;
      }
    } catch {
      showError(`Failed to ${action} user`);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setEntries(entries.filter((entry) => entry.id !== postId));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Admin Quick Actions */}
      {isAdmin && author && user?.id !== author.id && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-prominent p-4 rounded-lg"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2 text-text-1">
              <Shield className="text-[var(--primary-purple)]" size={20} />
              <span className="font-medium">Admin Controls</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {!author.is_approved && (
                <AnimatedButton
                  size="sm"
                  variant="primary"
                  icon={<CheckCircle size={16} />}
                  onClick={() => handleAdminAction("approve")}
                  loading={adminActionLoading}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Approve User
                </AnimatedButton>
              )}

              {author.is_active ? (
                <AnimatedButton
                  size="sm"
                  variant="secondary"
                  icon={<UserX size={16} />}
                  onClick={() => handleAdminAction("deactivate")}
                  loading={adminActionLoading}
                  className="text-orange-500"
                >
                  Deactivate
                </AnimatedButton>
              ) : (
                <AnimatedButton
                  size="sm"
                  variant="primary"
                  icon={<CheckCircle size={16} />}
                  onClick={() => handleAdminAction("activate")}
                  loading={adminActionLoading}
                >
                  Activate
                </AnimatedButton>
              )}

              <AnimatedButton
                size="sm"
                variant="secondary"
                icon={<Trash2 size={16} />}
                onClick={() => handleAdminAction("delete")}
                loading={adminActionLoading}
                className="text-red-500 hover:bg-red-500/10"
              >
                Delete User
              </AnimatedButton>

              {!author.is_staff && (
                <AnimatedButton
                  size="sm"
                  variant="primary"
                  icon={<Shield size={16} />}
                  onClick={() => handleAdminAction("promote")}
                  loading={adminActionLoading}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  Promote to Admin
                </AnimatedButton>
              )}
            </div>
          </div>

          {/* User Status */}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span
              className={`px-2 py-1 rounded-full ${
                author.is_approved
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {author.is_approved ? "Approved" : "Pending Approval"}
            </span>
            <span
              className={`px-2 py-1 rounded-full ${
                author.is_active
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {author.is_active ? "Active" : "Inactive"}
            </span>
            {(author.is_staff || author.is_superuser) && (
              <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                Admin
              </span>
            )}
          </div>
        </motion.div>
      )}

      <AuthorCard
        author={author}
        variant="detailed"
        showStats
        showBio
        showActions
      />

      {/* GitHub Activity Section - Only show if user has GitHub username */}
      {(author.github || author.github_username) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-text-1 mb-4">
            GitHub Activity
          </h2>
          <GitHubActivity username={
            author.github 
              ? author.github.split("/").pop() || ""
              : author.github_username || ""
          } />
        </motion.div>
      )}

      {/* Posts Section */}
      <div className="space-y-4">
        {isAdmin && entries.length > 0 && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-1">
              Posts ({entries.length})
            </h2>
            {entries.some((e) => e.visibility !== "PUBLIC") && (
              <span className="text-sm text-text-2 flex items-center gap-1">
                <Shield size={14} />
                Showing all posts (admin view)
              </span>
            )}
          </div>
        )}

        {entries.length > 0 ? (
          entries.map((entry) => (
            <PostCard
              key={entry.id}
              post={entry}
              onDelete={isAdmin ? handleDeletePost : undefined}
            />
          ))
        ) : (
          <p className="text-text-2">This author hasn't posted anything yet.</p>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({
            isOpen: false,
            action: null,
            title: "",
            message: "",
          })
        }
        onConfirm={handleConfirmAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.action === "delete" ? "Delete" : "Promote"}
        variant={confirmDialog.action === "delete" ? "danger" : "warning"}
        loading={adminActionLoading}
      />
    </div>
  );
};

export default AuthorProfilePage;
