import { cn } from '@/lib/utils';

interface PostingBadgeProps {
  posting?: string | null;
  role?: 'ceo' | 'cto' | 'team' | null;
  className?: string;
}

export function PostingBadge({ posting, role, className }: PostingBadgeProps) {
  const displayPosting = posting?.trim() ? posting : 'Team Member';
  const isFounder = role === 'ceo' || role === 'cto';

  return (
    <span
      className={cn(
        'text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full w-fit inline-block backdrop-blur-md',
        isFounder
          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
          : 'bg-primary/10 border border-primary/20 text-primary',
        className
      )}
    >
      {displayPosting}
    </span>
  );
}
