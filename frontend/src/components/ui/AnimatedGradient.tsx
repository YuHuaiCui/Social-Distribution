import React from "react";

interface AnimatedGradientProps {
  children: React.ReactNode;
  className?: string;
  gradientColors: string[];
  duration?: number;
  textClassName?: string;
  onClick?: () => void;
  as?: "div" | "button";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export const AnimatedGradient: React.FC<AnimatedGradientProps> = ({
  children,
  className = "",
  gradientColors,
  duration = 20,
  textClassName = "",
  onClick,
  as = "div",
  type = "button",
  disabled = false,
}) => {
  // Create a smooth gradient that transitions between all colors
  const gradientStops = gradientColors.join(", ");

  const Component = as === "button" ? "button" : "div";

  return (
    <Component
      className={`relative overflow-hidden block animated-gradient-container ${className} ${
        disabled ? "disabled" : ""
      }`}
      onClick={onClick}
      type={as === "button" ? type : undefined}
      disabled={as === "button" ? disabled : undefined}
    >
      {/* Optimized CSS animated gradient background */}
      <div
        className="absolute inset-0 rounded-lg animated-gradient"
        style={{
          background: `linear-gradient(135deg, ${gradientStops})`,
          backgroundSize: "400% 400%",
          animationDuration: `${duration}s`,
        }}
      />

      {/* Content with contrast shadow */}
      <span className={`relative z-10 ${textClassName}`}>{children}</span>
    </Component>
  );
};

export default AnimatedGradient;
