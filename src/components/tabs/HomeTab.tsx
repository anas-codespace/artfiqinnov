import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Target, Users, Zap, Globe, Mail, Linkedin, Instagram } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FluidButton } from '@/components/ui/fluid-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { springPresets } from '@/components/ui/spring-config';
import defaultAvatarImg from '@/assets/default-avatar.webp';

// Founder emails for fetching dynamic avatars
const FOUNDER_EMAILS = {
  ceo: 'mohammedsulaimanofficial@gmail.com',
  cto: 'anas.m77581@gmail.com',
};

interface FounderData {
  name: string;
  role: string;
  email: string;
  description: string;
  bio: string;
  linkedin?: string;
  instagram?: string;
}

// Static metadata for founders (avatar will be fetched dynamically)
const foundersMetadata: FounderData[] = [
  {
    name: 'Mohammed Sulaiman',
    role: 'CEO',
    email: FOUNDER_EMAILS.ceo,
    description: 'Visionary leader driving digital innovation',
    bio: 'Mohammed Sulaiman is the CEO and co-founder of ARTFIQ Innovations. With a passion for bridging technology and human experiences, he leads the company\'s strategic vision and growth initiatives. His leadership focuses on creating meaningful digital solutions that empower teams worldwide.',
    linkedin: 'https://linkedin.com/in/mohammedsulaiman',
    instagram: 'https://instagram.com/chocoboy_sulai_',
  },
  {
    name: 'Mohammed Anas',
    role: 'CTO & Managing Director',
    email: FOUNDER_EMAILS.cto,
    description: 'Technical architect building the future',
    bio: 'Mohammed Anas serves as the CTO & Managing Director and co-founder of ARTFIQ Innovations. He oversees all technical aspects of the company, from architecture design to implementation. His expertise in modern technologies ensures that ARTFIQ delivers cutting-edge, performant, and scalable solutions.',
    linkedin: 'https://linkedin.com/in/mohammedanas',
    instagram: 'https://instagram.com/anas.m_07',
  },
];

interface Founder extends FounderData {
  avatar: string;
}

