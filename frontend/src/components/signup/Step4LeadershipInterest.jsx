import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";

import { step4Schema } from "../../schemas/signupSchemas";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

const MEMBERSHIP_OPTIONS = [
  {
    value: "member",
    icon: "🙏",
    title: "Just be a Member",
    description: "Join the movement, access content, connect with groups.",
  },
  {
    value: "digital_group",
    icon: "💻",
    title: "Serve in a Digital Group",
    description: "Help moderate or lead online ministry groups and discussions.",
  },
  {
    value: "revival_hub",
    icon: "🔥",
    title: "Start a Revival Hub",
    description: "Plant a local revival hub in your city or nation (future).",
  },
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function Step4LeadershipInterest({ defaultValues, onNext, onProfilePicChange }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(step4Schema),
    defaultValues,
    mode: "onTouched",
  });

  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileRef = useRef(null);

  const membershipType = watch("membership_type");
  const ledBefore = watch("led_ministry_before");

  const handleFile = (e) => {
    setFileError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { setFileError("File must be under 2 MB"); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) { setFileError("Only JPG, PNG, WEBP, or GIF allowed"); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setValue("profile_picture", file, { shouldValidate: true });
    onProfilePicChange?.(file);
  };

  return (
    <form id="step-form" onSubmit={handleSubmit(onNext)} className="space-y-6" noValidate>
      {/* Membership type */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
          How would you like to participate? <span className="text-amber-500">*</span>
        </label>
        <div className="space-y-3">
          {MEMBERSHIP_OPTIONS.map((opt) => (
            <label key={opt.value}>
              <input type="radio" value={opt.value} {...register("membership_type")} className="sr-only peer" />
              <div className="flex cursor-pointer items-start gap-4 rounded-2xl border border-zinc-800 p-4 transition-all duration-150 hover:border-zinc-600 peer-checked:border-amber-500 peer-checked:bg-amber-500/5">
                <span className="shrink-0 text-2xl">{opt.icon}</span>
                <div>
                  <p className="font-bold text-zinc-200 text-sm">{opt.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{opt.description}</p>
                </div>
                <div className="ml-auto shrink-0">
                  <div className={`h-4 w-4 rounded-full border-2 transition ${membershipType === opt.value ? "border-amber-500 bg-amber-500" : "border-zinc-600"}`} />
                </div>
              </div>
            </label>
          ))}
        </div>
        <FieldError message={errors.membership_type?.message} />
      </div>

      {/* Led Ministry Before */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Have you led any ministry before?
        </label>
        <div className="flex gap-3">
          {["yes", "no"].map((v) => (
            <label key={v} className="flex-1">
              <input type="radio" value={v} {...register("led_ministry_before")} className="sr-only peer" />
              <div className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-400 transition peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-300 hover:border-zinc-500 capitalize">
                {v}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Leadership experience (conditional) */}
      {ledBefore === "yes" && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Describe your leadership experience <span className="text-amber-500">*</span>
          </label>
          <textarea
            {...register("leadership_experience")}
            rows={3}
            maxLength={400}
            placeholder="E.g. Led youth group for 3 years, planted a cell church in…"
            className="input-dark resize-none"
          />
          <FieldError message={errors.leadership_experience?.message} />
        </div>
      )}

      {/* Profile Picture */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Profile Picture <span className="text-zinc-600 normal-case font-normal">(optional · max 2 MB)</span>
        </label>
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 p-6 transition hover:border-amber-500/40"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <div className="flex flex-col items-center gap-2">
              <img src={preview} alt="Preview" className="h-20 w-20 rounded-full object-cover ring-2 ring-amber-500/40" />
              <span className="text-xs text-amber-400 font-medium">Click to change</span>
            </div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-3xl ring-1 ring-zinc-700">
                📷
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-300">Click to upload photo</p>
                <p className="text-xs text-zinc-600 mt-0.5">JPG, PNG, WEBP up to 2 MB</p>
              </div>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
        {fileError && <p className="mt-1 text-xs text-red-400">{fileError}</p>}
      </div>
    </form>
  );
}
