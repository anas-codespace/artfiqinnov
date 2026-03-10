import { cn } from '@/lib/utils';

interface PostingBadgeProps {
  posting?: string | null;
  role?: 'ceo' | 'cto' | 'admin' | 'team' | null;
  className?: string;
}

function getBadgeText(role?: 'ceo' | 'cto' | 'admin' | 'team' | null, posting?: string | null): string {
  if (role === 'ceo') return 'CEO';
  if (role === 'cto') return 'Managing Director';
  if (role === 'admin') return 'Admin';
  return posting?.trim() ? posting.toUpperCase() : 'TEAM';
}

export function isFounderRole(role?: 'ceo' | 'cto' | 'admin' | 'team' | null): boolean {
  return role === 'ceo' || role === 'cto';
}

export function isAdminRole(role?: 'ceo' | 'cto' | 'admin' | 'team' | null): boolean {
  return role === 'ceo' || role === 'cto' || role === 'admin';
}

export function PostingBadge({ posting, role, className }: PostingBadgeProps) {
  const text = getBadgeText(role, posting);
  const isFounder = isFounderRole(role);
  const isAdmin = role === 'admin';

  return (
    <span
      className={cn(
        'text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full w-fit inline-block backdrop-blur-md',
        isFounder
          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold'
          : isAdmin
          ? 'bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold'
          : 'bg-primary/10 border border-primary/20 text-primary',
        className
      )}
    >
      {text}
    </span>
  );
}
