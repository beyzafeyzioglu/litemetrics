import { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router';
import type { Period } from '@litemetrics/client';
import { useAuth } from './auth';
import { useTheme } from './hooks/useTheme';
import { SiteSelector } from './components/SiteSelector';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { InsightsPage } from './pages/InsightsPage';
import { EventsPage } from './pages/EventsPage';
import { UsersPage } from './pages/UsersPage';
import { RealtimePage } from './pages/RealtimePage';
import { RetentionPage } from './pages/RetentionPage';
import { CampaignsPage } from './pages/CampaignsPage';
import {
  BarChart3,
  TrendingUp,
  Megaphone,
  Zap,
  List,
  Users,
  RefreshCcw,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { to: '/insights', label: 'Insights', icon: <TrendingUp className="w-5 h-5" /> },
  { to: '/campaigns', label: 'Campaigns', icon: <Megaphone className="w-5 h-5" /> },
  { to: '/realtime', label: 'Realtime', icon: <Zap className="w-5 h-5" /> },
  { to: '/events', label: 'Events', icon: <List className="w-5 h-5" /> },
  { to: '/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { to: '/retention', label: 'Retention', icon: <RefreshCcw className="w-5 h-5" /> },
];

export function App() {
  const { client } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [siteId, setSiteId] = useState('demo');
  const handleSiteChange = (id: string) => setSiteId(id);
  const [period, setPeriod] = useState<Period>('7d');
  const [userVisitorId, setUserVisitorId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleUserClick = (visitorId: string) => {
    setUserVisitorId(visitorId);
    navigate('/users');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={closeSidebar} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200/60 dark:border-zinc-800 shadow-sm flex flex-col transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <button
          onClick={closeSidebar}
          className="md:hidden absolute top-3 right-3 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        <NavLink to="/" onClick={closeSidebar} className="block px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col items-center gap-1">
            <img src="/logo.png" alt="Litemetrics" className="h-14" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
              Demo
            </span>
          </div>
        </NavLink>

        <div className="px-3 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <SiteSelector siteId={siteId} onChange={handleSiteChange} />
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => {
                if (item.to !== '/users') setUserVisitorId(null);
                closeSidebar();
              }}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-56 p-4 md:p-6 pt-14 md:pt-6">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<AnalyticsPage siteId={siteId} client={client} period={period} onPeriodChange={setPeriod} />} />
            <Route path="/insights" element={<InsightsPage siteId={siteId} client={client} period={period} onPeriodChange={setPeriod} />} />
            <Route path="/campaigns" element={<CampaignsPage siteId={siteId} client={client} period={period} onPeriodChange={setPeriod} />} />
            <Route path="/realtime" element={<RealtimePage siteId={siteId} client={client} />} />
            <Route path="/events" element={<EventsPage siteId={siteId} client={client} onUserClick={handleUserClick} />} />
            <Route path="/users" element={<UsersPage siteId={siteId} client={client} initialVisitorId={userVisitorId} onBack={() => setUserVisitorId(null)} />} />
            <Route path="/retention" element={<RetentionPage siteId={siteId} client={client} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
