import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import GoogleAuthButton from "../components/auth/GoogleAuthButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Forgot password flow
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailExists = location.state?.emailExists || false;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/accounts/login/", { email, password });
      login(response.data.access, response.data.refresh);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail
        || err?.response?.data?.non_field_errors?.[0];
      setError(detail || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post("/accounts/password-reset/", { email: forgotEmail });
    } catch { /* noop — don't reveal whether email exists */ }
    finally {
      setForgotLoading(false);
      setForgotSent(true);
    }
  };

  return (
    <div className="page-bg flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">

        {/* Back to Home */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Email-already-exists notice */}
        {emailExists && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 text-center">
            That email is already registered — sign in below.
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl font-black text-black shadow-xl shadow-amber-500/30">
            S
          </div>
          <h1 className="text-2xl font-black text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to continue your revival journey</p>
        </div>

        {/* Card */}
        <div className="card glow-gold space-y-5">
          {!showForgot ? (
            <>
              {/* ── Sign-in form ── */}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    className="input-dark disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setForgotEmail(email); setError(""); }}
                      className="text-xs text-amber-400 transition hover:text-amber-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="input-dark disabled:opacity-50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      tabIndex={-1}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.956 9.956 0 016.362 2.3M15 12a3 3 0 11-4.5-2.6M3 3l18 18" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>

              <div className="border-t border-zinc-800 pt-4 text-center text-sm text-zinc-500">
                Don't have an account?{" "}
                <Link to="/register" className="font-semibold text-amber-400 hover:text-amber-300">
                  Create one free
                </Link>
              </div>

              {/* Google */}
              <div className="space-y-3">
                <div className="relative flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-600">or continue with</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <GoogleAuthButton redirectTo={location.state?.from?.pathname || "/dashboard"} />
              </div>
            </>
          ) : (
            <>
              {/* ── Forgot password form ── */}
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); }}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Sign In
              </button>

              <div>
                <h2 className="text-lg font-bold text-white">Reset your password</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Enter your email and we'll send a reset link if an account exists.
                </p>
              </div>

              {forgotSent ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-400">
                  ✓ If that email is registered, a reset link has been sent. Check your inbox.
                </div>
              ) : (
                <form onSubmit={submitForgot} className="space-y-3">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={forgotLoading}
                    className="input-dark disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60"
                  >
                    {forgotLoading ? "Sending…" : "Send Reset Link"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
