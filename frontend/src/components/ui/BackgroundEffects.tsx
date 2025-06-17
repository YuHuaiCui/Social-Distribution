import React from 'react';
import { motion } from 'framer-motion';

interface FloatingAuraProps {
  size: number;
  color: string;
  initialX: string;
  initialY: string;
  duration: number;
  moveRange: number;
  blur?: number;
}

const FloatingAura: React.FC<FloatingAuraProps> = ({
  size,
  color,
  initialX,
  initialY,
  duration,
  moveRange,
  blur = 80
}) => {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle at center, ${color}40 0%, ${color}20 40%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        left: initialX,
        top: initialY,
      }}
      animate={{
        x: [0, moveRange, -moveRange, moveRange / 2, 0],
        y: [0, -moveRange / 2, moveRange, -moveRange, 0],
        scale: [1, 1.2, 1, 0.9, 1],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export const BackgroundEffects: React.FC = () => {
  // Generate floating aura configurations
  const auras = [
    // Large floating pink auras
    { size: 600, color: '#FF69B4', x: '10%', y: '20%', duration: 35, range: 100, blur: 120 },
    { size: 500, color: '#FF1493', x: '70%', y: '60%', duration: 40, range: 80, blur: 100 },
    
    // Purple auras
    { size: 550, color: '#9370DB', x: '80%', y: '10%', duration: 38, range: 90, blur: 110 },
    { size: 450, color: '#8A2BE2', x: '20%', y: '70%', duration: 42, range: 70, blur: 90 },
    
    // Blue auras
    { size: 480, color: '#4169E1', x: '50%', y: '40%', duration: 36, range: 85, blur: 95 },
    { size: 400, color: '#1E90FF', x: '30%', y: '80%', duration: 33, range: 75, blur: 85 },
    
    // Medium floating auras
    { size: 350, color: '#FF69B4', x: '60%', y: '25%', duration: 30, range: 60, blur: 70 },
    { size: 300, color: '#9370DB', x: '15%', y: '50%', duration: 28, range: 65, blur: 65 },
    { size: 320, color: '#4169E1', x: '85%', y: '70%', duration: 32, range: 55, blur: 68 },
    
    // Smaller accent auras
    { size: 250, color: '#FF1493', x: '40%', y: '15%', duration: 25, range: 50, blur: 60 },
    { size: 200, color: '#8A2BE2', x: '75%', y: '35%', duration: 27, range: 45, blur: 55 },
    { size: 220, color: '#1E90FF', x: '25%', y: '90%', duration: 29, range: 48, blur: 58 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient background - theme aware */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at top left, var(--background-2) 0%, var(--background-1) 50%),
            radial-gradient(ellipse at bottom right, var(--background-2) 0%, var(--background-1) 50%)
          `,
        }}
      />
      
      {/* Floating auras */}
      {auras.map((aura, index) => (
        <FloatingAura
          key={index}
          size={aura.size}
          color={aura.color}
          initialX={aura.x}
          initialY={aura.y}
          duration={aura.duration}
          moveRange={aura.range}
          blur={aura.blur}
        />
      ))}
      
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'soft-light',
        }}
      />
    </div>
  );
};

export default BackgroundEffects;