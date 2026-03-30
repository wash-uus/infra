import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthProvider } from "./context/AuthContext";
import { router } from "./router";
import ErrorBoundary from "./components/ErrorBoundary";
import { captureReferralParam } from "./utils/referral";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Only mount GoogleOAuthProvider when a client ID is configured.
// This avoids the "Missing required parameter client_id" crash in local dev.
function MaybeGoogleProvider({ children }) {
  if (!GOOGLE_CLIENT_ID) return children;
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}

export default function App() {
  // Capture ?ref= on every page load so the referral is stored before React Router strips the param
  useEffect(() => { captureReferralParam(); }, []);

  return (
    <ErrorBoundary>
      <MaybeGoogleProvider>
        <AuthProvider>
          <div className="dark min-h-screen bg-black text-zinc-100">
            <RouterProvider router={router} />
          </div>
        </AuthProvider>
      </MaybeGoogleProvider>
    </ErrorBoundary>
  );
}
