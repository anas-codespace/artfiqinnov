import { motion } from 'framer-motion';
import { Target, Users, Zap, Globe, Mail } from 'lucide-react';
import ceoImage from '@/assets/ceo-sulaiman.jpeg';
import ctoImage from '@/assets/cto-anas.jpeg';

const founders = [
  {
    name: 'Mohammed Sulaiman',
    role: 'CEO',
    avatar: ceoImage,
    description: 'Visionary leader driving digital innovation',
  },
  {
    name: 'Mohammed Anas',
    role: 'CTO',
    avatar: ctoImage,
    description: 'Technical architect building the future',
  },
];

// Team members - update with real info and photos
const teamMembers = [
  {
    name: 'Team Member 1',
    role: 'Developer',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=member1',
    email: 'member1@artfiq.com',
  },
  {
    name: 'Team Member 2',
    role: 'Designer',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=member2',
    email: 'member2@artfiq.com',
  },
  {
    name: 'Team Member 3',
    role: 'Marketing',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=member3',
    email: 'member3@artfiq.com',
  },
  {
    name: 'Team Member 4',
    role: 'Operations',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=member4',
    email: 'member4@artfiq.com',
  },
];

const features = [
  { icon: Target, title: 'Mission-Driven', description: 'Focused on meaningful impact' },
  { icon: Zap, title: 'Lightning Fast', description: 'Optimized for performance' },
  { icon: Globe, title: 'Global Reach', description: 'Connecting teams worldwide' },
  { icon: Users, title: 'Team First', description: 'Collaboration at our core' },
];

export function HomeTab() {
  return (
    <div className="p-6 lg:p-8 space-y-12 max-w-5xl mx-auto">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-4xl lg:text-6xl font-bold mb-4">
            About <span className="text-gradient-cyber">ARTFIQ</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Bridging human needs with digital efficiency.
          </p>
        </motion.div>
      </motion.section>

      {/* Mission Card */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
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

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="glass-card rounded-xl p-5 text-center group cursor-default"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          );
        })}
      </motion.section>

      {/* Founders Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-semibold text-center">Meet the Founders</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {founders.map((founder, index) => (
            <motion.div
              key={founder.name}
              initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-6 flex items-center gap-5"
            >
              <div className="relative">
                <img
                  src={founder.avatar}
                  alt={founder.name}
                  className="w-20 h-20 rounded-2xl border-2 border-primary/30 object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">
                    {founder.role === 'CEO' ? '👑' : '⚡'}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{founder.name}</h3>
                <p className="text-primary font-medium text-sm mb-1">{founder.role}</p>
                <p className="text-sm text-muted-foreground">{founder.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Team Members Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-semibold text-center">Our Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="glass-card rounded-xl p-4 text-center group"
            >
              <img
                src={member.avatar}
                alt={member.name}
                className="w-16 h-16 rounded-full border-2 border-primary/30 mx-auto mb-3 object-cover"
              />
              <h3 className="font-medium text-sm">{member.name}</h3>
              <p className="text-xs text-primary mb-2">{member.role}</p>
              <a
                href={`mailto:${member.email}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{member.email}</span>
              </a>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
