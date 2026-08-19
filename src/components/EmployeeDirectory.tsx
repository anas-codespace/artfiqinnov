import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Droplets, MapPin, ShieldAlert, Loader2, Search, BookUser } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import defaultAvatar from '@/assets/default-avatar.webp';

interface EmployeeRecord {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  blood_group: string | null;
  address: string | null;
  emergency_contact: string | null;
  posting: string | null;
}

export function EmployeeDirectory() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [{ data: profiles }, { data: privateInfo }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name, email, avatar_url, posting')
          .eq('access_status', 'approved_member')
          .order('display_name', { ascending: true }),
        supabase
          .from('employee_private_info')
          .select('user_id, phone_number, blood_group, address, emergency_contact'),
      ]);

      const privateMap = new Map((privateInfo || []).map(p => [p.user_id, p]));
      const merged: EmployeeRecord[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email,
        avatar_url: p.avatar_url,
        posting: p.posting,
        phone_number: privateMap.get(p.user_id)?.phone_number ?? null,
        blood_group: privateMap.get(p.user_id)?.blood_group ?? null,
        address: privateMap.get(p.user_id)?.address ?? null,
        emergency_contact: privateMap.get(p.user_id)?.emergency_contact ?? null,
      }));
      setEmployees(merged);
      setLoading(false);
    };
    fetch();
  }, []);


  const filtered = employees.filter(e =>
    !search || (e.display_name || '').toLowerCase().includes(search.toLowerCase()) || (e.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookUser className="w-5 h-5 text-primary" />
          Employee Directory
        </h2>
        <Badge variant="secondary">{filtered.length} employees</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No employees found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((emp, i) => (
            <motion.div
              key={emp.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={emp.avatar_url || defaultAvatar} />
                  <AvatarFallback>{(emp.display_name || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{emp.display_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                </div>
                {emp.posting && (
                  <Badge variant="outline" className="text-[10px]">{emp.posting}</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{emp.phone_number || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Droplets className="w-3 h-3 flex-shrink-0" />
                  <span>{emp.blood_group || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{emp.address || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                  <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                  <span>Emergency: {emp.emergency_contact || '—'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
