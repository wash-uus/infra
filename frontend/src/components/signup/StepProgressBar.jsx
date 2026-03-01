const STEPS = [
  { n: 1, label: "Identity" },
  { n: 2, label: "Spiritual" },
  { n: 3, label: "Revival" },
  { n: 4, label: "Leadership" },
  { n: 5, label: "Review" },
];

export default function StepProgressBar({ currentStep, totalSteps = 5 }) {
  const pct = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

  return (
    <div className="px-6 pt-6 pb-4">
      {/* Label row */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs font-bold text-amber-400">{STEPS[currentStep - 1]?.label}</span>
      </div>

      {/* Bar */}
      <div className="relative h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="mt-3 flex items-center justify-between">
        {STEPS.map((s) => {
          const done = s.n < currentStep;
          const active = s.n === currentStep;
          return (
            <div key={s.n} className="flex flex-col items-center gap-1">
              <div
                className={`
                  flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold
                  transition-all duration-300
                  ${done ? "bg-amber-500 text-black" : active ? "ring-2 ring-amber-500 bg-zinc-900 text-amber-400" : "bg-zinc-800 text-zinc-600"}
                `}
              >
                {done ? "✓" : s.n}
              </div>
              <span
                className={`hidden sm:block text-[9px] font-semibold uppercase tracking-wide ${active ? "text-amber-400" : done ? "text-zinc-400" : "text-zinc-700"}`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
