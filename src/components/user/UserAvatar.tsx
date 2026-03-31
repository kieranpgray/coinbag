import { cn } from '@/lib/utils';

export type UserAvatarSize = 'sm' | 'md';

function initialsFromLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    const s = `${first}${last}`.toUpperCase();
    return s || '?';
  }
  const single = parts[0] ?? '';
  if (single.length >= 2) return single.slice(0, 2).toUpperCase();
  if (single.length === 1) return single.slice(0, 1).toUpperCase();
  return '?';
}

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: 'h-8 w-8 min-h-8 min-w-8',
  md: 'h-16 w-16 min-h-16 min-w-16',
};

const textClasses: Record<UserAvatarSize, string> = {
  sm: 'text-body',
  md: 'text-lg',
};

export interface UserAvatarProps {
  imageUrl?: string | null;
  label: string;
  size?: UserAvatarSize;
  className?: string;
  alt?: string;
}

export function UserAvatar({
  imageUrl,
  label,
  size = 'sm',
  className,
  alt,
}: UserAvatarProps) {
  const initials = initialsFromLabel(label);
  const resolvedAlt = alt ?? (imageUrl ? `${label} profile photo` : undefined);

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
        sizeClasses[size],
        className
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={resolvedAlt ?? ''}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className={cn('font-medium text-muted-foreground', textClasses[size])}
          aria-hidden={Boolean(resolvedAlt)}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
