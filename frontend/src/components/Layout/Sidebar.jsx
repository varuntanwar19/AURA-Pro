import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Server,
  Boxes,
  AppWindow,
  FileCode2,
  MessageSquareText,
  BarChart3,
  GitBranch,
  CheckSquare,
  Database,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import useAuraStore from '../../store/auraStore';

const navItems = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'iaas',      path: '/iaas',      icon: Server },
  { key: 'paas',      path: '/paas',      icon: Boxes },
  { key: 'saas',      path: '/saas',      icon: AppWindow },
  { key: 'terraform', path: '/terraform', icon: FileCode2 },
  { key: 'ragChat',   path: '/rag',       icon: MessageSquareText },
  { key: 'database',  path: '/database',  icon: Database },
  { key: 'reports',   path: '/reports',   icon: BarChart3 },
  { key: 'workflows', path: '/workflows', icon: GitBranch },
  { key: 'approvals', path: '/human-approval', icon: CheckSquare, badge: true },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, humanApprovalQueue } = useAuraStore();

  const pendingCount = humanApprovalQueue.filter((a) => a.status === 'pending').length;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full z-50 flex flex-col bg-aura-surface border-r border-aura-border overflow-hidden"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-aura-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-cyan flex items-center justify-center flex-shrink-0 shadow-cyan-glow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="min-w-0"
            >
              <span className="text-lg font-extrabold text-gradient-aura tracking-tight">AURA</span>
              <div className="text-[10px] text-aura-subtext leading-none mt-0.5 truncate">
                Multi-Cloud AI Platform
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1 px-2" role="list">
          {navItems.map(({ key, path, icon: Icon, badge }) => {
            const isActive = location.pathname === path ||
              (path !== '/dashboard' && location.pathname.startsWith(path));

            return (
              <li key={key}>
                <NavLink
                  to={path}
                  title={sidebarCollapsed ? t(`sidebar.${key}`) : undefined}
                  aria-label={t(`sidebar.${key}`)}
                  className={({ isActive: navActive }) =>
                    `flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-200 group relative
                    ${navActive || isActive
                      ? 'bg-aura-cyan/10 text-aura-cyan border border-aura-cyan/20'
                      : 'text-aura-subtext hover:text-aura-text hover:bg-aura-card border border-transparent'
                    }`
                  }
                >
                  <div className="relative flex-shrink-0">
                    <Icon
                      className={`w-5 h-5 transition-colors ${isActive ? 'text-aura-cyan' : 'group-hover:text-aura-text'}`}
                    />
                    {badge && pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-aura-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium truncate"
                    >
                      {t(`sidebar.${key}`)}
                    </motion.span>
                  )}
                  {!sidebarCollapsed && badge && pendingCount > 0 && (
                    <span className="ml-auto badge-danger text-[10px] px-1.5 py-0.5">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-aura-border flex-shrink-0">
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg
                     text-aura-subtext hover:text-aura-text hover:bg-aura-card
                     border border-transparent hover:border-aura-border transition-all duration-200"
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span className="text-xs">Collapse</span></>
          }
        </button>
      </div>
    </motion.aside>
  );
}
