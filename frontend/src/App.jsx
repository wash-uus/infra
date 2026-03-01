import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { router } from "./router";

export default function App() {
  return (
    <AuthProvider>
      <div className="dark min-h-screen bg-black text-zinc-100">
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  );
}
