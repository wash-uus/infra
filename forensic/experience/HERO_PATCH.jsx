// HERO_PATCH.jsx — Drop-in replacement for src/components/hero/TextContent.jsx
// Already applied to codebase. This file is the reference copy.

import { motion, useReducedMotion } from "framer-motion";
import CTAButtons from "./CTAButtons";

export default function TextContent() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-center">
      <motion.img
        src="/sra-logo.png"
        alt="Spirit Revival Africa logo"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-4 h-16 w-16 rounded-full border border-zinc-600 object-cover shadow-[0_0_24px_rgba(212,175,55,0.18)] sm:h-20 sm:w-20"
        loading="eager"
        decoding="async"
      />

      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-4 rounded-full border border-amber-500/30 bg-black/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400"
      >
        Spirit Revival Africa
      </motion.p>

      {/* NEW H1 — clear value statement, not just the brand name */}
      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.05 }}
        className="text-4xl font-black leading-tight text-white drop-shadow-[0_0_18px_rgba(212,175,55,0.18)] sm:text-5xl lg:text-6xl"
      >
        The Fire Is Already Burning.
        <br className="hidden sm:block" />
        Will You Carry It?
      </motion.h1>

      {/* NEW subheadline — describes the movement, not just the brand */}
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.12 }}
        className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg"
      >
        A movement training the next generation of African believers to pray deeper, preach bolder, and impact their generation.
      </motion.p>

      <CTAButtons />
    </div>
  );
}
