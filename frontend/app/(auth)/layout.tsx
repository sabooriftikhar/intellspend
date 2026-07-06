import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-primary p-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">IntellSpend</span>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            Your finances, at a glance
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Track every rupee.<br />Own every decision.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            IntellSpend replaces your scattered Excel sheets with a single, intelligent dashboard — live balances, smart categorisation, and an AI advisor that actually knows your numbers.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Multiple books', desc: 'House, Sister, Personal — all in one place' },
            { label: 'Live balances', desc: 'Always computed, never stale' },
            { label: 'AI advisor', desc: 'Ask anything about your spending' },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-accent-green/20 flex items-center justify-center shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-accent-green" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-white/50">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">IntellSpend</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
