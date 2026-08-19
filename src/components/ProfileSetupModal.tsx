import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Droplets, MapPin, ShieldAlert, Loader2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function ProfileSetupModal() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [saving, setSaving] = useState(false);

  // Don't show if profile is complete or no user
  if (!user || !profile) return null;

  // Cast to check the new field
  const isComplete = (profile as any).is_profile_complete === true;
  if (isComplete) return null;

  const canSubmit = fullName.trim().length >= 2 && phone.trim().length >= 10 && bloodGroup && address.trim().length >= 5 && emergencyContact.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSaving(true);

    const [{ error: privateError }, { error }] = await Promise.all([
      supabase
        .from('employee_private_info')
        .upsert({
          user_id: user.id,
          phone_number: phone.trim(),
          blood_group: bloodGroup,
          address: address.trim(),
          emergency_contact: emergencyContact.trim(),
        }, { onConflict: 'user_id' }),
      supabase
        .from('profiles')
        .update({
          display_name: fullName.trim(),
          is_profile_complete: true,
        } as any)
        .eq('user_id', user.id),
    ]);

    if (privateError) {
      toast({ title: 'Error', description: 'Failed to save profile. Please try again.', variant: 'destructive' });
      setSaving(false);
      return;
    }


    if (error) {
      toast({ title: 'Error', description: 'Failed to save profile. Please try again.', variant: 'destructive' });
    } else {
      toast({ title: '✅ Profile Complete', description: 'Welcome aboard! Your details have been saved.' });
      // Force reload to refresh profile data
      window.location.reload();
    }
    setSaving(false);
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2 border-b border-border pb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Employee Onboarding</h2>
            <p className="text-sm text-muted-foreground">
              Complete your profile to access the workspace. This is a one-time requirement.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="w-3.5 h-3.5" /> Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-secondary/30"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /> Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                type="tel"
                className="bg-secondary/30"
              />
            </div>

            {/* Blood Group */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Droplets className="w-3.5 h-3.5" /> Blood Group <span className="text-destructive">*</span>
              </Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger className="bg-secondary/30">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Residential Address */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> Residential Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full residential address"
                className="bg-secondary/30 min-h-[60px]"
                rows={2}
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="w-3.5 h-3.5" /> Emergency Contact <span className="text-destructive">*</span>
              </Label>
              <Input
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                type="tel"
                className="bg-secondary/30"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Complete Profile & Enter Workspace
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Your information is securely stored and only accessible to authorized administrators.
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
