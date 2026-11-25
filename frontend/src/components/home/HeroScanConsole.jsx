/**
 * AISecGuard — Hero scan console
 * Replays a typical scan for a model, a dataset and a dependency file:
 * pipeline stages tick through, then findings and the risk verdict appear.
 * Pauses when scrolled out of view; tabs let visitors pick a scenario.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { Check, Cpu, Database, Loader2, Package } from 'lucide-react';
import { CONSOLE_SCENARIOS } from './homeData';
import { SEVERITY_TEXT } from './tokens';
import { SeverityBadge } from './ui';

const STAGES = ['Validate upload', 'SHA-256 fingerprint', 'Route via registry', 'Static analysis', 'Risk scoring'];
const STAGE_MS = 650;
const HOLD_MS = 3600;
const TYPE_ICON = { MODEL: Cpu, DATASET: Database, DEPENDENCY: Package };

/** Stable, obviously-illustrative hex string derived from the file name. */
function demoHash(name) {
  let h = 2166136261;
  let out = '';
  for (let round = 0; round < 4; round++) {
    for (const ch of name + round) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return `${out.slice(0, 12)}…${out.slice(-6)}`;
}

export default function HeroScanConsole() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0); // 0..STAGES.length (== done)

  const scenario = CONSOLE_SCENARIOS[index];
  const done = step >= STAGES.length;

  useEffect(() => {
    if (!inView) return undefined;
    const timer = window.setTimeout(
      () => {
        if (done) {
          setIndex((i) => (i + 1) % CONSOLE_SCENARIOS.length);
          setStep(0);
        } else {
          setStep((s) => s + 1);
        }
      },
      done ? HOLD_MS : STAGE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [inView, step, done]);

  const select = (i) => {
    setIndex(i);
    setStep(0);
  };

  const Icon = TYPE_ICON[scenario.type];

  return (
    <div ref={ref} className="hp-card relative overflow-hidden text-left">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-hp-line bg-hp-inset">
        <span className="w-2.5 h-2.5 rounded-full bg-hp-crit/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-hp-med/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-hp-low/70" />
        <span className="ml-2 text-[11px] font-mono text-hp-faint truncate">aisecguard · scan replay</span>
      </div>

      {/* Scenario tabs */}
      <div className="flex gap-1 p-2 border-b border-hp-line" role="tablist" aria-label="Sample artifacts">
        {CONSOLE_SCENARIOS.map((s, i) => {
          const TabIcon = TYPE_ICON[s.type];
          const active = i === index;
          return (
            <button
              key={s.file}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => select(i)}
              className={`relative flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-mono cursor-pointer transition-colors ${
                active ? 'text-hp-fg' : 'text-hp-faint hover:text-hp-muted'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="console-tab"
                  className="absolute inset-0 rounded-md bg-hp-inset border border-hp-line"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <TabIcon size={12} className="relative shrink-0" />
              <span className="relative truncate">{s.type.toLowerCase()}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-5 font-mono text-xs">
        {/* Artifact header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="p-2 rounded-lg bg-hp-accent/10 border border-hp-accent/25 text-hp-accent">
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-hp-fg truncate">{scenario.file}</div>
            <div className="text-[11px] text-hp-faint truncate">
              {scenario.type} · {scenario.size} · sha256 {demoHash(scenario.file)}
            </div>
          </div>
        </div>

        {/* Stage list */}
        <ol className="space-y-1.5 mb-4">
          {STAGES.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'pending';
            return (
              <li key={label} className="flex items-center gap-2.5">
                <span
                  className={`w-4 h-4 inline-flex items-center justify-center rounded-full border transition-colors ${
                    state === 'done'
                      ? 'bg-hp-accent border-hp-accent text-hp-on-accent'
                      : state === 'active'
                        ? 'border-hp-accent text-hp-accent'
                        : 'border-hp-line-strong text-transparent'
                  }`}
                >
                  {state === 'done' ? <Check size={10} strokeWidth={3} /> : state === 'active' ? <Loader2 size={10} className="animate-spin" /> : null}
                </span>
                <span className={state === 'pending' ? 'text-hp-faint' : 'text-hp-fg'}>{label}</span>
                {label === 'Route via registry' && state !== 'pending' && (
                  <span className="text-hp-faint truncate">→ {scenario.scanner}</span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Progress beam */}
        <div className="relative h-1 rounded-full bg-hp-inset overflow-hidden mb-4">
          <motion.div
            className="absolute inset-y-0 left-0 bg-hp-accent rounded-full"
            animate={{ width: `${(Math.min(step, STAGES.length) / STAGES.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Findings + verdict */}
        <div className="min-h-[148px]">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key={`result-${scenario.file}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-2 mb-3">
                  {scenario.findings.map(([rule, sev, title], i) => (
                    <motion.div
                      key={rule}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.12 }}
                      className="flex items-start gap-2 p-2 rounded-lg bg-hp-inset border border-hp-line"
                    >
                      <SeverityBadge level={sev} className="shrink-0" />
                      <span className="min-w-0">
                        <span className="text-hp-faint mr-1.5">{rule}</span>
                        <span className="text-hp-fg font-sans text-[12px]">{title}</span>
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-hp-line">
                  <span className="text-hp-muted font-sans text-[12px]">{scenario.verdict}</span>
                  <span className="text-right">
                    <span className={`text-lg font-bold ${SEVERITY_TEXT[scenario.level]}`}>{scenario.score}</span>
                    <span className="text-hp-faint"> pts · </span>
                    <span className={`font-semibold ${SEVERITY_TEXT[scenario.level]}`}>{scenario.level}</span>
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`scanning-${scenario.file}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative h-[148px] rounded-lg border border-dashed border-hp-line overflow-hidden flex items-center justify-center text-hp-faint"
              >
                <span className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-hp-accent/15 to-transparent hp-scanline" />
                <span className="relative">Inspecting bytes — nothing is executed…</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
