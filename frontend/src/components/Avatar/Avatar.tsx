import LoadingImage from "../ui/LoadingImage";
import { Shield, User } from 'lucide-react';

interface AvatarProps {
  imgSrc?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isAdmin?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-24 h-24 text-lg",
  xl: "w-32 h-32 text-xl",
};

export default function Avatar({
  imgSrc,
  alt = "User",
  size = "lg",
  className = "",
  isAdmin = false,
}: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const loaderSize = size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 24 : 32;
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 32 : 40;

  // Special handling for admin without profile image
  if (isAdmin && !imgSrc) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-[var(--primary-purple)] to-[var(--primary-pink)] text-white flex items-center justify-center neumorphism ${className}`}
      >
        <Shield size={iconSize} strokeWidth={2} />
      </div>
    );
  }

  if (imgSrc) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden neumorphism ${className}`}>
        <LoadingImage
          src={imgSrc}
          alt={alt}
          className="w-full h-full object-cover"
          loaderSize={loaderSize}
          aspectRatio="1/1"
          fallback={
            <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
              {isAdmin ? <Shield size={iconSize} strokeWidth={2} /> : alt.charAt(0).toUpperCase()}
            </div>
          }
        />
      </div>
    );
  }

  // Default avatar with initials or user icon
  const initials = alt
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center neumorphism font-bold ${className}`}
    >
      {initials ? initials : <User size={iconSize} strokeWidth={2} />}
    </div>
  );
}