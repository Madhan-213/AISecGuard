/**
 * AISecGuard — Scan pipeline walkthrough
 * The six stages of backend/app/services/scan_service.run_scan. Auto-advances
 * while visible; clicking a stage pins it.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import {
  Activity, FileSearch, FileText, Fingerprint, GitBranch, Pause, Play, UploadCloud,
} from 'lucide-react';
import { PIPELINE } from './homeData';

const ICONS = {
  upload: UploadCloud,
  fingerprint: Fingerprint,
  route: GitBranch,
  analyse: FileSearch,
  score: Activity,
  act: FileText,
};
const ADVANCE_MS = 3200;

export default function PipelineFlow() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.35 });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!inView || !playing) return undefined;
    const timer = window.setTimeout(() => setActive((i) => (i + 1) % PIPELINE.length), ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [inView, playing, active]);

  const stage = PIPELINE[active];
  const StageIcon = ICONS[stage.key];
  const progress = (active / (PIPELINE.length - 1)) * 100;

  return (
    <div ref={ref}>
      {/* Stage rail */}
      <div className="relative">
        <div className="hidden md:block absolute left-[8.33%] right-[8.33%] top-6 h-px bg-hp-line" aria-hidden="true">
          <motion.div
            className="h-px bg-hp-accent origin-left"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <ol className="relative grid grid-cols-3 md:grid-cols-6 gap-y-6 gap-x-2" aria-label="Scan pipeline stages">
          {PIPELINE.map((s, i) => {
            const Icon = ICONS[s.key];
            const isActive = i === active;
            const isPast = i < active;
            return (
              <li key={s.key} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => { setActive(i); setPlaying(false); }}
                  aria-current={isActive ? 'step' : undefined}
                  className="group flex flex-col items-center gap-2.5 cursor-pointer"
                >
                  <span
                    className={`relative w-12 h-12 inline-flex items-center justify-center rounded-xl border transition-colors duration-300 ${
                      isActive
                        ? 'bg-hp-accent text-hp-on-accent border-hp-accent'
                        : isPast
                          ? 'bg-hp-accent/10 text-hp-accent border-hp-accent/30'
                          : 'bg-hp-surface text-hp-faint border-hp-line group-hover:text-hp-muted group-hover:border-hp-line-strong'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="pipeline-ring"
                        className="absolute -inset-1.5 rounded-[14px] border-2 border-hp-accent/35"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon size={20} />
                  </span>
                  <span className="text-center leading-tight">
                    <span className="block font-mono text-[10px] text-hp-faint">0{i + 1}</span>
                    <span className={`block text-xs sm:text-sm font-semibold ${isActive ? 'text-hp-fg' : 'text-hp-muted'}`}>
                      {s.short}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Detail panel */}
      <div className="mt-10 max-w-3xl mx-auto hp-card p-6 sm:p-7 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="flex flex-col sm:flex-row gap-5"
          >
            <span className="shrink-0 w-12 h-12 inline-flex items-center justify-center rounded-xl bg-hp-accent/10 border border-hp-accent/25 text-hp-accent">
              <StageIcon size={22} />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-mono text-hp-faint mb-1">Step {active + 1} of {PIPELINE.length}</div>
              <h3 className="text-xl font-bold text-hp-fg mb-2">{stage.title}</h3>
              <p className="text-sm text-hp-muted leading-relaxed mb-4">{stage.detail}</p>
              <code className="inline-block max-w-full overflow-x-auto px-3 py-1.5 rounded-lg bg-hp-inset border border-hp-line text-xs font-mono text-hp-accent">
                {stage.code}
              </code>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 pt-4 border-t border-hp-line flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden="true">
            {PIPELINE.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-hp-accent' : 'w-1.5 bg-hp-line-strong'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-hp-muted hover:text-hp-fg cursor-pointer"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? 'Pause walkthrough' : 'Play walkthrough'}
          </button>
        </div>
      </div>
    </div>
  );
}
