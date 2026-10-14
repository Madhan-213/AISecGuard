/**
 * AISecGuard — Redesigned Homepage (Week 5)
 *
 * Design Direction: Professional Enterprise Security
 * - Deep navy/indigo palette with teal/emerald accents
 * - Clean typography hierarchy (Inter font)
 * - Subtle micro-animations on scroll
 * - Real product capability descriptions only
 * - Responsive layout with mobile-first approach
 * - Reduced cognitive load vs. prior neon/terminal design
 *
 * User Flow: Homepage → Start Scanning → Login → Dashboard
 * Route: / (public) → /login (public) → /dashboard (protected)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  Shield,
  ShieldCheck,
  Cpu,
  Database,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Lock,
  FileSearch,
  Activity,
  Layers,
  Hash,
  Menu,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated counter hook — counts up from 0 to target when element is visible */
function useCounter(target, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}

/** Animated stat number */
function AnimatedStat({ value, suffix = '', label }) {
  const [count, ref] = useCounter(value);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-bold text-white tracking-tight">
        {count}{suffix}
      </div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}

/** Severity badge */
function SeverityBadge({ level }) {
  const styles = {
    CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    LOW: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    INFORMATIONAL: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[level] || styles.INFORMATIONAL}`}>
      {level}
    </span>
  );
}

/** Scanner capability card */
function ScannerCard({ icon: Icon, color, title, formats, checks, badge }) {
  const colorMap = {
    teal: {
      icon: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20 hover:border-teal-400/40',
      badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    },
    violet: {
      icon: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20 hover:border-violet-400/40',
      badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    },
    blue: {
      icon: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20 hover:border-blue-400/40',
      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    },
  };
  const c = colorMap[color] || colorMap.teal;

  return (
    <div className={`group rounded-2xl border bg-slate-900/60 backdrop-blur-sm p-7 transition-all duration-300 ${c.border}`}>
      <div className="flex items-start justify-between mb-5">
        <div className={`p-3 rounded-xl ${c.bg} ${c.icon}`}>
          <Icon size={24} />
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${c.badge}`}>
          {badge}
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

      <div className="mb-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Formats</div>
        <div className="flex flex-wrap gap-1.5">
          {formats.map(fmt => (
            <span key={fmt} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700/50">
              {fmt}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Security Checks</div>
        <ul className="space-y-1.5">
          {checks.map(check => (
            <li key={check} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 size={13} className={`${c.icon} shrink-0`} />
              {check}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Sample finding row for the demo section */
function FindingRow({ rule, title, severity, desc }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/50 transition-colors">
      <div className="shrink-0 mt-0.5">
        <SeverityBadge level={severity} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-mono text-slate-500">{rule}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main HomePage Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleStartScanning = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // -------------------------------------------------------------------------
  // Nav links
  // -------------------------------------------------------------------------
  const navLinks = [
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Scanners', id: 'scanners' },
    { label: 'Demo', id: 'demo' },
    { label: 'Architecture', id: 'architecture' },
  ];

  return (
    <div className="min-h-screen bg-[#080e1e] text-slate-100 overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ================================================================
          AMBIENT BACKGROUND
          ================================================================ */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Top-center glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-30"
          style={{ background: 'radial-gradient(ellipse at center, rgba(20,184,166,0.3) 0%, rgba(37,99,235,0.15) 50%, transparent 75%)' }}
        />
        {/* Bottom-left accent */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] opacity-20"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(124,58,237,0.4) 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ================================================================
          NAVBAR
          ================================================================ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#080e1e]/90 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl shadow-black/40'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">

            {/* Brand */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 group cursor-pointer"
              aria-label="AISecGuard home"
            >
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500/30 to-blue-600/30 border border-teal-500/30 group-hover:border-teal-400/50 transition-all">
                <Shield size={22} className="text-teal-400" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold text-white tracking-tight">AISecGuard</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">AI Supply Chain Security</span>
              </div>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollTo(link.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Auth actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-teal-300 font-medium truncate max-w-[120px]">
                      {user.full_name || user.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-all shadow-lg shadow-teal-600/20 cursor-pointer"
                  >
                    Dashboard <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    id="nav-start-scanning"
                    onClick={handleStartScanning}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-all shadow-lg shadow-teal-600/25 cursor-pointer"
                  >
                    Start Scanning <ArrowRight size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#080e1e]/98 backdrop-blur-xl border-b border-slate-700/50 px-4 pb-6 pt-2 space-y-1">
            {navLinks.map(link => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollTo(link.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold cursor-pointer"
                >
                  Go to Dashboard <ArrowRight size={14} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 cursor-pointer"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); handleStartScanning(); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold cursor-pointer"
                  >
                    Start Scanning <ArrowRight size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">

            {/* Academic badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-950/60 border border-teal-500/30 text-xs font-semibold text-teal-400 mb-8 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              MCA Final Year Project · AI Supply Chain Security Research
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
              Scan AI Artifacts for{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #14b8a6, #3b82f6)' }}>
                Supply Chain Risks
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-10">
              AISecGuard statically analyzes AI models, training datasets, and dependency manifests
              to surface potential security indicators — without executing untrusted code.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <button
                type="button"
                id="hero-btn-start-scanning"
                onClick={handleStartScanning}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-base font-bold transition-all shadow-xl shadow-teal-600/25 hover:shadow-teal-500/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Start Scanning
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                id="hero-btn-see-demo"
                onClick={() => scrollTo('demo')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-base font-semibold transition-all cursor-pointer"
              >
                See a Sample Scan
                <ChevronDown size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Key differentiators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {[
                { icon: Lock, text: 'Zero Code Execution', sub: 'Static analysis only' },
                { icon: Hash, text: 'SHA-256 Integrity', sub: 'Artifact fingerprinting' },
                { icon: FileSearch, text: 'Structured Findings', sub: 'Evidence + recommendations' },
              ].map(({ icon: Icon, text, sub }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <Icon size={18} className="text-teal-400" />
                  <span className="text-sm font-semibold text-white">{text}</span>
                  <span className="text-xs text-slate-400">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS
          ================================================================ */}
      <section id="how-it-works" className="py-20 md:py-28 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-3">Workflow</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Upload. Scan. Review.
            </h2>
            <p className="text-slate-400 leading-relaxed">
              A three-step pipeline turns an uploaded artifact into a structured security report.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

            {[
              {
                step: '01',
                icon: Layers,
                title: 'Upload Artifact',
                desc: 'Upload an AI model, dataset file, or dependency manifest. AISecGuard validates the file type, computes its SHA-256 hash, and stores it securely.',
                details: ['File type validation', 'Size limit enforcement', 'SHA-256 fingerprinting'],
              },
              {
                step: '02',
                icon: FileSearch,
                title: 'Static Analysis',
                desc: 'The appropriate scanner runs static checks — inspecting binary structures, statistical patterns, or dependency declarations. No code is ever executed.',
                details: ['Format-specific inspection', 'Byte-level pattern matching', 'Statistical anomaly detection'],
              },
              {
                step: '03',
                icon: Activity,
                title: 'Risk Assessment',
                desc: 'Findings are aggregated into a risk score with severity breakdown. A structured report with evidence and recommendations is generated.',
                details: ['Weighted severity scoring', 'Findings with evidence', 'JSON & PDF report export'],
              },
            ].map(({ step, icon: Icon, title, desc, details }) => (
              <div key={step} className="relative group">
                <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-700/50 hover:border-teal-500/30 transition-all duration-300 h-full">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                      <Icon size={22} />
                    </div>
                    <div className="text-3xl font-black text-slate-700 font-mono">{step}</div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5">{desc}</p>
                  <ul className="space-y-2">
                    {details.map(d => (
                      <li key={d} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-teal-400 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          SCANNERS SECTION
          ================================================================ */}
      <section id="scanners" className="py-20 md:py-28 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">Security Scanners</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Three Specialized Scanners
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Each scanner is purpose-built for its artifact type, with format-specific static checks
              and risk indicators. All operate on bytes — never on executing code.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ScannerCard
              icon={Cpu}
              color="teal"
              title="AI Model Scanner"
              badge="Static Bytes"
              formats={['.pkl', '.joblib', '.pt', '.h5', '.onnx', '.safetensors', '.bin']}
              checks={[
                'Pickle opcode inspection (no deserialization)',
                'Suspicious module reference detection',
                'Format signature verification',
                'SafeTensors header struct parsing',
                'Embedded string pattern scan',
              ]}
            />
            <ScannerCard
              icon={Database}
              color="violet"
              title="Dataset Scanner"
              badge="Statistical"
              formats={['.csv', '.json', '.jsonl', '.parquet']}
              checks={[
                'Malformed / empty file detection',
                'Missing value rate analysis',
                'Duplicate record detection',
                'Numerical outlier (z-score) check',
                'Class imbalance indicator',
              ]}
            />
            <ScannerCard
              icon={Package}
              color="blue"
              title="Dependency Scanner"
              badge="Lexical"
              formats={['requirements.txt', 'pyproject.toml']}
              checks={[
                'Unpinned package detection',
                'Broad version constraint flags',
                'Typosquatting similarity heuristic',
                'Duplicate declaration check',
                'Invalid syntax detection',
              ]}
            />
          </div>

          {/* Disclaimer */}
          <div className="mt-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 max-w-3xl mx-auto">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              <strong className="text-amber-300">Academic Prototype Disclaimer:</strong>{' '}
              All findings are heuristic indicators produced by static analysis.
              A finding does not guarantee an artifact is actively malicious.
              Results require review by a qualified security analyst.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          STATS BAND
          ================================================================ */}
      <section className="py-14 border-t border-b border-slate-800/50 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedStat value={8} label="Supported model formats" />
            <AnimatedStat value={97} suffix="%" label="Automated test coverage" />
            <AnimatedStat value={5} label="Security check categories" />
            <AnimatedStat value={3} label="Report export formats" />
          </div>
        </div>
      </section>

      {/* ================================================================
          DEMO / SAMPLE SCAN
          ================================================================ */}
      <section id="demo" className="py-20 md:py-28 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Sample Output</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              What a Scan Result Looks Like
            </h2>
            <p className="text-slate-400 leading-relaxed">
              This is an illustrative example of the output format for a hypothetical pickle-based model scan.
              Real results are generated from your actual uploaded artifacts.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Sample scan header */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 overflow-hidden shadow-2xl">
              {/* Scan metadata bar */}
              <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                    <Cpu size={16} className="text-teal-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">suspicious_model.pkl</div>
                    <div className="text-xs text-slate-500 font-mono">sha256: a3f4b2c1... · 48 KB · MODEL</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                    COMPLETED
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-400">16</div>
                    <div className="text-xs text-slate-500">Risk Score · HIGH</div>
                  </div>
                </div>
              </div>

              {/* Risk breakdown */}
              <div className="px-6 py-4 border-b border-slate-700/50 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Critical', count: 0, color: 'text-red-400' },
                  { label: 'High', count: 2, color: 'text-orange-400' },
                  { label: 'Medium', count: 1, color: 'text-amber-400' },
                  { label: 'Low', count: 1, color: 'text-emerald-400' },
                  { label: 'Info', count: 0, color: 'text-slate-400' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="text-center">
                    <div className={`text-2xl font-bold ${color}`}>{count}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>

              {/* Sample findings */}
              <div className="p-5 space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Findings (illustrative example)</div>
                <FindingRow
                  rule="MODEL-001"
                  severity="HIGH"
                  title="Pickle-based serialization detected"
                  desc="The uploaded model uses a pickle-based format. Pickle can execute arbitrary Python code during deserialization."
                />
                <FindingRow
                  rule="MODEL-002"
                  severity="HIGH"
                  title="Suspicious module references in pickle opcodes"
                  desc="Static opcode inspection found GLOBAL references to os.system — a pattern associated with malicious pickle payloads."
                />
                <FindingRow
                  rule="PROV-001"
                  severity="MEDIUM"
                  title="No trusted provenance baseline available"
                  desc="No previously recorded SHA-256 hash exists for this artifact. This is the first upload of this file."
                />
                <FindingRow
                  rule="MODEL-005"
                  severity="LOW"
                  title="File size within normal range"
                  desc="The file size (48 KB) is within expected bounds for this format."
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
                <span className="italic">⚠ Sample output for illustration — not a real scan result</span>
                <span className="font-mono">JSON + PDF export available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          ARCHITECTURE SECTION
          ================================================================ */}
      <section id="architecture" className="py-20 md:py-28 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-3">Architecture</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Built on a Layered Security Model
            </h2>
            <p className="text-slate-400 leading-relaxed">
              AISecGuard is structured as a FastAPI backend with a React frontend,
              backed by SQLAlchemy and a modular scanner architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Shield,
                layer: 'API Layer',
                items: ['FastAPI REST endpoints', 'JWT authentication', 'Input validation', 'File upload handling'],
                color: 'teal',
              },
              {
                icon: FileSearch,
                layer: 'Scanner Layer',
                items: ['Model scanner (static)', 'Dataset scanner (statistical)', 'Dependency scanner (lexical)', 'Provenance checker'],
                color: 'blue',
              },
              {
                icon: Activity,
                layer: 'Risk Engine',
                items: ['Severity weighting', 'Score aggregation', 'Risk level mapping', 'Explainability output'],
                color: 'violet',
              },
              {
                icon: Database,
                layer: 'Data Layer',
                items: ['SQLAlchemy ORM', 'Alembic migrations', 'Scan history persistence', 'SHA-256 audit records'],
                color: 'emerald',
              },
            ].map(({ icon: Icon, layer, items, color }) => {
              const colorMap = {
                teal: { icon: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
                blue: { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                violet: { icon: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              };
              const c = colorMap[color];
              return (
                <div key={layer} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-slate-600/50 transition-all">
                  <div className={`p-3 rounded-xl ${c.bg} border ${c.border} ${c.icon} w-fit mb-4`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-white mb-3">{layer}</h3>
                  <ul className="space-y-2">
                    {items.map(item => (
                      <li key={item} className="text-sm text-slate-400 flex items-start gap-2">
                        <span className={`w-1 h-1 rounded-full mt-2 shrink-0 ${c.icon.replace('text-', 'bg-')}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          FINAL CTA
          ================================================================ */}
      <section className="py-20 md:py-28 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <div className="p-10 md:p-14 rounded-3xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(37,99,235,0.15) 100%)', border: '1px solid rgba(20,184,166,0.25)' }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(20,184,166,0.3) 0%, transparent 70%)' }}
            />
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-6">
                <ShieldCheck size={32} className="text-teal-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Analyze Your AI Artifacts?
              </h2>
              <p className="text-slate-300 leading-relaxed mb-8 max-w-xl mx-auto">
                Register for a free account and start scanning your AI models, datasets,
                and dependency files in minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  id="cta-start-scanning"
                  onClick={handleStartScanning}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-base font-bold transition-all shadow-xl shadow-teal-600/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  {user ? 'Go to Dashboard' : 'Create Account & Scan'}
                  <ArrowRight size={18} />
                </button>
                {!user && (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-200 hover:text-white hover:border-slate-500 text-base font-semibold transition-all cursor-pointer"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="border-t border-slate-800/50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Shield size={18} className="text-teal-400" />
              <span className="text-sm font-semibold text-slate-300">AISecGuard</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500">MCA Final Year Project</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Register
              </Link>
              <span className="text-xs text-slate-600">
                Static Analysis Only · No Code Execution
              </span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-xs text-slate-600 max-w-2xl mx-auto">
              AISecGuard is an academic research prototype. Security findings are heuristic indicators
              produced through static byte analysis. Results do not constitute professional security
              audits and must be reviewed by qualified analysts before acting on them.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
