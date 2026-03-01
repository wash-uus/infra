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
        Acts 1:7–9
      </motion.p>

      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.05 }}
        className="text-4xl font-black leading-tight text-white drop-shadow-[0_0_18px_rgba(212,175,55,0.18)] sm:text-6xl lg:text-7xl"
      >
        Spirit Revival Africa
      </motion.h1>

      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.12 }}
        className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-200 sm:text-xl"
      >
        Reigniting the Power of the Holy Spirit Across Africa
      </motion.p>

      <CTAButtons />
    </div>
  );
}
