/**
 * AISecGuard — Homepage FAQ accordion
 */

import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { FAQ } from './homeData';

function FaqItem({ q, a, open, onToggle }) {
  const id = useId();
  return (
    <div className="border-b border-hp-line last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="w-full flex items-center justify-between gap-4 py-4 text-left text-hp-fg font-semibold cursor-pointer hover:text-hp-accent transition-colors"
        >
          {q}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-hp-faint">
            <ChevronDown size={18} />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-8 text-sm text-hp-muted leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="max-w-3xl mx-auto hp-card px-5 sm:px-7">
      {FAQ.map((item, i) => (
        <FaqItem key={item.q} {...item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
      ))}
    </div>
  );
}
