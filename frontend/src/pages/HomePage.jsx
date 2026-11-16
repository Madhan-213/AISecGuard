/**
 * AISecGuard — Homepage
 *
 * Light and dark themes (system default, remembered toggle), motion-driven
 * walkthroughs of the real scan pipeline, and content that mirrors the backend
 * (formats, rule IDs, risk weights). Respects prefers-reduced-motion.
 *
 * User flow: Homepage → Start Scanning → Login (or Dashboard if signed in) → Upload → Scan → Report
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MotionConfig, animate, motion, useInView, useReducedMotion } from 'motion/react';
import {
  Activity, AlertTriangle, ArrowRight, Ban, Bug, ChevronDown, Database, ExternalLink, EyeOff,
  FileJson, FileSearch, FileText, GitBranch, Hash, Lock, Package, Server, Shield, ShieldCheck,
  Skull,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import HomeNav from '../components/home/HomeNav';
import HeroScanConsole from '../components/home/HeroScanConsole';
import PipelineFlow from '../components/home/PipelineFlow';
import RiskCalculator from '../components/home/RiskCalculator';
import Faq from '../components/home/Faq';
import { Reveal, Section, SectionHeader, SeverityBadge } from '../components/home/ui';
import { TONES } from '../components/home/tokens';
import { FORMAT_COUNT, MAX_UPLOAD_MB, RULE_COUNT, SCANNERS } from '../components/home/homeData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function AnimatedStat({ value, suffix = '', label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-bold tracking-tight text-hp-fg tabular-nums">
        {reduce && inView ? value : display}{suffix}
      </div>
      <div className="mt-1.5 text-sm text-hp-muted">{label}</div>
    </div>
  );
}

const THREATS = [
  {
    icon: Skull,
    title: 'Booby-trapped model files',
    attack: 'A pickle checkpoint can run os.system the moment someone calls pickle.load or torch.load.',
    caught: ['MODEL-002', 'Dangerous callable found in opcodes — without loading the file.'],
  },
  {
    icon: Bug,
    title: 'Poisoned training data',
    attack: 'Injected duplicate rows and extreme values quietly bias a model toward an attacker’s goal.',
    caught: ['DATA-007', 'Duplicate concentration, outliers and label skew are flagged.'],
  },
  {
    icon: Package,
    title: 'Typosquatted packages',
    attack: '“reqeusts” instead of “requests” installs someone else’s code on every build.',
    caught: ['DEP-005', 'Near-miss names of popular packages are reported.'],
  },
];

const LAYERS = [
  { icon: Server, title: 'API Layer', tone: 'teal', items: ['FastAPI REST endpoints', 'JWT authentication', 'Extension & size validation', 'Upload storage'] },
  { icon: GitBranch, title: 'Scanner Layer', tone: 'blue', items: ['Scanner registry by artifact type', 'Model · Dataset · Dependency', 'One Finding interface', 'Provenance check'] },
  { icon: Activity, title: 'Risk Engine', tone: 'violet', items: ['Severity weighting', 'Score aggregation', 'Risk level overrides', 'Plain-language explanation'] },
  { icon: Database, title: 'Data Layer', tone: 'teal', items: ['SQLAlchemy ORM', 'Alembic migrations', 'Scan & finding history', 'Quarantine audit log'] },
];

const GUARANTEES = [
  { icon: EyeOff, title: 'Never deserializes', text: 'No pickle.load, torch.load or eval on anything you upload.' },
  { icon: Ban, title: 'Never installs', text: 'Dependency files are read as text. No pip, no imports, no network.' },
  { icon: Hash, title: 'Fingerprints everything', text: 'Every artifact gets a SHA-256 hash for tamper checks.' },
  { icon: Lock, title: 'Quarantine with audit', text: 'Blocking an artifact records who did it, when and why.' },
];

function ScannerCard({ scanner, delay }) {
  const tone = TONES[scanner.tone];
  const Icon = scanner.icon;
  return (
    <Reveal delay={delay} className="h-full">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="hp-card h-full p-6 sm:p-7 flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <span className={`p-3 rounded-xl border ${tone.bg} ${tone.border} ${tone.text}`}>
            <Icon size={22} />
          </span>
          <span className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold ${tone.bg} ${tone.border} ${tone.text}`}>
            {scanner.badge}
          </span>
        </div>
        <h3 className="text-xl font-bold text-hp-fg mb-2">{scanner.title}</h3>
        <p className="text-sm text-hp-muted leading-relaxed mb-5">{scanner.summary}</p>

        <div className="text-[11px] font-semibold uppercase tracking-wider text-hp-faint mb-2">Formats</div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {scanner.formats.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded-md bg-hp-inset border border-hp-line text-xs font-mono text-hp-muted">{f}</span>
          ))}
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-wider text-hp-faint mb-2">Example rules</div>
        <ul className="space-y-1.5 mt-auto">
          {scanner.rules.map(([id, label]) => (
            <li key={id} className="flex items-baseline gap-2 text-sm">
              <span className={`font-mono text-[11px] shrink-0 ${tone.text}`}>{id}</span>
              <span className="text-hp-muted">{label}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </Reveal>
  );
}

function SampleReport() {
  const findings = [
    {
      rule: 'MODEL-002', severity: 'CRITICAL', title: 'Suspicious module/callable references found in pickle opcodes',
      evidence: 'Suspicious GLOBAL references found:\n  - os.system',
      fix: 'Do not deserialize this artifact. Investigate its origin and quarantine it.',
    },
    {
      rule: 'MODEL-001', severity: 'HIGH', title: 'Pickle-based serialization detected',
      evidence: 'File extension: .pkl',
      fix: 'Prefer SafeTensors or ONNX. Only load pickles from trusted sources in isolation.',
    },
    {
      rule: 'PROV-001', severity: 'INFORMATIONAL', title: 'Provenance recorded',
      evidence: 'sha256 recorded as the trusted baseline for this artifact.',
      fix: 'Future uploads with a different hash will be flagged.',
    },
  ];
  const [open, setOpen] = useState(0);

  return (
    <Reveal className="max-w-4xl mx-auto">
      <div className="hp-card overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-hp-line flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-hp-inset border border-hp-line text-hp-accent"><FileSearch size={16} /></span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-hp-fg truncate">resnet_classifier.pkl</div>
              <div className="text-xs font-mono text-hp-faint truncate">MODEL · 48 KB · ModelScanner</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border text-hp-low bg-hp-low/10 border-hp-low/30">COMPLETED</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-hp-high tabular-nums">16</div>
              <div className="text-[11px] text-hp-faint">Risk score · HIGH</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 border-b border-hp-line text-center">
          {[['Critical', 1, 'text-hp-crit'], ['High', 1, 'text-hp-high'], ['Medium', 0, 'text-hp-med'], ['Low', 0, 'text-hp-low'], ['Info', 1, 'text-hp-info']].map(([label, n, color]) => (
            <div key={label} className="py-3 border-r border-hp-line last:border-r-0">
              <div className={`text-xl font-bold tabular-nums ${color}`}>{n}</div>
              <div className="text-[11px] text-hp-faint">{label}</div>
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-5 space-y-2.5">
          {findings.map((f, i) => (
            <div key={f.rule} className="rounded-xl border border-hp-line bg-hp-inset/60">
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
                className="w-full flex items-start gap-3 p-3.5 text-left cursor-pointer"
              >
                <SeverityBadge level={f.severity} className="shrink-0 mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-mono text-hp-faint">{f.rule}</span>
                  <span className="block text-sm font-semibold text-hp-fg">{f.title}</span>
                </span>
                <motion.span animate={{ rotate: open === i ? 180 : 0 }} className="shrink-0 text-hp-faint mt-1">
                  <ChevronDown size={16} />
                </motion.span>
              </button>
              <motion.div
                initial={false}
                animate={{ height: open === i ? 'auto' : 0, opacity: open === i ? 1 : 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-4 grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-hp-faint uppercase tracking-wider text-[10px] mb-1">Evidence</div>
                    <pre className="whitespace-pre-wrap font-mono text-hp-muted bg-hp-surface border border-hp-line rounded-lg p-2.5">{f.evidence}</pre>
                  </div>
                  <div>
                    <div className="font-semibold text-hp-faint uppercase tracking-wider text-[10px] mb-1">Recommendation</div>
                    <p className="text-hp-muted leading-relaxed">{f.fix}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        <div className="px-5 sm:px-6 py-3.5 border-t border-hp-line bg-hp-inset flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-hp-faint italic">Illustrative example — real results come from your uploads.</span>
          <span className="flex items-center gap-2 text-hp-muted">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-hp-line bg-hp-surface"><FileJson size={12} /> JSON</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-hp-line bg-hp-surface"><FileText size={12} /> PDF</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-hp-crit/30 text-hp-crit bg-hp-crit/10"><Lock size={12} /> Quarantine</span>
          </span>
        </div>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme, fading } = useTheme();

  // Keep overscroll / rubber-band areas the same colour as the page.
  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme === 'dark' ? '#070c18' : '#f7f8fa';
    return () => { document.body.style.backgroundColor = previous; };
  }, [theme]);

  const handleStartScanning = () => navigate(user ? '/upload' : '/login');
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-theme={theme}
        className={`hp ${fading ? 'hp-theme-fade' : ''} min-h-screen overflow-x-clip font-sans antialiased selection:bg-hp-accent/25`}
      >
        <HomeNav
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
          onStart={handleStartScanning}
          onNavigate={navigate}
          onScrollTo={scrollTo}
        />

        {/* ============================== HERO ============================== */}
        <section id="hero" className="relative pt-28 pb-16 md:pt-36 md:pb-24">
          <div className="absolute inset-0 -z-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 hp-grid-bg" />
            <div className="absolute inset-0 hp-glow" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-hp-accent/30 bg-hp-accent/10 text-xs font-semibold text-hp-accent mb-7"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-hp-accent animate-pulse" />
                MCA Final Year Project · AI Supply Chain Security
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-hp-fg mb-6 text-balance"
              >
                Scan AI Artifacts for{' '}
                <span className="bg-gradient-to-r from-hp-accent to-hp-blue bg-clip-text text-transparent">Supply Chain Risks</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg text-hp-muted leading-relaxed max-w-xl mx-auto lg:mx-0 mb-9 text-pretty"
              >
                AISecGuard statically analyzes AI models, training datasets and dependency manifests for
                hidden code, poisoning and typosquatting — without ever executing what you upload.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10"
              >
                <button
                  type="button"
                  id="hero-btn-start-scanning"
                  onClick={handleStartScanning}
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-hp-accent hover:bg-hp-accent-strong text-hp-on-accent font-bold shadow-lg shadow-hp-accent/20 transition-colors cursor-pointer"
                >
                  Start Scanning
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  id="hero-btn-see-demo"
                  onClick={() => scrollTo('how-it-works')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-hp-line-strong bg-hp-surface text-hp-fg font-semibold hover:border-hp-accent/50 transition-colors cursor-pointer"
                >
                  See how it works
                  <ChevronDown size={18} className="text-hp-faint" />
                </button>
              </motion.div>

              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto lg:mx-0"
              >
                {[
                  { icon: Lock, text: 'Zero Code Execution', sub: 'Static analysis only' },
                  { icon: Hash, text: 'SHA-256 Integrity', sub: 'Tamper fingerprinting' },
                  { icon: FileSearch, text: 'Structured Findings', sub: 'Evidence + fixes' },
                ].map(({ icon: Icon, text, sub }) => (
                  <motion.li
                    key={text}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5 p-3.5 rounded-xl border border-hp-line bg-hp-surface/70 text-left"
                  >
                    <Icon size={18} className="text-hp-accent shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-hp-fg">{text}</span>
                      <span className="block text-xs text-hp-faint">{sub}</span>
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg mx-auto lg:max-w-none"
            >
              <HeroScanConsole />
            </motion.div>
          </div>
        </section>

        {/* ============================== THREATS ============================== */}
        <Section id="threats" alt>
          <SectionHeader eyebrow="The problem" title="AI artifacts are code you didn’t write" tone="violet">
            Models, datasets and packages are pulled from hubs and registries every day. Each can carry an attack
            that ordinary code scanners never look at.
          </SectionHeader>
          <div className="grid md:grid-cols-3 gap-5">
            {THREATS.map(({ icon: Icon, title, attack, caught }, i) => (
              <Reveal key={title} delay={i * 0.08} className="hp-card p-6 flex flex-col">
                <span className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-hp-crit/10 border border-hp-crit/25 text-hp-crit mb-4">
                  <Icon size={18} />
                </span>
                <h3 className="font-bold text-hp-fg mb-2">{title}</h3>
                <p className="text-sm text-hp-muted leading-relaxed mb-5">{attack}</p>
                <div className="mt-auto pt-4 border-t border-hp-line flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-hp-accent shrink-0 mt-0.5" />
                  <p className="text-sm text-hp-fg">
                    <span className="font-mono text-xs text-hp-accent mr-1.5">{caught[0]}</span>
                    {caught[1]}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* ============================== HOW IT WORKS ============================== */}
        <Section id="how-it-works">
          <SectionHeader eyebrow="Workflow" title="Upload. Scan. Review.">
            Every upload runs through the same six-step pipeline in the backend. Follow it below, or click any step.
          </SectionHeader>
          <Reveal>
            <PipelineFlow />
          </Reveal>
        </Section>

        {/* ============================== SCANNERS ============================== */}
        <Section id="scanners" alt>
          <SectionHeader eyebrow="Security scanners" title="Three Specialized Scanners" tone="blue">
            Each artifact type has its own scanner behind one shared interface. All of them read bytes and text —
            none of them run code.
          </SectionHeader>
          <div className="grid lg:grid-cols-3 gap-5">
            {SCANNERS.map((s, i) => <ScannerCard key={s.id} scanner={s} delay={i * 0.08} />)}
          </div>
        </Section>

        {/* ============================== STATS ============================== */}
        <section className="py-14 border-t border-hp-line">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
            <AnimatedStat value={8} label="Supported model formats" />
            <AnimatedStat value={FORMAT_COUNT} label="File formats in total" />
            <AnimatedStat value={RULE_COUNT} label="Detection rules" />
            <AnimatedStat value={MAX_UPLOAD_MB} suffix=" MB" label="Max upload size" />
          </div>
        </section>

        {/* ============================== RISK ============================== */}
        <Section id="risk" alt>
          <SectionHeader eyebrow="Risk engine" title="How a Risk Score Is Calculated" tone="violet">
            Findings add weighted points and the total maps to a level, with overrides so one critical issue is
            never averaged away. Try it — this uses the same rules as the backend.
          </SectionHeader>
          <Reveal>
            <RiskCalculator />
          </Reveal>
        </Section>

        {/* ============================== DEMO ============================== */}
        <Section id="demo">
          <SectionHeader eyebrow="Sample output" title="What a Scan Result Looks Like" tone="blue">
            Every finding carries a rule ID, severity, evidence and a recommendation. Expand a finding to see them.
          </SectionHeader>
          <SampleReport />
        </Section>

        {/* ============================== ARCHITECTURE ============================== */}
        <Section id="architecture" alt>
          <SectionHeader eyebrow="Architecture" title="Built on a Layered Security Model">
            A FastAPI backend and React frontend, with scanners plugged in through a registry and every result
            persisted for audit.
          </SectionHeader>
          <div className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {LAYERS.map(({ icon: Icon, title, tone, items }, i) => {
              const t = TONES[tone];
              return (
                <Reveal key={title} delay={i * 0.08} className="relative hp-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`p-2.5 rounded-xl border ${t.bg} ${t.border} ${t.text}`}><Icon size={18} /></span>
                    <span className="font-mono text-xs text-hp-faint">L{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-hp-fg mb-3">{title}</h3>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-hp-muted">
                        <span className={`w-1 h-1 rounded-full mt-2 shrink-0 ${t.dot}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {i < LAYERS.length - 1 && (
                    <span className="hidden lg:flex absolute top-1/2 -right-[14px] -translate-y-1/2 z-10 w-6 h-6 items-center justify-center rounded-full bg-hp-bg-alt border border-hp-line text-hp-faint">
                      <ArrowRight size={12} />
                    </span>
                  )}
                </Reveal>
              );
            })}
          </div>
        </Section>

        {/* ============================== SAFETY ============================== */}
        <Section id="safety">
          <SectionHeader eyebrow="Safety by design" title="Analysis that can’t be turned against you">
            A scanner that loads a malicious model has already lost. These rules hold for every scanner.
          </SectionHeader>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {GUARANTEES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.06} className="hp-card p-5">
                <Icon size={20} className="text-hp-accent mb-3" />
                <h3 className="font-semibold text-hp-fg mb-1.5">{title}</h3>
                <p className="text-sm text-hp-muted leading-relaxed">{text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="max-w-3xl mx-auto p-4 rounded-xl border border-hp-med/30 bg-hp-med/10 flex items-start gap-3">
            <AlertTriangle size={16} className="text-hp-med shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-hp-fg leading-relaxed">
              <strong>Academic Prototype Disclaimer:</strong>{' '}
              findings are heuristic indicators from static analysis. A finding does not prove an artifact is
              malicious, and a clean scan does not prove it is safe. Results need review by a qualified analyst.
            </p>
          </Reveal>
        </Section>

        {/* ============================== FAQ ============================== */}
        <Section id="faq" alt>
          <SectionHeader eyebrow="FAQ" title="Questions, answered" />
          <Reveal>
            <Faq />
          </Reveal>
        </Section>

        {/* ============================== CTA ============================== */}
        <section className="py-20 md:py-28 border-t border-hp-line">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="relative overflow-hidden rounded-3xl border border-hp-accent/30 bg-hp-surface p-8 sm:p-12 md:p-14 text-center">
              <div className="absolute inset-0 hp-glow pointer-events-none" aria-hidden="true" />
              <div className="relative">
                <motion.span
                  className="inline-flex p-3 rounded-2xl bg-hp-accent/10 border border-hp-accent/25 text-hp-accent mb-6"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ShieldCheck size={28} />
                </motion.span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-hp-fg mb-4 text-balance">
                  Ready to Analyze Your AI Artifacts?
                </h2>
                <p className="text-hp-muted leading-relaxed mb-8 max-w-xl mx-auto">
                  Upload a model, dataset or requirements file and get a scored, evidence-backed report in seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    id="cta-start-scanning"
                    onClick={handleStartScanning}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-hp-accent hover:bg-hp-accent-strong text-hp-on-accent font-bold transition-colors cursor-pointer"
                  >
                    {user ? 'Upload an artifact' : 'Create Account & Scan'}
                    <ArrowRight size={18} />
                  </button>
                  {user ? (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-hp-line-strong text-hp-fg font-semibold hover:border-hp-accent/50 transition-colors cursor-pointer"
                    >
                      Open Dashboard
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-hp-line-strong text-hp-fg font-semibold hover:border-hp-accent/50 transition-colors cursor-pointer"
                    >
                      Sign in
                    </button>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================== FOOTER ============================== */}
        <footer className="border-t border-hp-line bg-hp-bg-alt">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <img
                  src="/logos/logo-icon.png"
                  alt="AISecGuard"
                  className="w-7 h-7 rounded-md object-contain shrink-0"
                />
                <span className="font-bold text-hp-fg tracking-tight">AISecGuard</span>
              </div>
              <p className="text-sm text-hp-muted leading-relaxed max-w-xs">
                Static security scanning for AI models, datasets and dependencies. MCA Final Year Project.
              </p>
            </div>
            <FooterColumn title="Product">
              <FooterButton onClick={() => scrollTo('how-it-works')}>How it works</FooterButton>
              <FooterButton onClick={() => scrollTo('scanners')}>Scanners</FooterButton>
              <FooterButton onClick={() => scrollTo('risk')}>Risk scoring</FooterButton>
              <FooterButton onClick={() => scrollTo('faq')}>FAQ</FooterButton>
            </FooterColumn>
            <FooterColumn title="App">
              <Link to="/dashboard" className="text-sm text-hp-muted hover:text-hp-fg">Dashboard</Link>
              <Link to="/upload" className="text-sm text-hp-muted hover:text-hp-fg">Upload artifact</Link>
              <Link to="/scans" className="text-sm text-hp-muted hover:text-hp-fg">Scan history</Link>
              <Link to="/quarantine" className="text-sm text-hp-muted hover:text-hp-fg">Quarantine</Link>
            </FooterColumn>
            <FooterColumn title="Account & API">
              <Link to="/login" className="text-sm text-hp-muted hover:text-hp-fg">Sign in</Link>
              <Link to="/register" className="text-sm text-hp-muted hover:text-hp-fg">Register</Link>
              <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-hp-muted hover:text-hp-fg">
                API docs <ExternalLink size={12} />
              </a>
              <a href={`${API_BASE}/health`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-hp-muted hover:text-hp-fg">
                Health check <ExternalLink size={12} />
              </a>
            </FooterColumn>
          </div>
          <div className="border-t border-hp-line">
            <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-hp-faint text-center md:text-left">
              Academic research prototype · Static analysis only · No code execution. Findings are indicators, not a
              professional security audit.
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-hp-faint mb-3">{title}</div>
      <div className="flex flex-col items-start gap-2">{children}</div>
    </div>
  );
}

function FooterButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-hp-muted hover:text-hp-fg cursor-pointer">
      {children}
    </button>
  );
}
