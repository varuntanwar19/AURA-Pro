import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import MainDashboard from './components/Dashboard/MainDashboard';
import IaaSPanel from './components/IaaS/IaaSPanel';
import PaaSPanel from './components/PaaS/PaaSPanel';
import SaaSPanel from './components/SaaS/SaaSPanel';
import TerraformPanel from './components/Terraform/TerraformPanel';
import RAGChat from './components/RAGChat/RAGChat';
import ReportsPanel from './components/Reports/ReportsPanel';
import AgentWorkflow from './components/AgentWorkflow/AgentWorkflow';
import HumanInLoop from './components/AgentWorkflow/HumanInLoop';
import DatabasePanel from './components/Database/DatabasePanel';

import useAuraStore from './store/auraStore';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { i18n } = useTranslation();
  const { language, sidebarCollapsed } = useAuraStore();

  // Initialize WebSocket connection
  useWebSocket();

  // Sync language
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <div className="flex h-screen bg-aura-bg overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '240px' }}
      >
        {/* Top Bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-aura-bg">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <PageWrapper>
                    <MainDashboard />
                  </PageWrapper>
                }
              />
              <Route
                path="/iaas"
                element={
                  <PageWrapper>
                    <IaaSPanel />
                  </PageWrapper>
                }
              />
              <Route
                path="/paas"
                element={
                  <PageWrapper>
                    <PaaSPanel />
                  </PageWrapper>
                }
              />
              <Route
                path="/saas"
                element={
                  <PageWrapper>
                    <SaaSPanel />
                  </PageWrapper>
                }
              />
              <Route
                path="/terraform"
                element={
                  <PageWrapper>
                    <TerraformPanel />
                  </PageWrapper>
                }
              />
              <Route
                path="/rag"
                element={
                  <PageWrapper>
                    <RAGChat />
                  </PageWrapper>
                }
              />
              <Route
                path="/reports"
                element={
                  <PageWrapper>
                    <ReportsPanel />
                  </PageWrapper>
                }
              />
              <Route
                path="/workflows"
                element={
                  <PageWrapper>
                    <AgentWorkflow />
                  </PageWrapper>
                }
              />
              <Route
                path="/human-approval"
                element={
                  <PageWrapper>
                    <HumanInLoop />
                  </PageWrapper>
                }
              />
              <Route path="/database" element={<PageWrapper><DatabasePanel /></PageWrapper>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

export default App;
