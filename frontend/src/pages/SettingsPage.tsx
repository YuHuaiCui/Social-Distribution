import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, User, Shield, Server, Palette, 
  Save, Camera, Mail, Lock, Globe, Users,
  Eye, EyeOff, Check, AlertCircle, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../components/context/AuthContext';
import AnimatedButton from '../components/ui/AnimatedButton';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Avatar from '../components/Avatar/Avatar';
import Loader from '../components/ui/Loader';

type SettingsTab = 'profile' | 'account' | 'privacy' | 'node' | 'appearance';

interface PrivacySettings {
  defaultVisibility: 'public' | 'friends' | 'unlisted';
  requireApprovalToFollow: boolean;
  hideFollowerCount: boolean;
  hideFollowingCount: boolean;
  allowDirectMessages: boolean;
}

interface NodeSettings {
  nodeUrl: string;
  nodeName: string;
  autoAcceptRemoteFollows: boolean;
  federationEnabled: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  reduceMotion: boolean;
}

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile settings
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  // Account settings
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    defaultVisibility: 'public',
    requireApprovalToFollow: false,
    hideFollowerCount: false,
    hideFollowingCount: false,
    allowDirectMessages: true,
  });

  // Node settings
  const [nodeSettings, setNodeSettings] = useState<NodeSettings>({
    nodeUrl: window.location.origin,
    nodeName: 'My Node',
    autoAcceptRemoteFollows: false,
    federationEnabled: true,
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'dark',
    accentColor: 'var(--primary-violet)',
    fontSize: 'medium',
    reduceMotion: false,
  });

  useEffect(() => {
    // Load saved settings from localStorage or API
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load from localStorage for now
      const savedPrivacy = localStorage.getItem('privacySettings');
      if (savedPrivacy) {
        setPrivacySettings(JSON.parse(savedPrivacy));
      }

      const savedNode = localStorage.getItem('nodeSettings');
      if (savedNode) {
        setNodeSettings(JSON.parse(savedNode));
      }

      const savedAppearance = localStorage.getItem('appearanceSettings');
      if (savedAppearance) {
        setAppearanceSettings(JSON.parse(savedAppearance));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store file in state when we need to upload it
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user context
      if (updateUser) {
        updateUser({
          ...user!,
          display_name: displayName,
          bio: bio,
          profile_image: profileImagePreview || user?.profile_image,
        });
      }
      
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setSaveMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveMessage({ type: 'success', text: 'Account settings updated!' });
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to update account settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Save to localStorage for now
      localStorage.setItem('privacySettings', JSON.stringify(privacySettings));
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveMessage({ type: 'success', text: 'Privacy settings saved!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save privacy settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNode = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Save to localStorage for now
      localStorage.setItem('nodeSettings', JSON.stringify(nodeSettings));
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveMessage({ type: 'success', text: 'Node settings saved!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save node settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Save to localStorage and apply theme
      localStorage.setItem('appearanceSettings', JSON.stringify(appearanceSettings));
      
      // Apply theme immediately
      if (appearanceSettings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (appearanceSettings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      }
      
      // Apply accent color
      document.documentElement.style.setProperty('--primary-violet', appearanceSettings.accentColor);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveMessage({ type: 'success', text: 'Appearance settings saved!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save appearance settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Lock },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'node', label: 'Node', icon: Server },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" message="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3 mb-8"
      >
        <motion.div 
          className="w-12 h-12 rounded-full gradient-tertiary flex items-center justify-center"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
          }}
          style={{
            background: 'var(--gradient-tertiary)',
            backgroundSize: '200% 200%',
          }}
        >
          <Settings className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-text-1">Settings</h1>
          <p className="text-sm text-text-2">Manage your account and preferences</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card variant="subtle" className="p-2">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={
                    isActive
                      ? {
                          opacity: 1,
                          x: 0,
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }
                      : { opacity: 1, x: 0 }
                  }
                  whileHover={{ x: 4 }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-[var(--gradient-primary)] text-white'
                      : 'text-text-2 hover:text-text-1 hover:bg-glass-low'
                  }`}
                  style={
                    isActive
                      ? {
                          background: 'var(--gradient-primary)',
                          backgroundSize: '200% 200%',
                        }
                      : {}
                  }
                  transition={
                    isActive
                      ? {
                          delay: index * 0.05,
                          backgroundPosition: {
                            duration: 3,
                            repeat: Infinity,
                          },
                        }
                      : { delay: index * 0.05 }
                  }
                >
                  <Icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                </motion.button>
              );
            })}
          </Card>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <AnimatePresence mode="wait">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card variant="prominent" className="p-6">
                  <h2 className="text-xl font-semibold text-text-1 mb-6">Profile Settings</h2>
                  
                  {/* Profile Image */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-2 mb-2">
                      Profile Picture
                    </label>
                    <div className="flex items-center space-x-4">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative"
                      >
                        <Avatar
                          imgSrc={profileImagePreview || user?.profile_image}
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
                      <div className="text-sm text-text-2">
                        <p>Upload a new profile picture</p>
                        <p>JPG, PNG. Max size 5MB</p>
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
                    />
                  </div>

                  {/* Bio */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-2 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-3 bg-input-bg border border-border-1 rounded-lg text-text-1 placeholder:text-text-2 focus:ring-2 focus:ring-[var(--primary-violet)] focus:border-transparent transition-all duration-200 resize-none"
                      rows={4}
                    />
                    <p className="text-xs text-text-2 mt-1">{bio.length}/500 characters</p>
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
            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card variant="prominent" className="p-6">
                  <h2 className="text-xl font-semibold text-text-1 mb-6">Account Settings</h2>
                  
                  {/* Email */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-2 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      icon={<Mail size={18} />}
                    />
                  </div>

                  {/* Password Change */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-text-1 mb-4">Change Password</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-2 mb-2">
                          Current Password
                        </label>
                        <Input
                          type={showPasswords ? 'text' : 'password'}
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
                          type={showPasswords ? 'text' : 'password'}
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
                          type={showPasswords ? 'text' : 'password'}
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
                        <span>{showPasswords ? 'Hide' : 'Show'} passwords</span>
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

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card variant="prominent" className="p-6">
                  <h2 className="text-xl font-semibold text-text-1 mb-6">Privacy Settings</h2>
                  
                  {/* Default Post Visibility */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-2 mb-2">
                      Default Post Visibility
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'public', label: 'Public', icon: Globe, desc: 'Anyone can see your posts' },
                        { value: 'friends', label: 'Friends Only', icon: Users, desc: 'Only your friends can see' },
                        { value: 'unlisted', label: 'Unlisted', icon: Eye, desc: 'Only people with the link' },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <motion.label
                            key={option.value}
                            whileHover={{ x: 4 }}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                              privacySettings.defaultVisibility === option.value
                                ? 'bg-[var(--primary-violet)]/20 border-2 border-[var(--primary-violet)]'
                                : 'glass-card-subtle hover:bg-glass-low'
                            }`}
                          >
                            <input
                              type="radio"
                              name="visibility"
                              value={option.value}
                              checked={privacySettings.defaultVisibility === option.value}
                              onChange={(e) => setPrivacySettings({
                                ...privacySettings,
                                defaultVisibility: e.target.value as any
                              })}
                              className="sr-only"
                            />
                            <Icon size={20} className="mr-3 text-text-1" />
                            <div className="flex-1">
                              <p className="font-medium text-text-1">{option.label}</p>
                              <p className="text-xs text-text-2">{option.desc}</p>
                            </div>
                            {privacySettings.defaultVisibility === option.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto"
                              >
                                <Check size={20} className="text-[var(--primary-violet)]" />
                              </motion.div>
                            )}
                          </motion.label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Privacy Toggles */}
                  <div className="space-y-4">
                    {[
                      {
                        key: 'requireApprovalToFollow',
                        label: 'Require approval for follow requests',
                        desc: 'You must approve each follower manually',
                      },
                      {
                        key: 'hideFollowerCount',
                        label: 'Hide follower count',
                        desc: 'Others cannot see how many followers you have',
                      },
                      {
                        key: 'hideFollowingCount',
                        label: 'Hide following count',
                        desc: 'Others cannot see how many people you follow',
                      },
                      {
                        key: 'allowDirectMessages',
                        label: 'Allow direct messages',
                        desc: 'Other users can send you private messages',
                      },
                    ].map((setting) => (
                      <motion.label
                        key={setting.key}
                        whileHover={{ x: 4 }}
                        className="flex items-center justify-between p-3 rounded-lg glass-card-subtle cursor-pointer hover:bg-glass-low transition-all"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-text-1">{setting.label}</p>
                          <p className="text-xs text-text-2">{setting.desc}</p>
                        </div>
                        <motion.div
                          whileTap={{ scale: 0.9 }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            privacySettings[setting.key as keyof PrivacySettings]
                              ? 'bg-[var(--primary-violet)]'
                              : 'bg-glass-low'
                          }`}
                        >
                          <motion.div
                            animate={{
                              x: privacySettings[setting.key as keyof PrivacySettings] ? 24 : 0
                            }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"
                          />
                        </motion.div>
                        <input
                          type="checkbox"
                          checked={privacySettings[setting.key as keyof PrivacySettings] as boolean}
                          onChange={(e) => setPrivacySettings({
                            ...privacySettings,
                            [setting.key]: e.target.checked
                          })}
                          className="sr-only"
                        />
                      </motion.label>
                    ))}
                  </div>

                  <AnimatedButton
                    onClick={handleSavePrivacy}
                    variant="primary"
                    loading={isSaving}
                    icon={<Save size={16} />}
                    className="mt-6"
                  >
                    Save Privacy Settings
                  </AnimatedButton>
                </Card>
              </motion.div>
            )}

            {/* Node Settings */}
            {activeTab === 'node' && (
              <motion.div
                key="node"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card variant="prominent" className="p-6">
                  <h2 className="text-xl font-semibold text-text-1 mb-6">Node Settings</h2>
                  
                  {/* Node Info */}
                  <div className="mb-6 p-4 rounded-lg bg-[var(--primary-teal)]/10 border border-[var(--primary-teal)]/20">
                    <div className="flex items-center space-x-2 text-[var(--primary-teal)] mb-2">
                      <Server size={20} />
                      <span className="font-medium">Distributed Network Node</span>
                    </div>
                    <p className="text-sm text-text-2">
                      These settings control how your node interacts with other nodes in the federated network.
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
                      onChange={(e) => setNodeSettings({
                        ...nodeSettings,
                        nodeUrl: e.target.value
                      })}
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
                      onChange={(e) => setNodeSettings({
                        ...nodeSettings,
                        nodeName: e.target.value
                      })}
                      placeholder="My Social Node"
                    />
                  </div>

                  {/* Federation Settings */}
                  <div className="space-y-4">
                    <motion.label
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between p-3 rounded-lg glass-card-subtle cursor-pointer hover:bg-glass-low transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text-1">Enable Federation</p>
                        <p className="text-xs text-text-2">
                          Allow your node to connect with other nodes
                        </p>
                      </div>
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          nodeSettings.federationEnabled
                            ? 'bg-[var(--primary-violet)]'
                            : 'bg-glass-low'
                        }`}
                      >
                        <motion.div
                          animate={{
                            x: nodeSettings.federationEnabled ? 24 : 0
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"
                        />
                      </motion.div>
                      <input
                        type="checkbox"
                        checked={nodeSettings.federationEnabled}
                        onChange={(e) => setNodeSettings({
                          ...nodeSettings,
                          federationEnabled: e.target.checked
                        })}
                        className="sr-only"
                      />
                    </motion.label>

                    <motion.label
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between p-3 rounded-lg glass-card-subtle cursor-pointer hover:bg-glass-low transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text-1">Auto-accept Remote Follows</p>
                        <p className="text-xs text-text-2">
                          Automatically accept follow requests from other nodes
                        </p>
                      </div>
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          nodeSettings.autoAcceptRemoteFollows
                            ? 'bg-[var(--primary-violet)]'
                            : 'bg-glass-low'
                        }`}
                      >
                        <motion.div
                          animate={{
                            x: nodeSettings.autoAcceptRemoteFollows ? 24 : 0
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"
                        />
                      </motion.div>
                      <input
                        type="checkbox"
                        checked={nodeSettings.autoAcceptRemoteFollows}
                        onChange={(e) => setNodeSettings({
                          ...nodeSettings,
                          autoAcceptRemoteFollows: e.target.checked
                        })}
                        className="sr-only"
                      />
                    </motion.label>
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
            {activeTab === 'appearance' && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card variant="prominent" className="p-6">
                  <h2 className="text-xl font-semibold text-text-1 mb-6">Appearance Settings</h2>
                  
                  {/* Theme Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-2 mb-2">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: 'Light', icon: Sun },
                        { value: 'dark', label: 'Dark', icon: Moon },
                        { value: 'auto', label: 'Auto', icon: Settings },
                      ].map((theme) => {
                        const Icon = theme.icon;
                        return (
                          <motion.button
                            key={theme.value}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setAppearanceSettings({
                              ...appearanceSettings,
                              theme: theme.value as any
                            })}
                            className={`p-4 rounded-lg flex flex-col items-center space-y-2 transition-all ${
                              appearanceSettings.theme === theme.value
                                ? 'bg-[var(--primary-violet)]/20 border-2 border-[var(--primary-violet)]'
                                : 'glass-card-subtle hover:bg-glass-low'
                            }`}
                          >
                            <Icon size={24} className="text-text-1" />
                            <span className="text-sm font-medium text-text-1">{theme.label}</span>
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
                        { name: 'Violet', value: '#9B59B6' },
                        { name: 'Blue', value: '#3498DB' },
                        { name: 'Teal', value: '#4ECDC4' },
                        { name: 'Pink', value: '#FF6B9D' },
                        { name: 'Coral', value: '#FE6B8B' },
                        { name: 'Purple', value: '#6C5CE7' },
                      ].map((color) => (
                        <motion.button
                          key={color.value}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setAppearanceSettings({
                            ...appearanceSettings,
                            accentColor: color.value
                          })}
                          className={`relative w-full aspect-square rounded-lg transition-all ${
                            appearanceSettings.accentColor === color.value
                              ? 'ring-2 ring-offset-2 ring-offset-bg-3 ring-white'
                              : ''
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
                    <label className="block text-sm font-medium text-text-2 mb-2">
                      Font Size
                    </label>
                    <div className="flex space-x-3">
                      {[
                        { value: 'small', label: 'Small', size: 'text-sm' },
                        { value: 'medium', label: 'Medium', size: 'text-base' },
                        { value: 'large', label: 'Large', size: 'text-lg' },
                      ].map((size) => (
                        <motion.button
                          key={size.value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setAppearanceSettings({
                            ...appearanceSettings,
                            fontSize: size.value as any
                          })}
                          className={`flex-1 p-3 rounded-lg transition-all ${
                            appearanceSettings.fontSize === size.value
                              ? 'bg-[var(--primary-violet)]/20 border-2 border-[var(--primary-violet)]'
                              : 'glass-card-subtle hover:bg-glass-low'
                          }`}
                        >
                          <span className={`font-medium text-text-1 ${size.size}`}>
                            {size.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Reduce Motion */}
                  <motion.label
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-lg glass-card-subtle cursor-pointer hover:bg-glass-low transition-all mb-6"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-text-1">Reduce Motion</p>
                      <p className="text-xs text-text-2">
                        Minimize animations and transitions
                      </p>
                    </div>
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        appearanceSettings.reduceMotion
                          ? 'bg-[var(--primary-violet)]'
                          : 'bg-glass-low'
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: appearanceSettings.reduceMotion ? 24 : 0
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"
                      />
                    </motion.div>
                    <input
                      type="checkbox"
                      checked={appearanceSettings.reduceMotion}
                      onChange={(e) => setAppearanceSettings({
                        ...appearanceSettings,
                        reduceMotion: e.target.checked
                      })}
                      className="sr-only"
                    />
                  </motion.label>

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
                  saveMessage.type === 'success'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                }`}
              >
                {saveMessage.type === 'success' ? (
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
    </div>
  );
};

export default SettingsPage;