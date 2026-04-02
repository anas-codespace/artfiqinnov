import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AccessWarningProvider } from '@/contexts/AccessWarningContext';
import { ChatInputProvider } from '@/contexts/ChatInputContext';
import { LoginScreen } from '@/components/LoginScreen';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';
import { BottomDock } from '@/components/layout/BottomDock';
import { TopHeader } from '@/components/layout/TopHeader';
import { HomeTab } from '@/components/tabs/HomeTab';
import { VaultTab } from '@/components/tabs/VaultTab';
import { ChatTab } from '@/components/tabs/ChatTab';
import { TaskMatrixTab } from '@/components/tabs/TaskMatrixTab';
import { TimelineTab } from '@/components/tabs/TimelineTab';
import { PerformanceTab } from '@/components/tabs/PerformanceTab';
import { AnalyticsTab } from '@/components/tabs/AnalyticsTab';
import { InnovationLabTab } from '@/components/tabs/InnovationLabTab';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { AccessWarningToast } from '@/components/AccessWarningToast';
import { AnnouncementsTicker } from '@/components/AnnouncementsTicker';
import { Loader2 } from 'lucide-react';

function WorkspaceContent() {
  const { user, isLoading, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Show onboarding modal if profile is not complete
  const showOnboarding = profile && !(profile as any).is_profile_complete;

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <HomeTab />;
      case 'tasks': return <TaskMatrixTab />;
      case 'timeline': return <TimelineTab />;
      case 'performance': return <PerformanceTab />;
      case 'vault': return <VaultTab />;
      case 'chat': return <ChatTab />;
      case 'analytics': return <AnalyticsTab />;
      case 'innovation': return <InnovationLabTab />;
      default: return <HomeTab />;
    }
  };

  return (
    <AccessWarningProvider>
      <ChatInputProvider>
        <div className="min-h-screen bg-background relative">
          <AnimatedBackground />
          <AccessWarningToast />
          <TopHeader onNavigate={setActiveTab} />
          <AnnouncementsTicker />
          
          <main className="pt-[5.75rem] pb-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </main>

          <BottomDock activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </ChatInputProvider>
    </AccessWarningProvider>
  );
}

const Index = () => {
  return <WorkspaceContent />;
};

export default Index;
