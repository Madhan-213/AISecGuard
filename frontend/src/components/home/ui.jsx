/**
 * AISecGuard — Homepage shared UI pieces
 */

import { motion } from 'motion/react';
import { SEVERITY_STYLES, TONES } from './tokens';

export function SeverityBadge({ level, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold tracking-wide font-mono ${SEVERITY_STYLES[level] || SEVERITY_STYLES.INFORMATIONAL} ${className}`}
    >
      {level}
    </span>
  );
}

/** Fades and lifts its children into view once, when scrolled to. */
export function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

export function SectionHeader({ eyebrow, title, children, tone = 'teal' }) {
  return (
    <Reveal className="max-w-2xl mx-auto text-center mb-12 md:mb-16">
      <div className={`text-xs font-semibold uppercase tracking-[0.14em] mb-3 ${TONES[tone].text}`}>{eyebrow}</div>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-hp-fg mb-4 text-balance">{title}</h2>
      {children && <p className="text-hp-muted leading-relaxed text-pretty">{children}</p>}
    </Reveal>
  );
}

export function Section({ id, children, alt = false, className = '' }) {
  return (
    <section
      id={id}
      className={`py-20 md:py-28 border-t border-hp-line scroll-mt-16 ${alt ? 'bg-hp-bg-alt' : ''} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
