import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/LoginScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { HomeTab } from '@/components/tabs/HomeTab';
import { VaultTab } from '@/components/tabs/VaultTab';
import { ChatTab } from '@/components/tabs/ChatTab';

function WorkspaceContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (!user) {
    return <LoginScreen />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'vault':
        return <VaultTab />;
      case 'chat':
        return <ChatTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 lg:ml-0 pt-16 pb-16 lg:pt-0 lg:pb-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
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
