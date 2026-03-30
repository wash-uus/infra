import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useSignupPersist } from "../../hooks/useSignupPersist";

import BaseModal from "./BaseModal";
import StepProgressBar from "./StepProgressBar";
import Step1BasicIdentity from "./Step1BasicIdentity";

/* -- Success overlay -- */
function SuccessOverlay({ name, onClose }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-16 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 animate-ping opacity-40" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/30 text-4xl">
          *
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-white">Welcome, {name}!</h2>
        <p className="mt-2 text-zinc-400 max-w-sm mx-auto text-sm leading-relaxed">
          You have joined the Spirit Revival Africa movement. Check your email to verify your
          account, then complete your profile from settings.
        </p>
        <div className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-zinc-400 max-w-xs">
          After signing in, go to <span className="text-amber-400 font-semibold">Profile Settings</span> to add your country, phone, ministry areas, testimony and more.
        </div>
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
        Go to Sign In
      </button>
    </div>
  );
}

/* -- Main SignupModal -- */
export default function SignupModal({ open, onClose }) {
  const [step] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const { formData, setStepData, clearDraft } = useSignupPersist();
  const navigate = useNavigate();
  const stepFormRef = useRef(null);

  const TOTAL_STEPS = 1;

  const triggerSubmit = () => {
    const form = document.getElementById("step-form");
    if (form) form.requestSubmit();
  };

  const handleStepData = (stepKey, data) => {
    setStepData(stepKey, data);
    handleSubmit(data);
  };

  const handleSubmit = async (step1Data) => {
    setApiError("");
    setLoading(true);
    try {
      const step1 = step1Data || formData.step1 || {};

      const fd = new FormData();
      fd.append("username", step1.username);
      fd.append("email", step1.email);
      fd.append("password", step1.password);
      fd.append("full_name", step1.full_name);

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
        } else if (data.username) {
          setApiError(Array.isArray(data.username) ? data.username.join(" ") : data.username);
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
  };

  return (
    <BaseModal open={open} onClose={handleClose} maxWidth="max-w-2xl">
      {success ? (
        <SuccessOverlay name={formData.step1.full_name?.split(" ")[0] || "Revivalist"} onClose={handleClose} />
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-base font-black text-black shadow-lg shadow-amber-500/20">
                S
              </div>
              <div>
                <h2 className="text-base font-black text-white">Join Spirit Revival Africa</h2>
                <p className="text-[11px] text-zinc-500">Quick signup, complete profile later</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white transition"
              aria-label="Close"
            >
              X
            </button>
          </div>

          <StepProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
          <div className="h-px bg-zinc-800/60" />

          <div className="px-6 py-6 overflow-y-auto max-h-[55vh]" ref={stepFormRef}>
            <Step1BasicIdentity
              defaultValues={formData.step1}
              onNext={(data) => handleStepData("step1", data)}
            />
            {apiError && (
              <p className="mt-3 text-xs text-red-400 text-center">{apiError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-800/60 px-6 py-5">
            <button onClick={triggerSubmit} className="btn-gold" disabled={loading}>
              {loading ? "Submitting..." : "Create Account"}
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
