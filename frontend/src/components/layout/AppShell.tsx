import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { Activity, Download, MoonStar, ShieldCheck, Sparkles, SunMedium } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface AppShellProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  children: ReactNode;
}

export function AppShell({ darkMode, onToggleTheme, children }: AppShellProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-start justify-between gap-4 rounded-3xl border border-slate-800/70 bg-slate-950/50 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                <Sparkles size={14} /> Nexus OCR pipeline
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Nexus Staking Excel Generator
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400 sm:text-base">
                Upload Nexus My Stakings screenshots, extract records with OCR, validate them, edit anything manually, and export a polished Excel report.
              </p>
            </div>
            <Button variant="secondary" onClick={onToggleTheme} className="shrink-0">
              {darkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
              {darkMode ? 'Light' : 'Dark'} mode
            </Button>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-3 text-slate-200"><Activity className="text-sky-400" size={18} /> OCR ready</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3 text-slate-200"><ShieldCheck className="text-emerald-400" size={18} /> Validation and dedupe</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3 text-slate-200"><Download className="text-cyan-400" size={18} /> Excel export workflow</div>
            </Card>
          </div>

          {children}
        </div>
      </div>
    </MotionConfig>
  );
}
