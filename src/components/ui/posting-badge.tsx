import { cn } from '@/lib/utils';

interface PostingBadgeProps {
  posting?: string | null;
  role?: 'ceo' | 'cto' | 'team' | null;
  className?: string;
}

function getBadgeText(role?: 'ceo' | 'cto' | 'team' | null, posting?: string | null): string {
  if (role === 'ceo') return 'CEO';
  if (role === 'cto') return 'Co-Founder, CTO & MD';
  return posting?.trim() ? posting.toUpperCase() : 'TEAM MEMBER';
}

export function isFounderRole(role?: 'ceo' | 'cto' | 'team' | null): boolean {
  return role === 'ceo' || role === 'cto';
}

export function PostingBadge({ posting, role, className }: PostingBadgeProps) {
  const text = getBadgeText(role, posting);
  const isFounder = isFounderRole(role);

  return (
    <span
      className={cn(
        'text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full w-fit inline-block backdrop-blur-md',
        isFounder
          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold'
          : 'bg-primary/10 border border-primary/20 text-primary',
        className
      )}
    >
      {text}
    </span>
  );
}
