'use client';

import { ChevronRight, DollarSign, Building2, Banknote } from 'lucide-react';
import { AccountWithBalance } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface WealthOverviewProps {
  bankAccounts: AccountWithBalance[];
  creditCards: AccountWithBalance[];
  primaryCurrency: string;
}

export default function WealthOverview({
  bankAccounts,
  creditCards,
  primaryCurrency,
}: WealthOverviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['banking']));

  const totalBanking = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalCredit = creditCards.reduce((sum, a) => {
    // credit card balance owed (negative balance means debt)
    return sum + (a.balance < 0 ? Math.abs(a.balance) : 0);
  }, 0);
  const netWorth = totalBanking - totalCredit;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const cashAccounts = bankAccounts.filter((a) => a.type === 'cash');
  const bankOnly = bankAccounts.filter((a) => a.type === 'bank');

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Wealth Overview</p>
            <p className="text-xs text-muted-foreground mt-0.5">All accounts combined</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-base font-bold text-foreground tabular-nums">
              {formatCurrency(netWorth, primaryCurrency)}
            </p>
            <p className="text-[10px] text-muted-foreground">Net worth</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border">
        {/* Banking section */}
        {bankOnly.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('banking')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Banking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(bankOnly.reduce((s, a) => s + a.balance, 0), primaryCurrency)}
                </span>
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    expandedSections.has('banking') && 'rotate-90'
                  )}
                />
              </div>
            </button>
            {expandedSections.has('banking') && (
              <div className="px-5 pb-3 space-y-2">
                {bankOnly.map((account) => (
                  <div key={account.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground pl-6">{account.name}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">
                      {formatCurrency(account.balance, account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cash section */}
        {cashAccounts.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('cash')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Cash</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(cashAccounts.reduce((s, a) => s + a.balance, 0), primaryCurrency)}
                </span>
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    expandedSections.has('cash') && 'rotate-90'
                  )}
                />
              </div>
            </button>
            {expandedSections.has('cash') && (
              <div className="px-5 pb-3 space-y-2">
                {cashAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground pl-6">{account.name}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">
                      {formatCurrency(account.balance, account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Credit cards section */}
        {creditCards.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('credit')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground text-[10px] font-bold">CC</span>
                <span className="text-sm font-medium text-foreground">Credit Cards</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold tabular-nums', totalCredit > 0 ? 'text-destructive' : 'text-foreground')}>
                  {totalCredit > 0 ? '-' : ''}{formatCurrency(totalCredit, primaryCurrency)}
                </span>
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    expandedSections.has('credit') && 'rotate-90'
                  )}
                />
              </div>
            </button>
            {expandedSections.has('credit') && (
              <div className="px-5 pb-3 space-y-2">
                {creditCards.map((account) => {
                  const owed = account.balance < 0 ? Math.abs(account.balance) : 0;
                  return (
                    <div key={account.id} className="flex items-center justify-between py-1">
                      <span className="text-xs text-muted-foreground pl-6">{account.name}</span>
                      <span className={cn('text-xs font-medium tabular-nums', owed > 0 ? 'text-destructive' : 'text-accent-green')}>
                        {owed > 0 ? `-${formatCurrency(owed, account.currency)}` : formatCurrency(0, account.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {bankAccounts.length === 0 && creditCards.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No accounts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
