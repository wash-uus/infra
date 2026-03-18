import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthProvider } from "./context/AuthContext";
import { router } from "./router";
import ErrorBoundary from "./components/ErrorBoundary";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <div className="dark min-h-screen bg-black text-zinc-100">
            <RouterProvider router={router} />
          </div>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
