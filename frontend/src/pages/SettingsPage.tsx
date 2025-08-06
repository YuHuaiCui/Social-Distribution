import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  User,
  Server,
  Palette,
  Save,
  Camera,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  Type,
} from "lucide-react";
import { useAuth } from "../components/context/AuthContext";
import AnimatedButton from "../components/ui/AnimatedButton";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Avatar from "../components/Avatar/Avatar";
import Loader from "../components/ui/Loader";
import Toggle from "../components/ui/Toggle";
import type { Author } from "../types/models";
import { api } from "../services/api";

type SettingsTab = "profile" | "account" | "node" | "appearance";


interface NodeSettings {
  nodeUrl: string;
  nodeName: string;
  autoAcceptRemoteFollows: boolean;
  federationEnabled: boolean;
}

interface AppearanceSettings {
  theme: "light" | "dark" | "auto";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  reduceMotion: boolean;
}

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Profile settings
  const [displayName, setDisplayName] = useState(user?.displayName || user?.display_name || "");
  const [githubUsername, setGithubUsername] = useState(user?.github_username || "");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [isValidatingGithub, setIsValidatingGithub] = useState(false);
  const [githubValidation, setGithubValidation] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  // Account settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);


  // Node settings
  const [nodeSettings, setNodeSettings] = useState<NodeSettings>({
    nodeUrl: window.location.origin,
    nodeName: "My Node",
    autoAcceptRemoteFollows: false,
    federationEnabled: true,
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettings>({
      theme: "dark",
      accentColor: "var(--primary-violet)",
      fontSize: "medium",
      reduceMotion: false,
    });

  useEffect(() => {
    // Load saved settings from localStorage or API
    loadSettings();
  }, []);

  useEffect(() => {
    // Update form fields when user data changes
    if (user) {
      setDisplayName(user.displayName || user.display_name || "");
      setGithubUsername(user.github_username || "");
    }
  }, [user]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {

      const savedNode = localStorage.getItem("nodeSettings");
      if (savedNode) {
        setNodeSettings(JSON.parse(savedNode));
      }

      const savedAppearance = localStorage.getItem("appearanceSettings");
      if (savedAppearance) {
        setAppearanceSettings(JSON.parse(savedAppearance));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store the actual file for upload
      setProfileImageFile(file);
      // Clear URL input when file is selected
      setProfileImageUrl("");
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setProfileImageUrl(url);
    // Clear file input when URL is entered
    if (url) {
      setProfileImageFile(null);
      setProfileImagePreview(url);
    } else {
      setProfileImagePreview(null);
    }
  };

  const validateGitHubUsername = async (username: string) => {
    if (!username) {
      setGithubValidation(null);
      return;
    }

    setIsValidatingGithub(true);
    try {
      const response = await fetch(`/api/github/validate/${username}/`);
      const data = await response.json();

      if (data.valid) {
        setGithubValidation({
          valid: true,
          message: `Valid GitHub user: ${data.name || data.username}`,
        });
      } else {
        setGithubValidation({
          valid: false,
          message: "GitHub username not found",
        });
      }
    } catch (error) {
      setGithubValidation({
        valid: false,
        message: "Error validating GitHub username",
      });
    } finally {
      setIsValidatingGithub(false);
    }
  };

  // Debounce GitHub validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (githubUsername) {
        validateGitHubUsername(githubUsername);
      } else {
        setGithubValidation(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [githubUsername]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    // Validate displayName doesn't contain spaces
    if (displayName.includes(' ')) {
      setSaveMessage({
        type: "error",
        text: "Display name cannot contain spaces",
      });
      setIsSaving(false);
      return;
    }

    try {
      let updatedUser: Author;

      // Determine what needs to be updated
      const hasProfileChanges = displayName !== (user?.displayName || user?.display_name) || 
                                githubUsername !== user?.github_username;
      const hasImageFile = profileImageFile;
      const hasImageUrl = profileImageUrl && profileImageUrl !== user?.profileImage;

      if (hasImageFile) {
        // Upload file image
        updatedUser = await api.uploadProfileImage(profileImageFile);
        // Then update other profile fields if needed
        if (hasProfileChanges) {
          updatedUser = await api.updateCurrentAuthor({
            displayName: displayName,
            github_username: githubUsername,
          });
        }
      } else if (hasImageUrl) {
        // Update with image URL and other fields
        updatedUser = await api.updateCurrentAuthor({
          displayName: displayName,
          github_username: githubUsername,
          profileImage: profileImageUrl,
        });
      } else if (hasProfileChanges) {
        // Update other profile fields only
        updatedUser = await api.updateCurrentAuthor({
          displayName: displayName,
          github_username: githubUsername,
        });
      } else {
        setSaveMessage({ type: "error", text: "No changes to save" });
        setIsSaving(false);
        return;
      }

      // Update user context
      if (updateUser) {
        updateUser(updatedUser);
      }

      // Clear the profile image file and URL after successful upload
      setProfileImageFile(null);
      setProfileImageUrl("");
      setProfileImagePreview(null);

      setSaveMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      setSaveMessage({ 
        type: "error", 
        text: `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setSaveMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      let updatedUser: Author;

      // Handle password change
      if (newPassword && currentPassword) {
        updatedUser = await api.changePassword({
          password: newPassword,
          password_confirm: confirmPassword,
        });

        // Clear password fields after successful change
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setSaveMessage({ type: "error", text: "No changes to save" });
        return;
      }

      // Update user context if we have new user data
      if (updateUser && updatedUser) {
        updateUser(updatedUser);
      }

      setSaveMessage({ type: "success", text: "Account settings updated!" });
    } catch (error) {
      console.error('Account update error:', error);
      setSaveMessage({
        type: "error",
        text: `Failed to update account settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleSaveNode = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save to localStorage for now
      localStorage.setItem("nodeSettings", JSON.stringify(nodeSettings));
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaveMessage({ type: "success", text: "Node settings saved!" });
    } catch (error) {
      setSaveMessage({ type: "error", text: "Failed to save node settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save to localStorage and apply theme
      localStorage.setItem(
        "appearanceSettings",
        JSON.stringify(appearanceSettings)
      );

      // Apply theme immediately
      if (appearanceSettings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (appearanceSettings.theme === "light") {
        document.documentElement.classList.remove("dark");
      }

      // Apply accent color
      document.documentElement.style.setProperty(
        "--primary-violet",
        appearanceSettings.accentColor
      );

      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaveMessage({ type: "success", text: "Appearance settings saved!" });
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: "Failed to save appearance settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "account", label: "Account", icon: Lock },
    { id: "node", label: "Node", icon: Server },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" message="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="w-full px-4 lg:px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3 mb-8"
      >
        <motion.div
          className="w-12 h-12 rounded-full gradient-tertiary flex items-center justify-center"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
          }}
          style={{
            background: "var(--gradient-tertiary)",
            backgroundSize: "200% 200%",
          }}
        >
          <Settings className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-text-1">Settings</h1>
          <p className="text-sm text-text-2">
            Manage your account and preferences
          </p>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-md rounded-xl p-2 inline-flex w-full sm:w-auto border border-[var(--border-1)] gap-1">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative flex items-center justify-center sm:justify-start gap-2 px-5 py-3 rounded-lg flex-1 sm:flex-initial
                  transition-all duration-300 min-w-0
                  ${
                    isActive
                      ? "text-white"
                      : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--primary-purple)] via-[var(--primary-pink)] to-[var(--primary-violet)] shadow-lg animate-gradient-slow"
                    style={{
                      backgroundSize: "200% 200%",
                    }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={18} className="shrink-0 relative z-10" />
                <span className="font-medium hidden sm:inline relative z-10">
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {/* Profile Settings */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card
                variant="main"
                className="p-6 bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
              >
                <h2 className="text-xl font-semibold text-text-1 mb-6">
                  Profile Settings
                </h2>

                {/* Profile Image */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-start space-x-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative"
                    >
                      <Avatar
                        imgSrc={profileImagePreview || user?.profileImage || user?.profile_image}
                        alt={displayName}
                        size="xl"
                      />
                      <label
                        htmlFor="profile-image-upload"
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--primary-violet)] text-white cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <Camera size={16} />
                      </label>
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="hidden"
                      />
                    </motion.div>
                    <div className="flex-1 space-y-4">
                      <div className="text-sm text-text-2">
                        <p>Upload a new profile picture or enter an image URL</p>
                        <p>JPG, PNG. Max size 5MB for uploads</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-2 mb-2">
                          Or enter an image URL (e.g., from Imgur, etc.)
                        </label>
                        <Input
                          type="url"
                          value={profileImageUrl}
                          onChange={handleProfileImageUrlChange}
                          placeholder="https://i.imgur.com/example.jpg"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>


                {/* Display Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className={displayName.includes(' ') ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  {displayName.includes(' ') && (
                    <p className="mt-1 text-sm text-red-500">
                      Display name cannot contain spaces
                    </p>
                  )}
                </div>



                {/* GitHub Username */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2">
                    GitHub Username
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="Your GitHub username"
                      className={`${
                        githubValidation
                          ? githubValidation.valid
                            ? "border-green-500 focus:ring-green-500"
                            : "border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {isValidatingGithub && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-[var(--primary-violet)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {githubValidation && (
                    <p
                      className={`mt-1 text-sm ${
                        githubValidation.valid ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {githubValidation.message}
                    </p>
                  )}
                </div>

                <AnimatedButton
                  onClick={handleSaveProfile}
                  variant="primary"
                  loading={isSaving}
                  icon={<Save size={16} />}
                >
                  Save Profile
                </AnimatedButton>
              </Card>
            </motion.div>
          )}

          {/* Account Settings */}
          {activeTab === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card
                variant="main"
                className="p-6 bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
              >
                <h2 className="text-xl font-semibold text-text-1 mb-6">
                  Account Settings
                </h2>


                {/* Password Change */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-text-1 mb-4">
                    Change Password
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-2 mb-2">
                        Current Password
                      </label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        icon={<Lock size={18} />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-2 mb-2">
                        New Password
                      </label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        icon={<Lock size={18} />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-2 mb-2">
                        Confirm New Password
                      </label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        icon={<Lock size={18} />}
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="flex items-center space-x-2 text-sm text-text-2 hover:text-text-1"
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span>{showPasswords ? "Hide" : "Show"} passwords</span>
                    </motion.button>
                  </div>
                </div>

                <AnimatedButton
                  onClick={handleSaveAccount}
                  variant="primary"
                  loading={isSaving}
                  icon={<Save size={16} />}
                >
                  Save Account Settings
                </AnimatedButton>
              </Card>
            </motion.div>
          )}


          {/* Node Settings */}
          {activeTab === "node" && (
            <motion.div
              key="node"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card
                variant="main"
                className="p-6 bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
              >
                <h2 className="text-xl font-semibold text-text-1 mb-6">
                  Node Settings
                </h2>

                {/* Node Info */}
                <div className="mb-6 p-4 rounded-lg bg-[var(--primary-teal)]/10 border border-[var(--primary-teal)]/20">
                  <div className="flex items-center space-x-2 text-[var(--primary-teal)] mb-2">
                    <Server size={20} />
                    <span className="font-medium">
                      Distributed Network Node
                    </span>
                  </div>
                  <p className="text-sm text-text-2">
                    These settings control how your node interacts with other
                    nodes in the federated network.
                  </p>
                </div>

                {/* Node URL */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2">
                    Node URL
                  </label>
                  <Input
                    type="url"
                    value={nodeSettings.nodeUrl}
                    onChange={(e) =>
                      setNodeSettings({
                        ...nodeSettings,
                        nodeUrl: e.target.value,
                      })
                    }
                    placeholder="https://your-node.com"
                    icon={<Globe size={18} />}
                  />
                  <p className="text-xs text-text-2 mt-1">
                    The public URL of your node for federation
                  </p>
                </div>

                {/* Node Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2">
                    Node Name
                  </label>
                  <Input
                    type="text"
                    value={nodeSettings.nodeName}
                    onChange={(e) =>
                      setNodeSettings({
                        ...nodeSettings,
                        nodeName: e.target.value,
                      })
                    }
                    placeholder="My Social Node"
                  />
                </div>

                {/* Federation Settings */}
                <div className="space-y-4">
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.4)] transition-all"
                  >
                    <div className="flex-1 pr-4">
                      <p className="font-medium text-text-1">
                        Enable Federation
                      </p>
                      <p className="text-xs text-text-2">
                        Allow your node to connect with other nodes
                      </p>
                    </div>
                    <Toggle
                      checked={nodeSettings.federationEnabled}
                      onChange={(checked) =>
                        setNodeSettings({
                          ...nodeSettings,
                          federationEnabled: checked,
                        })
                      }
                      className="ml-4"
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.4)] transition-all"
                  >
                    <div className="flex-1 pr-4">
                      <p className="font-medium text-text-1">
                        Auto-accept Remote Follows
                      </p>
                      <p className="text-xs text-text-2">
                        Automatically accept follow requests from other nodes
                      </p>
                    </div>
                    <Toggle
                      checked={nodeSettings.autoAcceptRemoteFollows}
                      onChange={(checked) =>
                        setNodeSettings({
                          ...nodeSettings,
                          autoAcceptRemoteFollows: checked,
                        })
                      }
                      className="ml-4"
                    />
                  </motion.div>
                </div>

                <AnimatedButton
                  onClick={handleSaveNode}
                  variant="primary"
                  loading={isSaving}
                  icon={<Save size={16} />}
                  className="mt-6"
                >
                  Save Node Settings
                </AnimatedButton>
              </Card>
            </motion.div>
          )}

          {/* Appearance Settings */}
          {activeTab === "appearance" && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card
                variant="main"
                className="p-6 bg-[rgba(var(--glass-rgb),0.4)] backdrop-blur-xl"
              >
                <h2 className="text-xl font-semibold text-text-1 mb-6">
                  Appearance Settings
                </h2>

                {/* Theme Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "auto", label: "Auto", icon: Monitor },
                    ].map((theme) => {
                      const Icon = theme.icon;
                      return (
                        <motion.button
                          key={theme.value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            setAppearanceSettings({
                              ...appearanceSettings,
                              theme: theme.value as any,
                            })
                          }
                          className={`p-4 rounded-lg flex flex-col items-center space-y-2 transition-all ${
                            appearanceSettings.theme === theme.value
                              ? "bg-[var(--primary-violet)]/20 border-2 border-[var(--primary-violet)]"
                              : "glass-card-subtle hover:bg-glass-low"
                          }`}
                        >
                          <Icon size={24} className="text-text-1" />
                          <span className="text-sm font-medium text-text-1">
                            {theme.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2">
                    Accent Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      { name: "Violet", value: "#9B59B6" },
                      { name: "Blue", value: "#3498DB" },
                      { name: "Teal", value: "#4ECDC4" },
                      { name: "Pink", value: "#FF6B9D" },
                      { name: "Coral", value: "#FE6B8B" },
                      { name: "Purple", value: "#6C5CE7" },
                    ].map((color) => (
                      <motion.button
                        key={color.value}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          setAppearanceSettings({
                            ...appearanceSettings,
                            accentColor: color.value,
                          })
                        }
                        className={`relative w-full aspect-square rounded-lg transition-all ${
                          appearanceSettings.accentColor === color.value
                            ? "ring-2 ring-offset-2 ring-offset-bg-3 ring-white"
                            : ""
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {appearanceSettings.accentColor === color.value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Check size={20} className="text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-2 mb-2 flex items-center">
                    <Type size={16} className="mr-2" />
                    Font Size
                  </label>
                  <div className="flex space-x-3">
                    {[
                      { value: "small", label: "Small", size: "text-sm" },
                      { value: "medium", label: "Medium", size: "text-base" },
                      { value: "large", label: "Large", size: "text-lg" },
                    ].map((size) => (
                      <motion.button
                        key={size.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setAppearanceSettings({
                            ...appearanceSettings,
                            fontSize: size.value as any,
                          })
                        }
                        className={`flex-1 p-3 rounded-lg transition-all ${
                          appearanceSettings.fontSize === size.value
                            ? "bg-[var(--primary-violet)]/20 border-2 border-[var(--primary-violet)]"
                            : "glass-card-subtle hover:bg-glass-low"
                        }`}
                      >
                        <span
                          className={`font-medium text-text-1 ${size.size}`}
                        >
                          {size.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Reduce Motion */}
                <motion.div
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.4)] transition-all mb-6"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center">
                      <Monitor size={16} className="mr-2 text-text-1" />
                      <p className="font-medium text-text-1">Reduce Motion</p>
                    </div>
                    <p className="text-xs text-text-2 ml-6">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Toggle
                    checked={appearanceSettings.reduceMotion}
                    onChange={(checked) =>
                      setAppearanceSettings({
                        ...appearanceSettings,
                        reduceMotion: checked,
                      })
                    }
                    className="ml-4"
                  />
                </motion.div>

                <AnimatedButton
                  onClick={handleSaveAppearance}
                  variant="primary"
                  loading={isSaving}
                  icon={<Save size={16} />}
                >
                  Save Appearance Settings
                </AnimatedButton>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Message */}
        <AnimatePresence>
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
                saveMessage.type === "success"
                  ? "bg-green-500/20 text-green-500"
                  : "bg-red-500/20 text-red-500"
              }`}
            >
              {saveMessage.type === "success" ? (
                <Check size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span className="font-medium">{saveMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
