import { useMemo, useState } from "react";

import api, { resolveMediaUrl } from "../../api/client";
import { COUNTRIES, MINISTRY_AREA_LABELS } from "../../schemas/signupSchemas";
import BaseModal from "../signup/BaseModal";
import StepProgressBar from "../signup/StepProgressBar";
import Step2SpiritualBackground from "../signup/Step2SpiritualBackground";
import Step3RevivalAlignment from "../signup/Step3RevivalAlignment";
import Step4LeadershipInterest from "../signup/Step4LeadershipInterest";
import Step5ReviewSubmit from "../signup/Step5ReviewSubmit";
import CityCombobox from "../signup/CityCombobox";

function mapProfileToForm(profile) {
  return {
    step1: {
      full_name: profile.full_name || "",
      email: profile.email || "",
      country: profile.country || "",
      city: profile.city || "",
      phone: profile.phone || "",
      gender: profile.gender || "",
      bio: profile.bio || "",
    },
    step2: {
      born_again: profile.born_again || "",
      year_of_salvation: profile.year_of_salvation ? String(profile.year_of_salvation) : "",
      church_name: profile.church_name || "",
      denomination: profile.denomination || "",
      serves_in_church: profile.serves_in_church || "",
      ministry_areas: profile.ministry_areas || [],
      testimony: profile.testimony || "",
    },
    step3: {
      why_join: profile.why_join || "",
      unity_agreement: !!profile.unity_agreement,
      statement_of_faith: !!profile.statement_of_faith,
      code_of_conduct: !!profile.code_of_conduct,
      subscribe_scripture: profile.subscribe_scripture ?? true,
    },
    step4: {
      membership_type: profile.membership_type || "member",
      led_ministry_before: profile.led_ministry_before || "",
      leadership_experience: profile.leadership_experience || "",
      profile_picture: null,
    },
  };
}

