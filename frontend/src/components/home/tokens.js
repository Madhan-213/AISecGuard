/**
 * AISecGuard — Homepage colour classes (theme tokens are defined in index.css under .hp)
 */

export const TONES = {
  teal: { text: 'text-hp-accent', bg: 'bg-hp-accent/10', border: 'border-hp-accent/25', dot: 'bg-hp-accent' },
  violet: { text: 'text-hp-violet', bg: 'bg-hp-violet/10', border: 'border-hp-violet/25', dot: 'bg-hp-violet' },
  blue: { text: 'text-hp-blue', bg: 'bg-hp-blue/10', border: 'border-hp-blue/25', dot: 'bg-hp-blue' },
};

export const SEVERITY_STYLES = {
  CRITICAL: 'text-hp-crit bg-hp-crit/10 border-hp-crit/30',
  HIGH: 'text-hp-high bg-hp-high/10 border-hp-high/30',
  MEDIUM: 'text-hp-med bg-hp-med/10 border-hp-med/30',
  LOW: 'text-hp-low bg-hp-low/10 border-hp-low/30',
  INFORMATIONAL: 'text-hp-info bg-hp-info/10 border-hp-info/30',
};

export const SEVERITY_TEXT = {
  CRITICAL: 'text-hp-crit',
  HIGH: 'text-hp-high',
  MEDIUM: 'text-hp-med',
  LOW: 'text-hp-low',
  INFORMATIONAL: 'text-hp-info',
};
