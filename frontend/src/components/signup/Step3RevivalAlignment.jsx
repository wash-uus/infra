import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { step3Schema } from "../../schemas/signupSchemas";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function AgreementRow({ id, register, error, label, description, onReadMore }) {
  return (
    <div className={`rounded-xl border px-4 py-4 transition ${error ? "border-red-500/40 bg-red-500/5" : "border-zinc-800 bg-zinc-900/50"}`}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <div className="relative mt-0.5 shrink-0">
          <input
            id={id}
            type="checkbox"
            {...register}
            className="peer sr-only"
          />
          <div className="h-5 w-5 rounded border border-zinc-600 bg-zinc-900 transition peer-checked:border-amber-500 peer-checked:bg-amber-500 flex items-center justify-center">
            <svg className="hidden peer-checked:block h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">{label}</p>
          {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
        </div>
      </label>
      {onReadMore && (
        <button
          type="button"
          onClick={onReadMore}
          className="mt-2 ml-8 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition"
        >
          Read full text →
        </button>
      )}
      {error && <p className="mt-1 ml-8 text-xs text-red-400">{error.message}</p>}
    </div>
  );
}

export default function Step3RevivalAlignment({ defaultValues, onNext, onOpenInfo }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues,
    mode: "onTouched",
  });

  const whyJoin = watch("why_join", "");

  return (
    <form id="step-form" onSubmit={handleSubmit(onNext)} className="space-y-5" noValidate>
      {/* Why Join */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Why do you want to join Spirit Revival Africa?{" "}
          <span className="text-amber-500">*</span>
        </label>
        <textarea
          {...register("why_join")}
          rows={4}
          maxLength={600}
          placeholder="Share your heart. What draws you to this movement? What revival are you believing God for?"
          className="input-dark resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <FieldError message={errors.why_join?.message} />
          <span className="ml-auto text-[10px] text-zinc-600">{whyJoin.length}/600</span>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Agreements</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Unity Agreement */}
      <AgreementRow
        id="unity_agreement"
        register={register("unity_agreement")}
        error={errors.unity_agreement}
        label="I commit to uphold unity across denominations"
        description="I will honour fellow believers from all backgrounds and pursue unity in the Spirit."
      />

      {/* Statement of Faith */}
      <AgreementRow
        id="statement_of_faith"
        register={register("statement_of_faith")}
        error={errors.statement_of_faith}
        label="I agree to the Statement of Faith"
        description="I affirm the core biblical truths that SRA stands on."
        onReadMore={() => onOpenInfo("faith")}
      />

      {/* Code of Conduct */}
      <AgreementRow
        id="code_of_conduct"
        register={register("code_of_conduct")}
        error={errors.code_of_conduct}
        label="I agree to the Code of Conduct"
        description="I will engage on this platform with integrity, respect, and Christ-likeness."
        onReadMore={() => onOpenInfo("conduct")}
      />

      {/* Subscribe */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-4">
        <label htmlFor="subscribe_scripture" className="flex cursor-pointer items-center gap-3">
          <div className="relative shrink-0">
            <input id="subscribe_scripture" type="checkbox" {...register("subscribe_scripture")} className="peer sr-only" />
            <div className="h-5 w-5 rounded border border-zinc-600 bg-zinc-900 transition peer-checked:border-amber-500 peer-checked:bg-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">📖 Subscribe to daily scripture emails</p>
            <p className="text-xs text-zinc-500">Receive a daily verse and prayer point from SRA (recommended).</p>
          </div>
        </label>
      </div>
    </form>
  );
}