function Step1IdentityEdit({ defaultValues, onNext }) {
  const [data, setData] = useState(defaultValues);

  const update = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    if (!data.full_name?.trim()) return;
    if (!data.email?.trim()) return;
    if (!data.country?.trim()) return;
    onNext(data);
  };

  return (
    <form id="step-form" onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Full Name <span className="text-amber-500">*</span></label>
          <input
            value={data.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            type="text"
            className="input-dark"
            placeholder="John Okeke"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Email Address <span className="text-amber-500">*</span></label>
          <input
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            type="email"
            className="input-dark"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Bio</label>
        <textarea
          rows={3}
          value={data.bio}
          onChange={(e) => update("bio", e.target.value)}
          className="input-dark resize-none"
          placeholder="Tell us about yourself"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Country <span className="text-amber-500">*</span></label>
          <select className="input-dark" value={data.country} onChange={(e) => update("country", e.target.value)}>
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">City / Town / Market</label>
          <CityCombobox country={data.country} value={data.city} onChange={(val) => update("city", val)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Phone</label>
          <input
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
            type="tel"
            className="input-dark"
            placeholder="+234 800 000 0000"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Gender</label>
          <select className="input-dark" value={data.gender} onChange={(e) => update("gender", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>
    </form>
  );
}

export default function EditProfileModal({ open, profile, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(resolveMediaUrl(profile?.profile_picture) || null);
  const [formData, setFormData] = useState(() => mapProfileToForm(profile || {}));

  const TOTAL_STEPS = 5;

  const effectiveData = useMemo(() => mapProfileToForm(profile || {}), [profile]);

  const triggerNext = () => {
    const form = document.getElementById("step-form");
    if (form) form.requestSubmit();
  };

  const setStepData = (key, values) => {
    setFormData((prev) => ({ ...prev, [key]: { ...prev[key], ...values } }));
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const goToEdit = (targetStep) => setStep(targetStep);

  const handleProfilePicChange = (file) => {
    setProfilePicFile(file);
    setProfilePicPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setApiError("");
    setLoading(true);
    try {
      const { step1, step2, step3, step4 } = formData;
      const fd = new FormData();

      fd.append("full_name", step1.full_name || "");
      fd.append("email", step1.email || "");
      fd.append("bio", step1.bio || "");
      fd.append("country", step1.country || "");
      fd.append("city", step1.city || "");
      fd.append("phone", step1.phone || "");
      fd.append("gender", step1.gender || "");

      fd.append("born_again", step2.born_again || "");
      fd.append("year_of_salvation", step2.year_of_salvation || "");
      fd.append("church_name", step2.church_name || "");
      fd.append("denomination", step2.denomination || "");
      fd.append("serves_in_church", step2.serves_in_church || "");
      fd.append("ministry_areas", JSON.stringify(step2.ministry_areas || []));
      fd.append("testimony", step2.testimony || "");

      fd.append("why_join", step3.why_join || "");
      fd.append("unity_agreement", String(!!step3.unity_agreement));
      fd.append("statement_of_faith", String(!!step3.statement_of_faith));
      fd.append("code_of_conduct", String(!!step3.code_of_conduct));
      fd.append("subscribe_scripture", String(!!step3.subscribe_scripture));

      fd.append("membership_type", step4.membership_type || "member");
      fd.append("led_ministry_before", step4.led_ministry_before || "");
      fd.append("leadership_experience", step4.leadership_experience || "");

      if (profilePicFile) fd.append("profile_picture", profilePicFile);

      const res = await api.patch("/accounts/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onSaved?.(res.data);
      onClose?.();
      setStep(1);
      setFormData(effectiveData);
    } catch (err) {
      const data = err?.response?.data;
      if (typeof data === "string") setApiError(data);
      else if (data && typeof data === "object") setApiError(Object.values(data).flat().join(" "));
      else setApiError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData(effectiveData);
    setApiError("");
    setProfilePicFile(null);
    setProfilePicPreview(resolveMediaUrl(profile?.profile_picture) || null);
    onClose?.();
  };

  return (
    <BaseModal open={open} onClose={handleClose} maxWidth="max-w-2xl">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-base font-black text-black shadow-lg shadow-amber-500/20">
              ✎
            </div>
            <div>
              <h2 className="text-base font-black text-white">Edit Profile Details</h2>
              <p className="text-[11px] text-zinc-500">Update all details from your registration journey</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <StepProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
        <div className="h-px bg-zinc-800/60" />

        <div className="px-6 py-6 overflow-y-auto max-h-[55vh]">
          {step === 1 && (
            <Step1IdentityEdit
              defaultValues={formData.step1}
              onNext={(data) => setStepData("step1", data)}
            />
          )}
          {step === 2 && (
            <Step2SpiritualBackground
              defaultValues={formData.step2}
              onNext={(data) => setStepData("step2", data)}
            />
          )}
          {step === 3 && (
            <Step3RevivalAlignment
              defaultValues={formData.step3}
              onNext={(data) => setStepData("step3", data)}
              onOpenInfo={() => {}}
            />
          )}
          {step === 4 && (
            <Step4LeadershipInterest
              defaultValues={formData.step4}
              onNext={(data) => setStepData("step4", data)}
              onProfilePicChange={handleProfilePicChange}
            />
          )}
          {step === 5 && (
            <Step5ReviewSubmit
              formData={formData}
              profilePicPreview={profilePicPreview}
              onEdit={goToEdit}
              onSubmit={handleSubmit}
              loading={loading}
              apiError={apiError}
            />
          )}
        </div>

        {step < 5 && (
          <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="btn-outline py-2.5 px-5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i + 1 === step ? "w-4 bg-amber-500" : i + 1 < step ? "w-1.5 bg-amber-500/40" : "w-1.5 bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            <button type="button" onClick={triggerNext} className="btn-gold py-2.5 px-6 text-sm font-bold">
              {step === 4 ? "Review →" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
