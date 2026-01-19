import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { BottomDock } from '@/components/layout/BottomDock';
import { TopHeader } from '@/components/layout/TopHeader';
import { HomeTab } from '@/components/tabs/HomeTab';
import { VaultTab } from '@/components/tabs/VaultTab';
import { ChatTab } from '@/components/tabs/ChatTab';
import { TaskMatrixTab } from '@/components/tabs/TaskMatrixTab';
import { TimelineTab } from '@/components/tabs/TimelineTab';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { VisitorBanner } from '@/components/VisitorBanner';
import { Loader2 } from 'lucide-react';

function WorkspaceContent() {
  const { user, isLoading } = useAuth();
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

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'tasks':
        return <TaskMatrixTab />;
      case 'timeline':
        return <TimelineTab />;
      case 'vault':
        return <VaultTab />;
      case 'chat':
        return <ChatTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated gradient orbs background */}
      <AnimatedBackground />
      
      {/* Visitor Banner */}
      <VisitorBanner />
      
      <TopHeader onNavigate={setActiveTab} />
      
      <main className="pt-16 pb-28">
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
  );
}

const Index = () => {
  return (
    <AuthProvider>
      <WorkspaceContent />
    </AuthProvider>
  );
};

export default Index;
