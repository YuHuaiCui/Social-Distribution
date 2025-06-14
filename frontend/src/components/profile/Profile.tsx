import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Loader from "../loader/Loader";
import Avatar from "../Avatar/Avatar";
import { useAuth } from "../context/AuthContext";

type ProfileData = {
  displayName: string;
  githubUsername: string;
  bio: string;
  profilePicture: string;
  email: string;
};

type backendProfileData = {
  display_name: string;
  github_username: string;
  bio: string;
  profile_image: string;
  email: string;
};

function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    displayName: "",
    githubUsername: "",
    bio: "",
    profilePicture: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/authors/me/`,
          {
            credentials: "include",
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        const data: backendProfileData = await response.json();

        setProfile({
          displayName: data.display_name || "",
          githubUsername: data.github_username || "",
          bio: data.bio || "",
          profilePicture: data.profile_image || "",
          email: data.email || "",
        });
        setFormData({
          displayName: data.display_name || "",
          githubUsername: data.github_username || "",
          bio: data.bio || "",
          profilePicture: data.profile_image || "",
          email: data.email || "",
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    // Only fetch profile if user is authenticated
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [userId, user?.id, isAuthenticated]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("Selected file:", file);
    if (file) {
      setImageFile(file);
      // Create a preview URL for the uploaded image
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      // Get CSRF token from cookie if it exists
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];

      let requestBody;
      const headers: Record<string, string> = {
        "X-CSRFToken": csrfToken || "", // Include CSRF token
      };

      // If we have an image file to upload, use FormData instead of JSON
      if (imageFile) {
        const formDataObj = new FormData();
        formDataObj.append("display_name", formData.displayName);
        formDataObj.append("github_username", formData.githubUsername);
        formDataObj.append("bio", formData.bio);
        formDataObj.append("email", formData.email);
        formDataObj.append("profile_image_file", imageFile);

        requestBody = formDataObj;
        // Don't set Content-Type header for FormData, the browser will set it automatically
      } else {
        // If no file, use JSON as usual
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify({
          display_name: formData.displayName,
          github_username: formData.githubUsername,
          bio: formData.bio,
          profile_image: formData.profilePicture,
          email: formData.email,
        });
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/authors/me/`,
        {
          method: "PATCH",
          headers: headers,
          credentials: "include", // This includes cookies in the request
          body: requestBody,
        }
      );
      if (!response.ok) {
        const errorBody = await response.text();
        try {
          const errorJson = JSON.parse(errorBody);

          // Handle email-specific errors
          if (errorJson.email) {
            throw new Error(`Email error: ${errorJson.email.join(", ")}`);
          }

          // Handle general errors with better formatting
          if (typeof errorJson === "object") {
            const errorMessages = Object.entries(errorJson)
              .map(([key, value]) => {
                const valueStr = Array.isArray(value)
                  ? value.join(", ")
                  : String(value);
                return `${key}: ${valueStr}`;
              })
              .join("; ");
            throw new Error(`Failed to update profile: ${errorMessages}`);
          }

          throw new Error(
            `Failed to update profile: ${JSON.stringify(errorJson)}`
          );
        } catch (e) {
          if (e instanceof Error) {
            throw e; // Rethrow our custom error
          }
          throw new Error(
            `Failed to update profile: ${response.status} ${response.statusText}`
          );
        }
      }

      const updatedData: backendProfileData = await response.json();
      const updatedProfile: ProfileData = {
        displayName: updatedData.display_name || "",
        githubUsername: updatedData.github_username || "",
        bio: updatedData.bio || "",
        profilePicture: updatedData.profile_image || "",
        email: updatedData.email || "",
      };
      setProfile(updatedProfile);
      setFormData(updatedProfile); // Update form data with new values
      setImageFile(null); // Clear the image file after successful upload
      setImagePreview(null); // Clear the image preview after successful upload
      setIsEditing(false);
      setIsLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };
  if (isLoading && !profile) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>

        {error && (
          <div className="bg-white border-l-4 border-black p-4 mb-6 rounded-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-black"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-black font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {isEditing ? (
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-black">Edit Profile</h2>
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
              </div>
              {/* Avatar Upload Section */}{" "}
              <div className="flex justify-center mb-8">
                <div className="relative group">
                  <Avatar
                    imgSrc={imagePreview || formData.profilePicture || null}
                    alt={formData.displayName}
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 002-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </label>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      className="block text-sm font-semibold text-black mb-2"
                      htmlFor="displayName"
                    >
                      Display Name
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white"
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-semibold text-black mb-2"
                      htmlFor="githubUsername"
                    >
                      GitHub Username
                    </label>
                    <input
                      type="text"
                      id="githubUsername"
                      name="githubUsername"
                      value={formData.githubUsername}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white"
                      placeholder="Enter your GitHub username"
                    />
                  </div>
                </div>

                <div>
                  {" "}
                  <label
                    className="block text-sm font-semibold text-black mb-2"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white"
                      placeholder="Enter your email address"
                      required
                    />
                    <div className="text-xs mt-1 text-gray-500">
                      Email is used for account recovery and notifications
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold text-black mb-2"
                    htmlFor="bio"
                  >
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-white resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </div>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setImageFile(null);
                      setImagePreview(null);
                      if (profile) {
                        setFormData({
                          displayName: profile.displayName || "",
                          githubUsername: profile.githubUsername || "",
                          bio: profile.bio || "",
                          profilePicture: profile.profilePicture || "",
                          email: profile.email || "",
                        });
                      }
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              {/* Cover Section */}
              <div className="h-32 bg-gradient-to-r from-gray-900 to-black relative">
                <div className="absolute -bottom-16 left-8">
                  <div className="relative group">
                    {" "}
                    <Avatar
                      imgSrc={profile?.profilePicture}
                      alt={profile?.displayName}
                    />
                    <button
                      onClick={() => setIsEditing(true)}
                      className="absolute -bottom-2 -right-2 w-10 h-10 bg-black border-4 border-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
                    >
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="pt-20 pb-8 px-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-black mb-1">
                      {profile?.displayName}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-black hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Email
                        </p>
                        <p className="text-lg font-semibold text-black">
                          {profile?.email || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          GitHub
                        </p>
                        {profile?.githubUsername ? (
                          <a
                            href={`https://github.com/${profile.githubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-black hover:text-gray-700 transition-colors"
                          >
                            {profile.githubUsername}
                          </a>
                        ) : (
                          <p className="text-lg font-semibold text-black">
                            Not provided
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-xl font-bold text-black mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                    About
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {profile?.bio || "This user hasn't written a bio yet."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
