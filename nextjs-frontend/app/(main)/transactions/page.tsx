'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, CheckCircle2, Clock, AlertCircle, CreditCard, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { Transaction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  disputed: 'danger',
  cancelled: 'default',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle2,
  disputed: AlertCircle,
  cancelled: AlertCircle,
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [stkTarget, setStkTarget] = useState<Transaction | null>(null);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data.data;
    },
    enabled: !!user,
  });

  const mpesaMutation = useMutation({
    mutationFn: ({ txId, phone, amount }: { txId: string; phone: string; amount: number }) =>
      api.post('/transactions/mpesa/stk-push', { transactionId: txId, phone, amount }),
    onSuccess: () => {
      setStkTarget(null);
      setMpesaPhone('');
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => toast.error('Failed to initiate M-Pesa payment. Please try again.'),
  });

  const releaseMutation = useMutation({
    mutationFn: (txId: string) => api.put(`/transactions/${txId}/release`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: () => toast.error('Failed to release payment. Please try again.'),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-infra-primary/5">
          <DollarSign className="h-5 w-5 text-infra-primary" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-16"><LoadingSpinner size="lg" /></div>
      ) : !transactions || transactions.length === 0 ? (
        <div className="mt-16 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-400">No transactions yet.</p>
          <p className="mt-1 text-sm text-gray-400">Transactions appear here when you hire or get hired.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {transactions.map((tx) => {
            const StatusIcon = STATUS_ICON[tx.status] ?? Clock;
            const isClient = tx.clientId === user.uid;
            return (
              <Card key={tx.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-infra-primary shadow-sm">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{tx.notes ?? tx.jobTitle ?? `Transaction #${tx.id.slice(-6)}`}</p>
                        <p className="text-xs text-gray-500">
                          {isClient ? `To: ${tx.professionalName}` : `From: ${tx.clientName}`} · {formatRelativeTime(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatCurrency(tx.amount, tx.currency)}</p>
                      <Badge variant={STATUS_BADGE[tx.status] ?? 'default'} className="mt-1 capitalize">
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {tx.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  {tx.status === 'pending' && isClient && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setStkTarget(tx)}
                      >
                        <Smartphone className="h-4 w-4" /> Pay via M-Pesa
                      </Button>
                    </div>
                  )}

                  {tx.status === 'completed' && isClient && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => { if (confirm('Release payment to professional?')) releaseMutation.mutate(tx.id); }}
                        loading={releaseMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Release Payment
                      </Button>
                    </div>
                  )}

                  {/* M-Pesa STK form */}
                  {stkTarget?.id === tx.id && (
                    <div className="mt-3 flex gap-2 items-end border-t border-gray-100 pt-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-gray-600">M-Pesa Phone Number</label>
                        <input
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-infra-primary focus:ring-4 focus:ring-infra-primary/10 focus:outline-none transition-all"
                          placeholder="e.g. 0712345678"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        loading={mpesaMutation.isPending}
                        onClick={() => mpesaMutation.mutate({ txId: tx.id, phone: mpesaPhone, amount: tx.amount })}
                      >
                        Send STK Push
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStkTarget(null)}>Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
