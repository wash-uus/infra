'use client';

import { useQuery } from '@tanstack/react-query';
import { Server, Cpu, HardDrive, Clock, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

interface SystemMetrics {
  uptime: number;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
  };
  nodeVersion: string;
  platform: string;
  env: string;
  timestamp: string;
}

function MetricCard({ label, value, icon: Icon, sub }: {
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gray-100 p-2.5">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function memPercent(used: number, total: number): number {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

export default function AdminSystemPage() {
  const { data, isLoading, dataUpdatedAt, refetch } = useQuery<SystemMetrics>({
    queryKey: ['admin-system'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: SystemMetrics }>('/admin/metrics');
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const m = data;
  const heapPct = m ? memPercent(m.memory.heapUsedMb, m.memory.heapTotalMb) : 0;

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-infra-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Metrics</h1>
            <p className="text-sm text-gray-500">
              Backend service health — auto-refreshes every 30 s
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {m && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Uptime"
              value={formatUptime(m.uptime)}
              icon={Clock}
            />
            <MetricCard
              label="Heap Memory"
              value={`${m.memory.heapUsedMb} MB`}
              sub={`of ${m.memory.heapTotalMb} MB (${heapPct}%)`}
              icon={HardDrive}
            />
            <MetricCard
              label="RSS Memory"
              value={`${m.memory.rssMb} MB`}
              icon={HardDrive}
            />
            <MetricCard
              label="Node.js"
              value={m.nodeVersion}
              sub={`${m.platform} — ${m.env}`}
              icon={Cpu}
            />
          </div>

          {/* Heap bar */}
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Heap Memory Usage</h2>
            <div className="mb-2 flex justify-between text-xs text-gray-400">
              <span>{m.memory.heapUsedMb} MB used</span>
              <span>{m.memory.heapTotalMb} MB total</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${
                  heapPct > 80 ? 'bg-red-500' : heapPct > 60 ? 'bg-yellow-500' : 'bg-infra-primary'
                }`}
                style={{ width: `${heapPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {heapPct >= 80
                ? '⚠️ High memory usage — consider scaling or investigating leaks'
                : heapPct >= 60
                ? 'Memory usage elevated — monitor closely'
                : 'Memory usage normal'}
            </p>
          </div>

          <div className="mt-4 text-right text-xs text-gray-400">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}
