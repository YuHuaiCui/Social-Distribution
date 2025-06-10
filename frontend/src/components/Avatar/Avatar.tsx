import React, { useState } from "react";

interface AvatarProps {
  imgSrc?: string | null;
  alt?: string;
}

function Avatar({ imgSrc, alt = "User" }: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="avatar inline-flex items-center justify-center">
      <div
        className="
          w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 
          rounded-full overflow-hidden 
          ring-2 ring-gray-200 
          shadow-inner bg-gray-100
          transition-transform duration-200 
          transform hover:scale-105
        "
      >
        {imgSrc && !hasError ? (
          <img
            src={imgSrc}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* simple silhouette SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 text-gray-400"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 
                   1.79-4 4 1.79 4 4 4zm0 2c-2.67 
                   0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default Avatar;
