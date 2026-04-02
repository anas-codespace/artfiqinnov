import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StarAwardButtonProps {
  userId: string;
  displayName: string | null;
  currentCount: number;
  onAwarded: () => void;
}

export function StarAwardButton({ userId, displayName, currentCount, onAwarded }: StarAwardButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAward = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ star_of_the_week_count: currentCount + 1 } as any)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to award star', variant: 'destructive' });
    } else {
      toast({ title: '⭐ Star Awarded!', description: `${displayName || 'User'} is now Star of the Week!` });
      onAwarded();
    }
    setLoading(false);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAward}
      disabled={loading}
      className="gap-1 text-xs h-7"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
      Award Star ({currentCount})
    </Button>
  );
}
