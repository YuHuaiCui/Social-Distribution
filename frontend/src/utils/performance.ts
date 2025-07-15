/**
 * Performance Configuration
 * Provides settings to optimize frontend performance and reduce CPU usage
 */

export interface PerformanceConfig {
  // Animation settings
  reduceMotion: boolean;
  lowPowerMode: boolean;

  // Background effects
  enableBackgroundAnimations: boolean;
  maxBackgroundAuras: number;

  // Component optimizations
  enableLazyLoading: boolean;
  debounceDelay: number;

  // Rendering optimizations
  enableVirtualization: boolean;
  maxVisiblePosts: number;
}

// Default performance configuration
export const defaultPerformanceConfig: PerformanceConfig = {
  reduceMotion: false,
  lowPowerMode: false,
  enableBackgroundAnimations: true,
  maxBackgroundAuras: 12,
  enableLazyLoading: true,
  debounceDelay: 300,
  enableVirtualization: false,
  maxVisiblePosts: 20,
};

// Performance presets
export const performancePresets = {
  // Maximum performance (minimal animations)
  maxPerformance: {
    reduceMotion: true,
    lowPowerMode: true,
    enableBackgroundAnimations: false,
    maxBackgroundAuras: 2,
    enableLazyLoading: true,
    debounceDelay: 500,
    enableVirtualization: true,
    maxVisiblePosts: 10,
  },

  // Balanced performance
  balanced: {
    reduceMotion: false,
    lowPowerMode: false,
    enableBackgroundAnimations: true,
    maxBackgroundAuras: 6,
    enableLazyLoading: true,
    debounceDelay: 300,
    enableVirtualization: false,
    maxVisiblePosts: 15,
  },

  // Full visual effects (default)
  fullEffects: defaultPerformanceConfig,
} as const;

// Get performance config based on system capabilities
export const getOptimalPerformanceConfig = (): PerformanceConfig => {
  // Check for user preference for reduced motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Check for low-end device indicators
  const isLowEndDevice =
    // Low CPU cores
    (navigator as any).hardwareConcurrency <= 2 ||
    // Low memory
    (navigator as any).deviceMemory <= 2 ||
    // Slow connection
    (navigator as any).connection?.effectiveType === "slow-2g" ||
    (navigator as any).connection?.effectiveType === "2g";

  if (prefersReducedMotion || isLowEndDevice) {
    return performancePresets.maxPerformance;
  }

  return performancePresets.balanced;
};

// CSS class utilities for performance modes
export const getPerformanceClasses = (config: PerformanceConfig) => ({
  reduceMotion: config.reduceMotion ? "motion-reduce" : "",
  lowPower: config.lowPowerMode ? "low-power-mode" : "",
  disableBackgroundAnimations: !config.enableBackgroundAnimations
    ? "no-bg-animations"
    : "",
});
