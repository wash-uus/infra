import { useEffect, useState } from "react";

import DashLayout from "../components/dashboard/DashLayout";
import EditProfileModal from "../components/profile/EditProfileModal";
import api from "../api/client";
import { MINISTRY_AREA_LABELS } from "../schemas/signupSchemas";

function Toast({ msg, err }) {
  return (
    <div className={`fixed top-5 right-5 z-[99] rounded-xl px-5 py-3 text-sm font-medium shadow-2xl ${
      err ? "bg-red-900 text-red-200 border border-red-700" : "bg-emerald-900 text-emerald-200 border border-emerald-700"
    }`}>
      {msg}
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProfile = () => {
    setLoadError(false);
    api.get("/accounts/profile/")
      .then((r) => setData(r.data))
      .catch(() => { setLoadError(true); showToast("Failed to load profile", true); });
  };

  useEffect(() => { loadProfile(); }, []);

  return (
    <DashLayout title="My Profile">
      {toast && <Toast {...toast} />}

      {loadError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
          <p className="text-zinc-400">Failed to load profile. Check your connection and try again.</p>
          <button
            onClick={loadProfile}
            className="rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-48 text-zinc-600">Loading…</div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center gap-4">
              {data.profile_picture ? (
                <img
                  src={data.profile_picture}
                  alt="Profile"
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-amber-500/30"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 text-2xl font-bold ring-1 ring-amber-500/30">
                  {(data.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-zinc-100">{data.full_name || data.username}</p>
                <p className="text-sm text-zinc-500">{data.email}</p>
                <p className="mt-1 text-xs capitalize text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block">
                  {(data.role ?? "member").replace("_", " ")}
                </p>
              </div>
            </div>

            <button
              onClick={() => setEditOpen(true)}
              className="rounded-xl bg-amber-500/15 px-6 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              Edit Full Registration Details
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Identity</p>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Country</span><span className="text-zinc-300">{data.country || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">City</span><span className="text-zinc-300">{data.city || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Phone</span><span className="text-zinc-300">{data.phone || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Gender</span><span className="text-zinc-300 capitalize">{(data.gender || "—").replace("_", " ")}</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Email Verified</span><span className={data.email_verified ? "text-emerald-400" : "text-red-400"}>{data.email_verified ? "✓ Verified" : "✗ Not Verified"}</span></div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Spiritual Background</p>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Born Again</span><span className="text-zinc-300 capitalize">{data.born_again || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Year of Salvation</span><span className="text-zinc-300">{data.year_of_salvation || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Church</span><span className="text-zinc-300">{data.church_name || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Denomination</span><span className="text-zinc-300">{data.denomination || "—"}</span></div>
              <div className="text-sm">
                <p className="text-zinc-500 mb-1">Ministry Areas</p>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  {(data.ministry_areas?.length
                    ? data.ministry_areas.map((k) => MINISTRY_AREA_LABELS[k] || k).join(", ")
                    : "—")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && (
        <EditProfileModal
          open={editOpen}
          profile={data}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setData(updated);
            showToast("Profile updated successfully");
          }}
        />
      )}
    </DashLayout>
  );
}
