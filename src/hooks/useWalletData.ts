'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

interface WalletDataResult {
  walletBalance: number;
  transactions: WalletTransaction[];
  isLoading: boolean;
}

interface WalletRow {
  id: string;
  user_id: string;
  balance: number;
}

interface TransactionRow {
  id: string;
  user_id: string;
  transaction_type: 'credit' | 'debit' | 'refund';
  amount: number;
  description: string | null;
  created_at: string;
}

const mapTransactionType = (type: TransactionRow['transaction_type']): WalletTransaction['type'] =>
  type === 'debit' ? 'debit' : 'credit';

const normalizeTx = (row: TransactionRow): WalletTransaction => ({
  id: row.id,
  user_id: row.user_id,
  type: mapTransactionType(row.transaction_type),
  amount: Math.max(0, Number(row.amount) || 0),
  description: row.description?.trim() || 'Wallet transaction',
  created_at: row.created_at,
});

export function useWalletData(userId: string | undefined): WalletDataResult {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;
    let channels: RealtimeChannel[] = [];

    const fetchInitial = async () => {
      setIsLoading(true);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, user_id, balance')
        .eq('user_id', userId)
        .maybeSingle<WalletRow>();

      const { data: txRows } = await supabase
        .from('transactions')
        .select('id, user_id, transaction_type, amount, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!mounted) return;

      setWalletBalance(Math.max(0, Number(wallet?.balance) || 0));
      setTransactions((txRows ?? []).map(normalizeTx));
      setIsLoading(false);
    };

    fetchInitial();

    const walletChannel = supabase
      .channel(`wallet-balance-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as WalletRow;
          setWalletBalance(Math.max(0, Number(next.balance) || 0));
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel(`wallet-transactions-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as { id?: string };
            if (!oldRow?.id) return;
            setTransactions((prev) => prev.filter((tx) => tx.id !== oldRow.id));
            return;
          }

          const row = payload.new as TransactionRow;
          const tx = normalizeTx(row);

          setTransactions((prev) => {
            const withoutCurrent = prev.filter((existing) => existing.id !== tx.id);
            const merged = [tx, ...withoutCurrent];
            merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return merged;
          });
        }
      )
      .subscribe();

    channels = [walletChannel, txChannel];

    return () => {
      mounted = false;
      channels.forEach((ch) => {
        supabase.removeChannel(ch);
      });
    };
  }, [userId]);

  return useMemo(
    () => ({
      walletBalance: userId ? walletBalance : 0,
      transactions: userId ? transactions : [],
      isLoading: userId ? isLoading : false,
    }),
    [userId, walletBalance, transactions, isLoading]
  );
}

export default useWalletData;
