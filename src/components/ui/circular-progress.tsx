import * as React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Progress value between 0 and 1
   */
  value: number;
  /**
   * Size of the circular progress ring (diameter in pixels)
   * @default 56
   */
  size?: number;
  /**
   * Width of the progress ring stroke
   * @default 2
   */
  strokeWidth?: number;
  /**
   * Color of the progress ring
   * @default 'hsl(var(--primary))'
   */
  color?: string;
}

/**
 * Circular progress ring component using SVG
 * Renders a circular progress indicator that starts at 12 o'clock
 * Uses stroke-dasharray and stroke-dashoffset for smooth progress animation
 */
export function CircularProgress({
  value,
  size = 56,
  strokeWidth = 4, // Increased default thickness
  color = 'hsl(var(--primary))',
  className,
  ...props
}: CircularProgressProps) {
  // Clamp value between 0 and 1
  const clampedValue = Math.min(Math.max(value, 0), 1);

  // Calculate SVG dimensions
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dash offset (starts at 12 o'clock, so full circle is at top)
  const strokeDashoffset = circumference - (clampedValue * circumference);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        aria-hidden="true" // Mark as decorative since progress is announced textually
      >
        {/* Background circle (full ring) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
    </div>
  );
}
