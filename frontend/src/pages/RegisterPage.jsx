import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Step1BasicIdentity from "../components/signup/Step1BasicIdentity";
import { useSignupPersist } from "../hooks/useSignupPersist";
import api from "../api/client";

function SuccessView({ name }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-14 px-6 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 animate-ping opacity-40" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/30 text-4xl">
          🙌
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-black text-white">Welcome, {name}!</h2>
        <p className="mt-2 text-zinc-400 max-w-sm mx-auto text-sm leading-relaxed">
          You have joined the Spirit Revival Africa movement. Check your email to
          verify your account, then complete your profile.
        </p>
      </div>
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 max-w-sm w-full">
        <p className="text-sm font-semibold text-amber-300">Acts 1:8</p>
        <p className="mt-1 text-xs text-zinc-500 italic">
          "But you will receive power when the Holy Spirit comes on you; and you
          will be my witnesses in Jerusalem, and in all Judea and Samaria, and to
          the ends of the earth."
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        <Link
          to="/login"
          className="flex-1 rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition text-center"
        >
          Sign In
        </Link>
        <Link
          to="/login"
          state={{ from: { pathname: "/profile/settings" } }}
          className="btn-gold flex-1 py-3 text-sm font-bold text-center"
        >
          Complete My Profile
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const { formData, setStepData, clearDraft } = useSignupPersist();
  const navigate = useNavigate();

  const handleSubmit = async (step1Data) => {
    setStepData("step1", step1Data);
    setApiError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("username", step1Data.username);
      fd.append("email", step1Data.email);
      fd.append("password", step1Data.password);
      fd.append("full_name", step1Data.full_name);

      await api.post("/accounts/register/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearDraft();
      setSuccess(true);
    } catch (err) {
      const data = err?.response?.data;
      if (!data) {
        setApiError("Network error. Please check your connection.");
      } else if (typeof data === "string") {
        setApiError(data);
      } else if (data.email) {
        setApiError("This email is already registered. Sign in or use a different email.");
      } else if (data.username) {
        setApiError(Array.isArray(data.username) ? data.username.join(" ") : data.username);
      } else if (data.password) {
        setApiError(Array.isArray(data.password) ? data.password.join(" ") : data.password);
      } else {
        setApiError(Object.values(data).flat().join(" ") || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40">
          {success ? (
            <SuccessView name={formData.step1?.full_name?.split(" ")[0] || "Revivalist"} />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-zinc-800 px-7 py-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-black text-black shadow-lg shadow-amber-500/20">
                  S
                </div>
                <div>
                  <h1 className="text-lg font-black text-white">Join Spirit Revival Africa</h1>
                  <p className="text-xs text-zinc-500">Quick signup — complete your profile later</p>
                </div>
              </div>

              {/* Form */}
              <div className="px-7 py-7">
                <Step1BasicIdentity
                  defaultValues={formData.step1}
                  onNext={handleSubmit}
                />

                {apiError && (
                  <p className="mt-4 rounded-lg bg-red-900/40 border border-red-700/40 px-4 py-2.5 text-xs text-red-300 text-center">
                    {apiError}
                  </p>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between border-t border-zinc-800 px-7 py-5 gap-4">
                <p className="text-xs text-zinc-600">
                  Already have an account?{" "}
                  <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">
                    Sign in
                  </Link>
                </p>
                <button
                  form="step-form"
                  type="submit"
                  disabled={loading}
                  className="btn-gold py-2.5 px-7 text-sm disabled:opacity-60"
                >
                  {loading ? "Creating…" : "Create Account"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
