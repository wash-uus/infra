import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { step2Schema, MINISTRY_AREA_LABELS } from "../../schemas/signupSchemas";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function Label({ children }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </label>
  );
}

const YEARS = Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) =>
  String(new Date().getFullYear() - i)
);

const MINISTRY_KEYS = Object.keys(MINISTRY_AREA_LABELS);

export default function Step2SpiritualBackground({ defaultValues, onNext }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues,
    mode: "onTouched",
  });

  const ministryAreas = watch("ministry_areas") || [];

  const toggleMinistry = (key) => {
    const next = ministryAreas.includes(key)
      ? ministryAreas.filter((k) => k !== key)
      : [...ministryAreas, key];
    setValue("ministry_areas", next, { shouldValidate: true });
  };

  return (
    <form id="step-form" onSubmit={handleSubmit(onNext)} className="space-y-5" noValidate>
      {/* Born Again */}
      <div>
        <Label>Are you born again? <span className="text-amber-500">*</span></Label>
        <div className="flex gap-3">
          {["yes", "no"].map((v) => (
            <label key={v} className="flex-1">
              <input type="radio" value={v} {...register("born_again")} className="sr-only peer" />
              <div className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-400 transition peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-300 hover:border-zinc-500 capitalize">
                {v === "yes" ? "Yes, praise God! 🙌" : "Not yet"}
              </div>
            </label>
          ))}
        </div>
        <FieldError message={errors.born_again?.message} />
      </div>

      {/* Year of Salvation + Church Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Year of Salvation <span className="text-zinc-600 normal-case font-normal">(optional)</span></Label>
          <select {...register("year_of_salvation")} className="input-dark">
            <option value="">Select year…</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <FieldError message={errors.year_of_salvation?.message} />
        </div>
        <div>
          <Label>Church Name <span className="text-zinc-600 normal-case font-normal">(optional)</span></Label>
          <input
            {...register("church_name")}
            type="text"
            placeholder="e.g. Redeemed Christian Church"
            className="input-dark"
          />
        </div>
      </div>

      {/* Denomination + Serves in Church */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Denomination <span className="text-zinc-600 normal-case font-normal">(optional)</span></Label>
          <input
            {...register("denomination")}
            type="text"
            placeholder="e.g. Pentecostal, Baptist…"
            className="input-dark"
          />
        </div>
        <div>
          <Label>Do you serve in church?</Label>
          <div className="flex gap-3">
            {["yes", "no"].map((v) => (
              <label key={v} className="flex-1">
                <input type="radio" value={v} {...register("serves_in_church")} className="sr-only peer" />
                <div className="cursor-pointer rounded-xl border border-zinc-700 px-3 py-2.5 text-center text-sm font-semibold text-zinc-500 transition peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-300 hover:border-zinc-500 capitalize">
                  {v}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Ministry Areas */}
      <div>
        <Label>Ministry Area(s) <span className="text-zinc-600 normal-case font-normal">(select all that apply)</span></Label>
        <div className="flex flex-wrap gap-2">
          {MINISTRY_KEYS.map((key) => {
            const selected = ministryAreas.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleMinistry(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-150
                  ${selected
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                  }`}
              >
                {selected && "✓ "}{MINISTRY_AREA_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Testimony */}
      <div>
        <Label>
          Short Testimony{" "}
          <span className="text-zinc-600 normal-case font-normal">(optional — encouraged! 🙏)</span>
        </Label>
        <textarea
          {...register("testimony")}
          rows={3}
          placeholder="Share briefly how God has worked in your life…"
          maxLength={500}
          className="input-dark resize-none"
        />
        <div className="mt-1 text-right text-[10px] text-zinc-600">{watch("testimony")?.length || 0}/500</div>
        <FieldError message={errors.testimony?.message} />
      </div>
    </form>
  );
}
