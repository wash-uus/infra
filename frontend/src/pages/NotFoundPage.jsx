import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="page-bg flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="mb-4 text-7xl font-black text-amber-500/30 select-none">404</p>
      <h1 className="text-2xl font-black text-white">Page Not Found</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        This page doesn't exist or may have been moved. Check the URL or head back to safety.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
        >
          ← Go Back
        </button>
        <Link to="/" className="btn-gold py-2.5 px-6 text-sm">
          Home
        </Link>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-4 text-xs text-zinc-600">
        {[
          { to: "/content", label: "Content" },
          { to: "/prayer", label: "Prayer" },
          { to: "/groups", label: "Groups" },
          { to: "/hubs", label: "Hubs" },
          { to: "/worship", label: "Worship" },
        ].map(({ to, label }) => (
          <Link key={to} to={to} className="underline-offset-2 hover:text-amber-400 hover:underline transition-colors">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
