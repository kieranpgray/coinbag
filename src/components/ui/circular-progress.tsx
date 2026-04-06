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
   * @default 'var(--color-primary)'
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
  strokeWidth = 4,
  color = 'var(--color-primary)',
  className,
  ...props
}: CircularProgressProps) {
  const clampedValue = Math.min(Math.max(value, 0), 1);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = circumference - clampedValue * circumference;

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
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--paper-3)"
          strokeWidth={strokeWidth}
          fill="none"
        />
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
