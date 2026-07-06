'use client';

import { CalendarClock, CreditCard } from 'lucide-react';
import { AccountWithBalance } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CreditCardWidgetProps {
  account: AccountWithBalance;
}

export default function CreditCardWidget({ account }: CreditCardWidgetProps) {
  const balanceOwed = account.balance < 0 ? Math.abs(account.balance) : 0;
  const creditLimit = account.credit_limit ?? 0;
  const availableCredit = creditLimit > 0 ? creditLimit - balanceOwed : null;
  const daysUntilDue = getDaysUntilDue(account.due_day);
  const usagePercent = creditLimit > 0 ? Math.min((balanceOwed / creditLimit) * 100, 100) : 0;

  // Card number stub from account id
  const cardStub = String(account.id).padStart(4, '0').slice(-4);

  return (
    <div className="space-y-3">
      {/* Visual card — matching the design's dark teal premium card */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground min-h-[168px] flex flex-col justify-between shadow-lg">
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.04]" />
        <div className="absolute -right-4 bottom-[-2.5rem] h-48 w-48 rounded-full bg-white/[0.04]" />

        {/* Top row */}
        <div className="flex items-start justify-between relative">
          <CreditCard className="h-6 w-6 opacity-70" />
          <span className="text-xs font-bold tracking-[0.2em] opacity-70 uppercase">
            VISA
          </span>
        </div>

        {/* Card number */}
        <div className="relative">
          <p className="text-sm font-mono tracking-[0.18em] opacity-60 mb-2">
            **** **** **** {cardStub}
          </p>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between relative">
          <div>
            <p className="text-[10px] opacity-50 mb-0.5 uppercase tracking-wider">Balance owed</p>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(balanceOwed, account.currency)}
            </p>
          </div>
          <div className="text-right">
            {account.due_day && (
              <div>
                <p className="text-[10px] opacity-50 mb-0.5 uppercase tracking-wider">Due</p>
                <p className="text-sm font-semibold">{account.due_day}th</p>
              </div>
            )}
          </div>
        </div>

        {/* Cardholder */}
        <div className="relative flex items-center justify-between mt-1">
          <p className="text-xs font-medium opacity-70 truncate pr-4">{account.name}</p>
          {/* Mastercard-style circles */}
          <div className="flex -space-x-1.5 shrink-0">
            <div className="h-5 w-5 rounded-full bg-white/25" />
            <div className="h-5 w-5 rounded-full bg-white/15" />
          </div>
        </div>
      </div>

      {/* Credit usage bar */}
      {creditLimit > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Credit utilisation</span>
            <span
              className={cn(
                'font-semibold',
                usagePercent > 80 ? 'text-destructive' : usagePercent > 50 ? 'text-accent-yellow' : 'text-accent-green'
              )}
            >
              {usagePercent.toFixed(0)}%
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                usagePercent > 80 ? 'bg-destructive' : usagePercent > 50 ? 'bg-accent-yellow' : 'bg-accent-green'
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Used: {formatCurrency(balanceOwed, account.currency)}</span>
            {availableCredit !== null && (
              <span className="text-accent-green font-medium">
                {formatCurrency(availableCredit, account.currency)} free
              </span>
            )}
          </div>
        </div>
      )}

      {/* Days until due */}
      {daysUntilDue !== null && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl px-4 py-3 border',
            daysUntilDue <= 3
              ? 'bg-destructive/8 border-destructive/20'
              : 'bg-accent border-border'
          )}
        >
          <CalendarClock
            className={cn('h-4 w-4 shrink-0', daysUntilDue <= 3 ? 'text-destructive' : 'text-primary')}
          />
          <span className="text-sm">
            {daysUntilDue === 0 ? (
              <span className="font-semibold text-destructive">Payment due today</span>
            ) : daysUntilDue <= 3 ? (
              <span className="font-semibold text-destructive">Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}</span>
            ) : (
              <span className="text-foreground font-medium">{daysUntilDue} days until due</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
