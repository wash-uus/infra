import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }

    api
      .post("/accounts/verify-email/", { token })
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified! You can now sign in.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.response?.data?.detail ||
            "The verification link is invalid or has expired. Please register again."
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center space-y-5">
          {status === "verifying" && (
            <>
              <div className="mx-auto h-12 w-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
              <p className="text-zinc-300 text-sm">Verifying your email…</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Email Verified!</h1>
              <p className="text-zinc-400 text-sm">{message}</p>
              <Link to="/login" className="btn-gold inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">
                Sign In
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Verification Failed</h1>
              <p className="text-zinc-400 text-sm">{message}</p>
              <div className="flex flex-col gap-2 pt-1">
                <Link to="/register" className="btn-gold inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">
                  Register Again
                </Link>
                <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300">
                  ← Back to Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
