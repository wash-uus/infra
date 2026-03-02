import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md text-center space-y-4">
          <p className="text-red-400">Invalid or missing reset token.</p>
          <Link to="/login" className="btn-gold inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await api.post("/accounts/password-reset/confirm/", { token, password });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Password Updated</h1>
          <p className="text-zinc-400 text-sm">You can now sign in with your new password.</p>
          <Link to="/login" className="btn-gold inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-white">Set New Password</h1>
            <p className="text-sm text-zinc-500">Enter and confirm your new password below.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input-dark w-full disabled:opacity-50"
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className="input-dark w-full disabled:opacity-50"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 rounded-xl font-semibold disabled:opacity-60"
            >
              {loading ? "Saving…" : "Update Password"}
            </button>
          </form>

          <p className="text-center text-sm">
            <Link to="/login" className="text-zinc-500 hover:text-zinc-300">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
