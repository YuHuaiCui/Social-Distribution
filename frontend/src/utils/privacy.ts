import { useState, useEffect } from "react";

export type Visibility = "PUBLIC" | "FRIENDS" | "UNLISTED";

interface PrivacySettings {
  defaultVisibility: Visibility;
  requireApprovalToFollow: boolean;
  hideFollowerCount: boolean;
  hideFollowingCount: boolean;
  allowDirectMessages: boolean;
}

/**
 * Get the user's default privacy setting from localStorage
 * Falls back to "public" if no setting is found
 */
export const getDefaultVisibility = (): Visibility => {
  try {
    const savedPrivacy = localStorage.getItem("privacySettings");
    if (savedPrivacy) {
      const settings: PrivacySettings = JSON.parse(savedPrivacy);
      return settings.defaultVisibility || "PUBLIC";
    }
  } catch (error) {
    console.error("Error reading privacy settings:", error);
  }
  
  return "PUBLIC"; // Default fallback
};

/**
 * Get all privacy settings from localStorage
 */
export const getPrivacySettings = (): PrivacySettings => {
  try {
    const savedPrivacy = localStorage.getItem("privacySettings");
    if (savedPrivacy) {
      return JSON.parse(savedPrivacy);
    }
  } catch (error) {
    console.error("Error reading privacy settings:", error);
  }
  
  // Default settings
  return {
    defaultVisibility: "PUBLIC",
    requireApprovalToFollow: false,
    hideFollowerCount: false,
    hideFollowingCount: false,
    allowDirectMessages: true,
  };
};

/**
 * Custom hook that reactively reads the default visibility from localStorage
 * and updates when the privacy settings change
 */
export const useDefaultVisibility = (): Visibility => {
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>(getDefaultVisibility);

  useEffect(() => {
    // Function to update the default visibility
    const updateDefaultVisibility = () => {
      setDefaultVisibility(getDefaultVisibility());
    };

    // Listen for storage changes (when user changes settings in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "privacySettings") {
        updateDefaultVisibility();
      }
    };

    // Listen for custom event when settings change in the same tab
    const handlePrivacySettingsChange = () => {
      updateDefaultVisibility();
    };

    // Add event listeners
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("privacySettingsChanged", handlePrivacySettingsChange);

    // Cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("privacySettingsChanged", handlePrivacySettingsChange);
    };
  }, []);

  return defaultVisibility;
};

/**
 * Helper function to dispatch a custom event when privacy settings change
 * Call this after updating privacy settings in localStorage
 */
export const notifyPrivacySettingsChanged = () => {
  window.dispatchEvent(new CustomEvent("privacySettingsChanged"));
}; 