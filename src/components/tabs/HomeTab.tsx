import { motion, useScroll, useTransform } from 'framer-motion';
import { Target, Users, Zap, Globe, Mail } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FluidButton } from '@/components/ui/fluid-button';
import ceoImage from '@/assets/ceo-sulaiman.jpeg';
import ctoImage from '@/assets/cto-anas.jpeg';

// Founder emails to filter from team list
const FOUNDER_EMAILS = [
  'mohammedsulaimanofficial@gmail.com',
  'anas.m77581@gmail.com',
];

const founders = [
  {
    name: 'Mohammed Sulaiman',
    role: 'CEO',
    avatar: ceoImage,
    email: 'mohammedsulaimanofficial@gmail.com',
  },
  {
    name: 'Mohammed Anas',
    role: 'CTO',
    avatar: ctoImage,
    email: 'anas.m77581@gmail.com',
  },
];

const features = [
  { icon: Target, title: 'Mission-Driven', description: 'Focused on meaningful impact' },
  { icon: Zap, title: 'Lightning Fast', description: 'Optimized for performance' },
  { icon: Globe, title: 'Global Reach', description: 'Connecting teams worldwide' },
  { icon: Users, title: 'Team First', description: 'Collaboration at our core' },
];

interface TeamMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function HomeTab() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .order('created_at', { ascending: true });
      
      if (data) {
        // Filter out founders from team members list
        const filteredMembers = data.filter(
          member => !FOUNDER_EMAILS.includes(member.email?.toLowerCase() || '')
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

      {/* Founders Section - Profile Photos Only */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        style={{ y: foundersY }}
        className="space-y-6 relative z-10"
      >
        <h2 className="text-2xl font-semibold text-center">Founders</h2>
        <div className="flex justify-center gap-8">
          {founders.map((founder, index) => (
            <motion.div
              key={founder.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
              whileHover={{ 
                scale: 1.1,
                boxShadow: '0 0 30px hsl(var(--primary) / 0.4)',
              }}
              className="relative group cursor-default"
            >
              {/* Glow ring on hover */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/0"
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
              {/* Role badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                <motion.div
                  className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  {founder.role}
                </motion.div>
              </div>
              {/* Name tooltip on hover */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileHover={{ opacity: 1, y: 0 }}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {founder.name}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.section>

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
                  src={member.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${member.id}`}
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