interface AvatarProps {
  imgSrc?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Avatar({
  imgSrc,
  alt = "User",
  size = "lg",
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border-4 border-white shadow-lg`}
      />
    );
  }

  // Default avatar with initials
  const initials = alt
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-black text-white flex items-center justify-center border-4 border-white shadow-lg font-bold`}
    >
      {initials || "U"}
    </div>
  );
}
