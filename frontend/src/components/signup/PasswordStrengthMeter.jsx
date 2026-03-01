import { getPasswordStrength } from "../../schemas/signupSchemas";

const RULES = [
  { test: (p) => p.length >= 8, label: "At least 8 characters" },
  { test: (p) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p) => /[0-9]/.test(p), label: "One number" },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

export default function PasswordStrengthMeter({ password = "" }) {
  if (!password) return null;
  const { label, color, width } = getPasswordStrength(password);

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className={`h-full rounded-full ${color} ${width} transition-all duration-500`} />
        </div>
        <span className={`text-[11px] font-bold w-20 text-right ${color.replace("bg-", "text-")}`}>
          {label}
        </span>
      </div>

      {/* Rules checklist */}
      <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <div key={r.label} className={`flex items-center gap-1.5 text-[10px] font-medium ${ok ? "text-emerald-400" : "text-zinc-600"}`}>
              <span className={`h-3 w-3 rounded-full flex items-center justify-center text-[8px] ${ok ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-700"}`}>
                {ok ? "✓" : "·"}
              </span>
              {r.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
