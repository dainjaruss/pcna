'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Users,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

interface DashboardStats {
  totalArticles: number;
  totalUsers: number;
  totalSources: number;
  totalRatings: number;
  articlesToday: number;
  activeUsers: number;
  databaseSize: string;
  cacheStatus: string;
  uptime: string;
  lastFetch: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/health'),
      ]);

      if (statsRes.ok && healthRes.ok) {
        const statsData = await statsRes.json();
        const healthData = await healthRes.json();

        // Map the data to the expected format
        const mappedStats: DashboardStats = {
          totalArticles: statsData.stats.articles.total,
          totalUsers: statsData.stats.users.total,
          totalSources: statsData.stats.sources,
          totalRatings: statsData.stats.ratings,
          articlesToday: statsData.stats.articles.today,
          activeUsers: statsData.stats.users.active,
          databaseSize: healthData.db === 'ok' ? 'Connected' : 'Error',
          cacheStatus: healthData.cache?.connected ? `${healthData.cache.keys} keys` : 'Disconnected',
          uptime: `${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m`,
          lastFetch: statsData.lastFetch ? new Date(statsData.lastFetch).toLocaleString() : 'Never',
          healthStatus: healthData.status === 'ok' ? 'healthy' : healthData.status === 'degraded' ? 'degraded' : 'unhealthy',
        };

        setStats(mappedStats);
        setActivities(statsData.recentActivity || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger news fetch
      await fetch('/api/cron/fetch-news', {
        method: 'POST',
        headers: {
          'x-ui-trigger': 'true',
        },
      });
      // Then refresh dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Error during refresh:', error);
      // Still try to refresh dashboard data even if fetch fails
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Articles',
      value: stats?.totalArticles?.toLocaleString() || '0',
      icon: FileText,
      color: 'bg-blue-500',
      change: stats?.articlesToday ? `+${stats.articlesToday} today` : null,
    },
    {
      title: 'Active Users',
      value: stats?.totalUsers?.toLocaleString() || '0',
      icon: Users,
      color: 'bg-green-500',
      change: stats?.activeUsers ? `${stats.activeUsers} active` : null,
    },
    {
      title: 'News Sources',
      value: stats?.totalSources?.toLocaleString() || '0',
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: null,
    },
    {
      title: 'Total Ratings',
      value: stats?.totalRatings?.toLocaleString() || '0',
      icon: Activity,
      color: 'bg-orange-500',
      change: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            System overview and quick actions
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            {stats?.healthStatus === 'healthy' ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Health</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {stats?.healthStatus || 'Unknown'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Database</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {stats?.databaseSize || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cache</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {stats?.cacheStatus || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Fetch</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {stats?.lastFetch || 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
                {stat.change && (
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            label="Fetch News"
            onClick={async () => {
              const res = await fetch('/api/cron/fetch-news', { method: 'POST' });
              const data = await res.json();
              alert(`Fetched ${data.savedCount || 0} articles`);
            }}
          />
          <QuickActionButton
            label="Send Test Email"
            onClick={async () => {
              const email = prompt('Enter email address:');
              if (email) {
                await fetch('/api/email/test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });
                alert('Test email sent!');
              }
            }}
          />
          <QuickActionButton
            label="Clear Cache"
            onClick={async () => {
              await fetch('/api/admin/cache', { method: 'DELETE' });
              alert('Cache cleared!');
            }}
          />
          <QuickActionButton
            label="Run Cleanup"
            onClick={async () => {
              await fetch('/api/admin/cleanup', { method: 'POST' });
              alert('Cleanup completed!');
            }}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0"
              >
                <div>
                  <p className="text-gray-900 dark:text-white">{activity.message}</p>
                  <p className="text-sm text-gray-500">{activity.type}</p>
                </div>
                <span className="text-sm text-gray-500">{activity.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
        )}
      </div>
    </div>
  );
}

function QuickActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 font-medium"
    >
      {loading ? 'Processing...' : label}
    </button>
  );
}
