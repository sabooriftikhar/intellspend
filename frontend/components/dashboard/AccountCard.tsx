'use client';

import { Building2, Wallet, Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { AccountWithBalance } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const typeConfig = {
  bank: {
    icon: Building2,
    label: 'Bank Account',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  cash: {
    icon: Banknote,
    label: 'Cash',
    iconBg: 'bg-accent-green/10',
    iconColor: 'text-accent-green',
  },
  credit_card: {
    icon: Wallet,
    label: 'Credit Card',
    iconBg: 'bg-accent-yellow/15',
    iconColor: 'text-accent-yellow',
  },
};

interface AccountCardProps {
  account: AccountWithBalance;
}

export default function AccountCard({ account }: AccountCardProps) {
  const config = typeConfig[account.type] ?? typeConfig.bank;
  const Icon = config.icon;
  const isPositive = account.balance >= 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', config.iconBg)}>
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{account.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{config.label}</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
          {account.currency}
        </span>
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {formatCurrency(account.balance, account.currency)}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {isPositive ? (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-green/10">
                <TrendingUp className="h-3 w-3 text-accent-green" />
              </div>
              <span className="text-xs font-medium text-accent-green">Available balance</span>
            </>
          ) : (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
                <TrendingDown className="h-3 w-3 text-destructive" />
              </div>
              <span className="text-xs font-medium text-destructive">Overdrawn</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
