/**
 * GoogleAuthButton — uses @react-oauth/google's useGoogleLogin hook.
 * On success it POSTs the credential to /accounts/auth/google/ and calls
 * the shared `login(access, refresh)` from AuthContext.
 */
import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function GoogleAuthButton({ redirectTo = "/dashboard", label = "Continue with Google" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSuccess = async (tokenResponse) => {
    // tokenResponse.access_token is the OAuth2 access token (not an ID token).
    // We use it to fetch the user's info from Google and then verify server-side.
    setLoading(true);
    setError("");
    try {
      // Exchange OAuth2 access token for user info
      const infoRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
      );
      if (!infoRes.ok) throw new Error("Failed to fetch Google user info.");
      const userInfo = await infoRes.json();

      // Send to our backend for verification + JWT issuance
      const res = await api.post("/accounts/auth/google/", {
        credential: tokenResponse.access_token,
        email: userInfo.email,
        name: userInfo.name,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        email_verified: userInfo.email_verified,
        sub: userInfo.sub,
      });
      login(res.data.access, res.data.refresh);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Google sign-in failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleSuccess,
    onError: () => setError("Google sign-in was cancelled or failed."),
  });

  if (!CLIENT_ID) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => { setError(""); googleLogin(); }}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/80 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <svg className="h-4 w-4 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        {loading ? "Signing in…" : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