const features = [
  { icon: Target, title: 'Mission-Driven', description: 'Focused on meaningful impact' },
  { icon: Zap, title: 'Lightning Fast', description: 'Optimized for performance' },
  { icon: Globe, title: 'Global Reach', description: 'Connecting teams worldwide' },
  { icon: Users, title: 'Team First', description: 'Collaboration at our core' },
];

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function HomeTab() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [selectedFounder, setSelectedFounder] = useState<Founder | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms for different layers
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const featuresY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const foundersY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  // Fetch founders' dynamic avatars from profiles table
  useEffect(() => {
    const fetchFounderAvatars = async () => {
      const founderEmails = Object.values(FOUNDER_EMAILS);
      
      const { data: founderProfiles } = await supabase
        .from('profiles')
        .select('email, avatar_url')
        .in('email', founderEmails);
      
      // Create a map of email -> avatar_url
      const avatarMap = new Map<string, string>();
      founderProfiles?.forEach(profile => {
        if (profile.email && profile.avatar_url) {
          avatarMap.set(profile.email, profile.avatar_url);
        }
      });
      
      // Merge static metadata with dynamic avatars
      const foundersWithAvatars: Founder[] = foundersMetadata.map(founder => ({
        ...founder,
        avatar: avatarMap.get(founder.email) || defaultAvatarImg,
      }));
      
      setFounders(foundersWithAvatars);
    };

    fetchFounderAvatars();

    // Subscribe to real-time changes for founder profiles
    const founderEmails = Object.values(FOUNDER_EMAILS);
    const channel = supabase
      .channel('founder-profiles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updatedProfile = payload.new as { email?: string; avatar_url?: string };
          if (updatedProfile.email && founderEmails.includes(updatedProfile.email)) {
            // Re-fetch to get updated avatars
            fetchFounderAvatars();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      // Fetch founder user_ids from user_roles table
      const { data: founderRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['ceo', 'cto']);
      
      const founderUserIds = new Set(founderRoles?.map(r => r.user_id) || []);
      
      // Use profiles_safe view instead of profiles table to protect email privacy
      const { data } = await supabase
        .from('profiles_safe')
        .select('id, user_id, display_name, avatar_url, email')
        .order('created_at', { ascending: true });
      
      if (data) {
        // Filter out founders from team members list using role-based lookup
        const filteredMembers = data.filter(
          member => member.user_id && !founderUserIds.has(member.user_id)
        );
        setTeamMembers(filteredMembers);
      }
    };

    fetchTeamMembers();
  }, []);

  return (
    <div ref={containerRef} className="p-6 lg:p-8 space-y-12 max-w-5xl mx-auto relative">
      {/* Deep parallax background layer */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{ scale: bgScale }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-destructive/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Hero Section with parallax */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ y: heroY }}
        className="text-center space-y-6 relative z-10"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-4xl lg:text-6xl font-bold mb-4">
            About <span className="text-primary">ARTFIQ</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Bridging human needs with digital efficiency.
          </p>
        </motion.div>
      </motion.section>

      {/* Mission Card with parallax */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{ y: featuresY }}
        className="relative z-10"
      >
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Target className="w-6 h-6 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-semibold">Our Mission</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              At ARTFIQ, we believe technology should amplify human potential, not complicate it. 
              Our mission is to create seamless digital experiences that bridge the gap between 
              complex systems and intuitive user interfaces. We're committed to building tools 
              that make teams more productive, connected, and empowered.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Features Grid with staggered parallax */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={{ y: featuresY }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                boxShadow: '0 20px 40px -10px hsl(var(--primary) / 0.2)',
              }}
              className="glass-card rounded-xl p-5 text-center group cursor-default relative overflow-hidden"
            >
              {/* Ripple effect background */}
              <motion.div
                className="absolute inset-0 bg-primary/0 rounded-xl"
                whileHover={{ backgroundColor: 'hsl(var(--primary) / 0.05)' }}
                transition={{ duration: 0.3 }}
              />
              <div className="relative z-10">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </motion.div>
                <h3 className="font-medium mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.section>

      {/* Founders Section - Profile Photos with Social Links */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        style={{ y: foundersY }}
        className="space-y-6 relative z-10"
      >
        <h2 className="text-2xl font-semibold text-center">Founders</h2>
        <div className="flex justify-center gap-12 lg:gap-16">
          {founders.map((founder, index) => (
            <motion.div
              key={founder.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
              className="relative group flex flex-col items-center"
            >
              {/* Clickable photo */}
              <motion.button
                onClick={() => setSelectedFounder(founder)}
                whileHover={{ 
                  scale: 1.1,
                }}
                whileTap={{ scale: 0.95 }}
                className="relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-full"
              >
                {/* Glow ring on hover */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  whileHover={{ 
                    boxShadow: '0 0 40px hsl(var(--primary) / 0.5)',
                  }}
                  transition={{ duration: 0.3 }}
                />
                <motion.img
                  src={founder.avatar}
                  alt={founder.name}
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full border-4 border-primary/50 object-cover relative z-10"
                  whileHover={{ borderColor: 'hsl(var(--primary))' }}
                />
                {/* Role badge - responsive text size for long titles */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 w-max max-w-[120px] lg:max-w-none">
                  <motion.div
                    className="px-2 lg:px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] lg:text-xs font-bold shadow-lg text-center leading-tight whitespace-nowrap"
                    whileHover={{ scale: 1.05 }}
                  >
                    {founder.role}
                  </motion.div>
                </div>
              </motion.button>
              
              {/* Name */}
              <p className="mt-6 text-sm font-medium text-center">{founder.name}</p>
              
              {/* Social Links */}
              <div className="flex gap-3 mt-3">
                {founder.linkedin && (
                  <motion.a
                    href={founder.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-full bg-card/80 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                  </motion.a>
                )}
                {founder.instagram && (
                  <motion.a
                    href={founder.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-full bg-card/80 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </motion.a>
                )}
                <motion.a
                  href={`mailto:${founder.email}`}
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-full bg-card/80 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </motion.a>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Founder Profile Modal */}
      <Dialog open={!!selectedFounder} onOpenChange={(open) => !open && setSelectedFounder(null)}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="sr-only">Founder Profile</DialogTitle>
          </DialogHeader>
          {selectedFounder && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.snappy}
              className="flex flex-col items-center text-center pt-2"
            >
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={springPresets.bouncy}
                className="relative mb-4"
              >
                <img
                  src={selectedFounder.avatar}
                  alt={selectedFounder.name}
                  className="w-28 h-28 rounded-full border-4 border-primary object-cover shadow-lg"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
                    {selectedFounder.role}
                  </span>
                </div>
              </motion.div>

              {/* Name & Description */}
              <h3 className="text-2xl font-bold mt-4">{selectedFounder.name}</h3>
              <p className="text-primary font-medium mt-1">{selectedFounder.description}</p>

              {/* Bio */}
              <p className="text-muted-foreground text-sm leading-relaxed mt-4 px-2">
                {selectedFounder.bio}
              </p>

              {/* Social Links */}
              <div className="flex gap-4 mt-6">
                {selectedFounder.linkedin && (
                  <a
                    href={selectedFounder.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {selectedFounder.instagram && (
                  <a
                    href={selectedFounder.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </a>
                )}
                <a
                  href={`mailto:${selectedFounder.email}`}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Members Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="space-y-6 relative z-10"
      >
        <h2 className="text-2xl font-semibold text-center">Our Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
              whileHover={{ 
                y: -8,
                boxShadow: '0 20px 40px -10px hsl(var(--primary) / 0.2)',
              }}
              className="glass-card rounded-xl p-4 text-center group relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-transparent"
                whileHover={{ borderColor: 'hsl(var(--primary) / 0.3)' }}
                transition={{ duration: 0.3 }}
              />
              <div className="relative z-10">
                <motion.img
                  src={member.avatar_url || defaultAvatarImg}
                  alt={member.display_name || 'Team member'}
                  className="w-16 h-16 rounded-full border-2 border-primary/30 mx-auto mb-3 object-cover"
                  whileHover={{ scale: 1.1, borderColor: 'hsl(var(--primary))' }}
                />
                <h3 className="font-medium text-sm">{member.display_name || 'Team Member'}</h3>
                {member.email && (
                  <FluidButton
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => window.location.href = `mailto:${member.email}`}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    <span className="truncate max-w-[80px]">{member.email}</span>
                  </FluidButton>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}