import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/client";
import { useSignupPersist } from "../../hooks/useSignupPersist";

import BaseModal from "./BaseModal";
import StepProgressBar from "./StepProgressBar";
import InfoModal from "./InfoModal";
import Step1BasicIdentity from "./Step1BasicIdentity";
import Step2SpiritualBackground from "./Step2SpiritualBackground";
import Step3RevivalAlignment from "./Step3RevivalAlignment";
import Step4LeadershipInterest from "./Step4LeadershipInterest";
import Step5ReviewSubmit from "./Step5ReviewSubmit";

/* ── Success overlay ─────────────────────────────────── */
function SuccessOverlay({ name, onClose }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-16 text-center">
      {/* Animated checkmark */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 animate-ping opacity-40" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/30 text-4xl">
          🔥
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-white">Welcome, {name}!</h2>
        <p className="mt-2 text-zinc-400 max-w-sm mx-auto text-sm leading-relaxed">
          You've joined the Spirit Revival Africa movement. Check your email to verify your
          account — then the fire begins! 🙌
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 max-w-sm">
        <p className="text-sm font-semibold text-amber-300">Acts 1:8</p>
        <p className="mt-1 text-xs text-zinc-500 italic">
          "But you will receive power when the Holy Spirit comes on you; and you will be
          my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the
          earth."
        </p>
      </div>

      <button onClick={onClose} className="btn-gold py-3 px-10 text-sm font-bold">
        Go to Sign In →
      </button>
    </div>
  );
}

/* ── Main SignupModal ────────────────────────────────── */
export default function SignupModal({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [infoModal, setInfoModal] = useState(null); // "terms" | "faith" | "conduct"
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const { formData, setStepData, clearDraft } = useSignupPersist();
  const { login } = useAuth();
  const navigate = useNavigate();
  const stepFormRef = useRef(null);

  const TOTAL_STEPS = 5;

  /* Trigger form submission by clicking hidden submit inside step form */
  const triggerNext = () => {
    const form = document.getElementById("step-form");
    if (form) form.requestSubmit();
  };

  /* Called by each step's onNext callback after validation passes */
  const handleStepData = (stepKey, data) => {
    setStepData(stepKey, data);
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  /* Profile picture handler from step 4 */
  const handleProfilePicChange = (file) => {
    setProfilePicFile(file);
    setProfilePicPreview(URL.createObjectURL(file));
  };

  /* Final submit */
  const handleSubmit = async () => {
    setApiError("");
    setLoading(true);
    try {
      const { step1, step2, step3, step4 } = formData;

      // Build FormData to support file upload
      const fd = new FormData();

      // Flat fields for the /api/accounts/register/ endpoint
      fd.append("username", step1.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_"));
      fd.append("email", step1.email);
      fd.append("password", step1.password);
      fd.append("full_name", step1.full_name);
      fd.append("country", step1.country);
      if (step1.city) fd.append("city", step1.city);
      if (step1.phone) fd.append("phone", step1.phone);
      if (step1.gender) fd.append("gender", step1.gender);

      // Extended data as JSON blobs
      fd.append("spiritual_info", JSON.stringify({
        born_again: step2.born_again,
        year_of_salvation: step2.year_of_salvation,
        church_name: step2.church_name,
        denomination: step2.denomination,
        serves_in_church: step2.serves_in_church,
        ministry_areas: step2.ministry_areas,
        testimony: step2.testimony,
      }));
      fd.append("alignment", JSON.stringify({
        why_join: step3.why_join,
        unity_agreement: step3.unity_agreement,
        statement_of_faith: step3.statement_of_faith,
        code_of_conduct: step3.code_of_conduct,
        subscribe_scripture: step3.subscribe_scripture,
      }));
      fd.append("leadership_interest", JSON.stringify({
        membership_type: step4.membership_type,
        led_ministry_before: step4.led_ministry_before,
        leadership_experience: step4.leadership_experience,
      }));

      if (profilePicFile) fd.append("profile_picture", profilePicFile);

      await api.post("/accounts/register/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearDraft();
      setSuccess(true);
    } catch (err) {
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") {
          setApiError(data);
        } else if (data.email) {
          setApiError("This email is already registered. Please sign in or use a different email.");
        } else if (data.password) {
          setApiError(Array.isArray(data.password) ? data.password.join(" ") : data.password);
          setStep(1);
        } else {
          const msgs = Object.values(data).flat().join(" ");
          setApiError(msgs || "Registration failed. Please try again.");
        }
      } else {
        setApiError("Network error. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (success) {
      navigate("/login");
    }
    onClose();
    // Reset state after close animation
    setTimeout(() => {
      if (!success) return; // keep draft if not submitted
      setStep(1);
      setSuccess(false);
      setApiError("");
    }, 300);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const goToEdit = (targetStep) => {
    setStep(targetStep);
  };

  return (
    <>
      <BaseModal open={open} onClose={handleClose} maxWidth="max-w-2xl">
        {success ? (
          <SuccessOverlay name={formData.step1.full_name?.split(" ")[0] || "Revivalist"} onClose={handleClose} />
        ) : (
          <div className="flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-base font-black text-black shadow-lg shadow-amber-500/20">
                  S
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Join Spirit Revival Africa</h2>
                  <p className="text-[11px] text-zinc-500">The revival movement across a continent</p>
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

            {/* Progress */}
            <StepProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />

            {/* Divider */}
            <div className="h-px bg-zinc-800/60" />

            {/* Step content */}
            <div className="px-6 py-6 overflow-y-auto max-h-[55vh]" ref={stepFormRef}>
              {step === 1 && (
                <Step1BasicIdentity
                  defaultValues={formData.step1}
                  onNext={(data) => handleStepData("step1", data)}
                />
              )}
              {step === 2 && (
                <Step2SpiritualBackground
                  defaultValues={formData.step2}
                  onNext={(data) => handleStepData("step2", data)}
                />
              )}
              {step === 3 && (
                <Step3RevivalAlignment
                  defaultValues={formData.step3}
                  onNext={(data) => handleStepData("step3", data)}
                  onOpenInfo={(type) => setInfoModal(type)}
                />
              )}
              {step === 4 && (
                <Step4LeadershipInterest
                  defaultValues={formData.step4}
                  onNext={(data) => handleStepData("step4", data)}
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

            {/* Footer nav */}
            {step < 5 && (
              <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-6 py-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 1}
                  className="btn-outline py-2.5 px-5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>

                <div className="flex items-center gap-2">
                  {/* Dot indicators */}
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i + 1 === step ? "w-4 bg-amber-500" : i + 1 < step ? "w-1.5 bg-amber-500/40" : "w-1.5 bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={triggerNext}
                  className="btn-gold py-2.5 px-6 text-sm font-bold"
                >
                  {step === 4 ? "Review →" : "Next →"}
                </button>
              </div>
            )}
          </div>
        )}
      </BaseModal>

      {/* Info modals */}
      <InfoModal type={infoModal} open={!!infoModal} onClose={() => setInfoModal(null)} />
    </>
  );
}
