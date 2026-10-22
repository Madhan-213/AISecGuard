/**
 * AISecGuard — Interactive risk calculator
 * Uses the same weights, thresholds and override rules as
 * backend/app/services/risk_engine.assess_risk().
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { CONSOLE_SCENARIOS, SEVERITY_WEIGHTS, assessRisk } from './homeData';
import { SEVERITY_TEXT } from './tokens';

const LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
const EMPTY = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 };
const SCALE_MAX = 40;
const BANDS = [
  { level: 'LOW', from: 0, to: 5, color: 'bg-hp-low' },
  { level: 'MEDIUM', from: 5, to: 15, color: 'bg-hp-med' },
  { level: 'HIGH', from: 15, to: 30, color: 'bg-hp-high' },
  { level: 'CRITICAL', from: 30, to: SCALE_MAX, color: 'bg-hp-crit' },
];

function countsFor(scenario) {
  const counts = { ...EMPTY };
  scenario.findings.forEach(([, sev]) => { counts[sev] += 1; });
  return counts;
}

export default function RiskCalculator() {
  const [counts, setCounts] = useState(() => countsFor(CONSOLE_SCENARIOS[0]));
  const { score, level, reason } = assessRisk(counts);
  const marker = Math.min(score, SCALE_MAX) / SCALE_MAX;

  const change = (sev, delta) =>
    setCounts((c) => ({ ...c, [sev]: Math.max(0, Math.min(9, c[sev] + delta)) }));

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Inputs */}
      <div className="lg:col-span-3 hp-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-hp-fg">Findings in this scan</h3>
          <button
            type="button"
            onClick={() => setCounts(EMPTY)}
            className="inline-flex items-center gap-1.5 text-xs text-hp-muted hover:text-hp-fg cursor-pointer"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        <ul className="divide-y divide-hp-line">
          {LEVELS.map((sev) => (
            <li key={sev} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className={`text-sm font-semibold font-mono ${SEVERITY_TEXT[sev]}`}>{sev}</div>
                <div className="text-xs text-hp-faint">
                  {SEVERITY_WEIGHTS[sev]} {SEVERITY_WEIGHTS[sev] === 1 ? 'point' : 'points'} each
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => change(sev, -1)}
                  disabled={counts[sev] === 0}
                  aria-label={`Remove a ${sev} finding`}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-hp-line text-hp-muted hover:text-hp-fg hover:border-hp-line-strong disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center font-mono text-sm text-hp-fg tabular-nums" aria-live="polite">
                  {counts[sev]}
                </span>
                <button
                  type="button"
                  onClick={() => change(sev, 1)}
                  aria-label={`Add a ${sev} finding`}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-hp-line text-hp-muted hover:text-hp-fg hover:border-hp-line-strong cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-hp-line">
          <div className="text-xs text-hp-faint mb-2">Load a sample scan</div>
          <div className="flex flex-wrap gap-2">
            {CONSOLE_SCENARIOS.map((s) => (
              <button
                key={s.file}
                type="button"
                onClick={() => setCounts(countsFor(s))}
                className="px-2.5 py-1 rounded-md border border-hp-line bg-hp-inset text-xs font-mono text-hp-muted hover:text-hp-fg hover:border-hp-line-strong cursor-pointer"
              >
                {s.file}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="lg:col-span-2 hp-card p-5 sm:p-6 flex flex-col">
        <div className="text-xs font-semibold uppercase tracking-wider text-hp-faint mb-3">Risk assessment</div>
        <div className="flex items-end gap-3 mb-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={score}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-5xl font-bold tabular-nums text-hp-fg"
            >
              {score}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm text-hp-faint mb-2">points</span>
        </div>
        <motion.div
          key={level}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-2xl font-bold font-mono mb-2 ${SEVERITY_TEXT[level]}`}
        >
          {level}
        </motion.div>
        <p className="text-sm text-hp-muted mb-6">{reason}</p>

        {/* Gauge */}
        <div className="mt-auto">
          <div className="relative h-2.5 rounded-full overflow-hidden flex">
            {BANDS.map((b) => (
              <span
                key={b.level}
                className={`${b.color} ${b.level === level ? 'opacity-100' : 'opacity-30'} transition-opacity`}
                style={{ width: `${((b.to - b.from) / SCALE_MAX) * 100}%` }}
              />
            ))}
          </div>
          <div className="relative h-4">
            <motion.span
              className="absolute top-0 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-b-[7px] border-b-hp-fg"
              animate={{ left: `${marker * 100}%` }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            />
          </div>
          <div className="relative h-4 text-[10px] font-mono text-hp-faint">
            {[0, 5, 15, 30].map((tick) => (
              <span
                key={tick}
                className={`absolute ${tick === 0 ? '' : '-translate-x-1/2'}`}
                style={{ left: `${(tick / SCALE_MAX) * 100}%` }}
              >
                {tick}
              </span>
            ))}
            <span className="absolute right-0">40+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
