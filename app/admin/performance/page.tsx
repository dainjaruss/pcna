'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  Zap,
  Server,
  Cpu,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

interface PerformanceMetrics {
  responseTime: {
    avg: number;
    min: number;
    max: number;
  };
  requests: {
    total: number;
    success: number;
    errors: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  system: {
    memory: {
      used: string;
      total: string;
      percentage: number;
    };
    cpu: number;
    uptime: string;
  };
}

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMetrics, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/performance', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system metrics and performance data
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Response Time Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Avg Response Time"
          value={`${metrics?.responseTime.avg || 0}ms`}
          icon={Clock}
          color="bg-blue-500"
          subtitle={`Min: ${metrics?.responseTime.min || 0}ms / Max: ${metrics?.responseTime.max || 0}ms`}
        />
        <MetricCard
          title="Request Success Rate"
          value={`${metrics?.requests.total ? ((metrics.requests.success / metrics.requests.total) * 100).toFixed(1) : 100}%`}
          icon={Zap}
          color="bg-green-500"
          subtitle={`${metrics?.requests.success || 0} / ${metrics?.requests.total || 0} requests`}
        />
        <MetricCard
          title="Cache Hit Rate"
          value={`${metrics?.cache.hitRate.toFixed(1) || 0}%`}
          icon={Server}
          color="bg-purple-500"
          subtitle={`${metrics?.cache.hits || 0} hits / ${metrics?.cache.misses || 0} misses`}
        />
      </div>

      {/* System Resources */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Memory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {metrics?.system.memory.used} / {metrics?.system.memory.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  (metrics?.system.memory.percentage || 0) > 80
                    ? 'bg-red-500'
                    : (metrics?.system.memory.percentage || 0) > 60
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${metrics?.system.memory.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">CPU</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {metrics?.system.cpu.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  (metrics?.system.cpu || 0) > 80
                    ? 'bg-red-500'
                    : (metrics?.system.cpu || 0) > 60
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${metrics?.system.cpu || 0}%` }}
              />
            </div>
          </div>

          {/* Uptime */}
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {metrics?.system.uptime || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Request Statistics
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{metrics?.requests.success || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{metrics?.requests.errors || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{metrics?.requests.total || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  icon: typeof Activity;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
