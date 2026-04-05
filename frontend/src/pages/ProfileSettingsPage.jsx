import { useEffect, useRef, useState } from "react";

import DashLayout from "../components/dashboard/DashLayout";
import CityCombobox from "../components/signup/CityCombobox";
import api, { resolveMediaUrl } from "../api/client";
import { COUNTRIES, MINISTRY_AREA_LABELS } from "../schemas/signupSchemas";

/* ── Profile completion score ───────────────────────────────────────────── */
function calcCompletion(p) {
  if (!p) return 0;
  const checks = [
    p.country,
    p.phone,
    p.gender,
    p.born_again,
    p.church_name,
    Array.isArray(p.ministry_areas) && p.ministry_areas.length > 0,
    p.testimony,
    p.why_join,
    p.unity_agreement,
    p.statement_of_faith,
    p.code_of_conduct,
    p.membership_type && p.membership_type !== "member",
    p.profile_picture,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/* ── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ msg, err, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  return (
    <div
      className={`fixed top-5 right-5 z-[99] rounded-xl px-5 py-3 text-sm font-medium shadow-2xl transition-all ${
        err
          ? "bg-red-900 text-red-200 border border-red-700"
          : "bg-emerald-900 text-emerald-200 border border-emerald-700"
      }`}
    >
      {msg}
    </div>
  );
}

/* ── Shared primitives ──────────────────────────────────────────────────── */
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
      <div className="border-b border-zinc-800 pb-4">
        <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </label>
  );
}

function SaveBtn({ saving }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="submit"
        disabled={saving}
        className="btn-gold py-2 px-7 text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function apiErrMsg(err) {
  const d = err?.response?.data;
  if (!d) return "Failed to save. Check your connection.";
  if (typeof d === "string") return d;
  return Object.values(d).flat().join(" ") || "Failed to save.";
}

/* ── Section 1: Personal Info ───────────────────────────────────────────── */
function PersonalSection({ profile, onSaved, showToast }) {
  const [saving, setSaving] = useState(false);
  const [picFile, setPicFile] = useState(null);
  const [picPreview, setPicPreview] = useState(
    resolveMediaUrl(profile?.profile_picture) || null
  );
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    bio: profile?.bio || "",
    country: profile?.country || "",
    city: profile?.city || "",
    phone: profile?.phone || "",
    gender: profile?.gender || "",
  });
  const fileRef = useRef(null);
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const handlePic = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2 MB.", true);
      return;
    }
    setPicFile(file);
    setPicPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      showToast("Full name is required.", true);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (picFile) fd.append("profile_picture", picFile);
      const res = await api.patch("/accounts/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(res.data);
      setPicFile(null);
      showToast("Personal info saved.");
    } catch (err) {
      showToast(apiErrMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Personal Information"
      subtitle="Your photo, location, and contact details"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative">
            {picPreview ? (
              <img
                src={picPreview}
                alt="Profile photo"
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-amber-500/30"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 text-3xl font-bold ring-2 ring-amber-500/30">
                {(profile?.email ?? "?")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePic}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
            >
              Change Photo
            </button>
            <p className="mt-1.5 text-xs text-zinc-600">JPG, PNG or WebP · max 2 MB</p>
            {picFile && (
              <p className="mt-1 text-xs text-amber-400 truncate max-w-[180px]">
                {picFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Full name + Phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Full Name *</Label>
            <input
              value={form.full_name}
              onChange={(e) => set("full_name")(e.target.value)}
              className="input-dark"
              placeholder="John Okeke"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <input
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              type="tel"
              className="input-dark"
              placeholder="+234 800 000 0000"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <Label>Bio</Label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => set("bio")(e.target.value)}
            className="input-dark resize-none"
            placeholder="Tell us a bit about yourself…"
          />
        </div>

        {/* Country + City */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Country</Label>
            <select
              className="input-dark"
              value={form.country}
              onChange={(e) => {
                set("country")(e.target.value);
                set("city")("");
              }}
            >
              <option value="">Select country…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>City / Town / Market</Label>
            <CityCombobox
              country={form.country}
              value={form.city}
              onChange={set("city")}
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <Label>Gender</Label>
          <select
            className="input-dark"
            value={form.gender}
            onChange={(e) => set("gender")(e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        <SaveBtn saving={saving} />
      </form>
    </SectionCard>
  );
}

/* ── Section 2: Spiritual Background ────────────────────────────────────── */
const YEARS = Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) =>
  String(new Date().getFullYear() - i)
);
const MINISTRY_KEYS = Object.keys(MINISTRY_AREA_LABELS);

function SpiritualSection({ profile, onSaved, showToast }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    born_again: profile?.born_again || "",
    year_of_salvation: profile?.year_of_salvation
      ? String(profile.year_of_salvation)
      : "",
    church_name: profile?.church_name || "",
    denomination: profile?.denomination || "",
    serves_in_church: profile?.serves_in_church || "",
    ministry_areas: profile?.ministry_areas || [],
    testimony: profile?.testimony || "",
  });

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleMinistry = (key) =>
    setForm((p) => ({
      ...p,
      ministry_areas: p.ministry_areas.includes(key)
        ? p.ministry_areas.filter((k) => k !== key)
        : [...p.ministry_areas, key],
    }));

  const RadioGroup = ({ name, value, onChange, options }) => (
    <div className="flex gap-3">
      {options.map(({ val, label }) => (
        <label key={val} className="flex-1 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={val}
            checked={value === val}
            onChange={() => onChange(val)}
            className="sr-only"
          />
          <div
            className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold transition ${
              value === val
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {label}
          </div>
        </label>
      ))}
    </div>
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("born_again", form.born_again);
      fd.append("year_of_salvation", form.year_of_salvation);
      fd.append("church_name", form.church_name);
      fd.append("denomination", form.denomination);
      fd.append("serves_in_church", form.serves_in_church);
      fd.append("ministry_areas", JSON.stringify(form.ministry_areas));
      fd.append("testimony", form.testimony);
      const res = await api.patch("/accounts/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(res.data);
      showToast("Spiritual background saved.");
    } catch (err) {
      showToast(apiErrMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Spiritual Background"
      subtitle="Your faith journey and church involvement"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Born Again */}
        <div>
          <Label>Are you born again?</Label>
          <RadioGroup
            name="born_again"
            value={form.born_again}
            onChange={set("born_again")}
            options={[
              { val: "yes", label: "Yes, praise God! 🙌" },
              { val: "no", label: "Not yet" },
            ]}
          />
        </div>

        {/* Year + Church */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Year of Salvation</Label>
            <select
              value={form.year_of_salvation}
              onChange={(e) => set("year_of_salvation")(e.target.value)}
              className="input-dark"
            >
              <option value="">Select year…</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Church Name</Label>
            <input
              value={form.church_name}
              onChange={(e) => set("church_name")(e.target.value)}
              className="input-dark"
              placeholder="e.g. Redeemed Christian Church"
            />
          </div>
        </div>

        {/* Denomination + Serves */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Denomination</Label>
            <input
              value={form.denomination}
              onChange={(e) => set("denomination")(e.target.value)}
              className="input-dark"
              placeholder="e.g. Pentecostal, Baptist…"
            />
          </div>
          <div>
            <Label>Do you serve in your church?</Label>
            <RadioGroup
              name="serves_in_church"
              value={form.serves_in_church}
              onChange={set("serves_in_church")}
              options={[
                { val: "yes", label: "Yes" },
                { val: "no", label: "No" },
              ]}
            />
          </div>
        </div>

        {/* Ministry Areas */}
        <div>
          <Label>Ministry Areas (select all that apply)</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {MINISTRY_KEYS.map((key) => {
              const active = form.ministry_areas.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMinistry(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-amber-500 bg-amber-500/15 text-amber-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {MINISTRY_AREA_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Testimony */}
        <div>
          <Label>Testimony / How You Met God</Label>
          <textarea
            rows={4}
            value={form.testimony}
            onChange={(e) => set("testimony")(e.target.value)}
            className="input-dark resize-none"
            placeholder="Share your testimony…"
            maxLength={500}
          />
          <p className="text-right text-xs text-zinc-600 mt-1">
            {form.testimony.length}/500
          </p>
        </div>

        <SaveBtn saving={saving} />
      </form>
    </SectionCard>
  );
}

/* ── Section 3: Revival Alignment ───────────────────────────────────────── */
function RevivalSection({ profile, onSaved, showToast }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    why_join: profile?.why_join || "",
    unity_agreement: !!profile?.unity_agreement,
    statement_of_faith: !!profile?.statement_of_faith,
    code_of_conduct: !!profile?.code_of_conduct,
    subscribe_scripture: profile?.subscribe_scripture ?? true,
  });
  const toggle = (k) => () => setForm((p) => ({ ...p, [k]: !p[k] }));
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.why_join || form.why_join.trim().length < 20) {
      showToast("Please write at least 20 characters about why you want to join.", true);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("why_join", form.why_join);
      fd.append("unity_agreement", String(form.unity_agreement));
      fd.append("statement_of_faith", String(form.statement_of_faith));
      fd.append("code_of_conduct", String(form.code_of_conduct));
      fd.append("subscribe_scripture", String(form.subscribe_scripture));
      const res = await api.patch("/accounts/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(res.data);
      showToast("Revival commitment saved.");
    } catch (err) {
      showToast(apiErrMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  const CheckItem = ({ field, label, description }) => (
    <button
      type="button"
      onClick={toggle(field)}
      className="flex items-start gap-3 text-left w-full group"
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          form[field]
            ? "bg-amber-500 border-amber-500"
            : "border-zinc-600 group-hover:border-zinc-400"
        }`}
      >
        {form[field] && (
          <span className="text-black text-xs font-black leading-none">✓</span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-200">{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </button>
  );

  return (
    <SectionCard
      title="Revival Alignment"
      subtitle="Your commitment to the Spirit Revival Africa mission"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <Label>Why do you want to join SRA?</Label>
          <textarea
            rows={5}
            value={form.why_join}
            onChange={(e) => set("why_join")(e.target.value)}
            className="input-dark resize-none"
            placeholder="Share your heart — what draws you to this revival movement? (min. 20 characters)"
            maxLength={600}
          />
          <p className="text-right text-xs text-zinc-600 mt-1">
            {form.why_join.length}/600
          </p>
        </div>

        <div className="space-y-4">
          <Label>Agreements & Commitments</Label>
          <CheckItem
            field="unity_agreement"
            label="Unity Agreement"
            description="I commit to pursuing unity in the Body of Christ above denominational differences."
          />
          <CheckItem
            field="statement_of_faith"
            label="Statement of Faith"
            description="I affirm core Christian doctrine: the Trinity, salvation by grace through faith, and the authority of Scripture."
          />
          <CheckItem
            field="code_of_conduct"
            label="Code of Conduct"
            description="I will engage with the SRA community with love, respect, and Christ-like character."
          />
          <CheckItem
            field="subscribe_scripture"
            label="Daily Scripture Subscription"
            description="I would like to receive daily scripture and revival devotionals."
          />
        </div>

        <SaveBtn saving={saving} />
      </form>
    </SectionCard>
  );
}

/* ── Section 4: Membership & Leadership ─────────────────────────────────── */
const MEMBERSHIP_OPTS = [
  {
    value: "member",
    label: "Community Member",
    desc: "Join the global SRA community and participate in all activities.",
    icon: "🌍",
  },
  {
    value: "digital_group",
    label: "Digital Group Leader",
    desc: "Lead an online revival small group under the SRA network.",
    icon: "💻",
  },
  {
    value: "revival_hub",
    label: "Revival Hub Leader",
    desc: "Establish a physical revival hub in your city or region.",
    icon: "🏛",
  },
];

function MembershipSection({ profile, onSaved, showToast }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    membership_type: profile?.membership_type || "member",
    led_ministry_before: profile?.led_ministry_before || "",
    leadership_experience: profile?.leadership_experience || "",
  });
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("membership_type", form.membership_type);
      fd.append("led_ministry_before", form.led_ministry_before);
      fd.append("leadership_experience", form.leadership_experience);
      const res = await api.patch("/accounts/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(res.data);
      showToast("Membership details saved.");
    } catch (err) {
      showToast(apiErrMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Membership & Leadership"
      subtitle="Your role and calling within the SRA movement"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Membership type */}
        <div>
          <Label>Membership Type</Label>
          <div className="space-y-2 mt-1">
            {MEMBERSHIP_OPTS.map(({ value, label, desc, icon }) => (
              <label key={value} className="block cursor-pointer">
                <input
                  type="radio"
                  name="membership_type"
                  value={value}
                  checked={form.membership_type === value}
                  onChange={() => set("membership_type")(value)}
                  className="sr-only"
                />
                <div
                  className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                    form.membership_type === value
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-2xl shrink-0">{icon}</span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        form.membership_type === value
                          ? "text-amber-300"
                          : "text-zinc-300"
                      }`}
                    >
                      {label}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Led ministry before */}
        <div>
          <Label>Have you led a ministry before?</Label>
          <div className="flex gap-3">
            {["yes", "no"].map((v) => (
              <label key={v} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="led_ministry_before"
                  value={v}
                  checked={form.led_ministry_before === v}
                  onChange={() => set("led_ministry_before")(v)}
                  className="sr-only"
                />
                <div
                  className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold transition ${
                    form.led_ministry_before === v
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {v === "yes" ? "Yes" : "No"}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Leadership experience */}
        <div>
          <Label>Ministry / Leadership Experience</Label>
          <textarea
            rows={4}
            value={form.leadership_experience}
            onChange={(e) => set("leadership_experience")(e.target.value)}
            className="input-dark resize-none"
            placeholder="Briefly describe any previous leadership or ministry roles…"
            maxLength={400}
          />
          <p className="text-right text-xs text-zinc-600 mt-1">
            {form.leadership_experience.length}/400
          </p>
        </div>

        <SaveBtn saving={saving} />
      </form>
    </SectionCard>
  );
}

/* ── Tab config ─────────────────────────────────────────────────────────── */
const TABS = [
  { id: "personal", label: "Personal", icon: "👤" },
  { id: "spiritual", label: "Spiritual", icon: "✝" },
  { id: "revival", label: "Revival Commitment", icon: "🔥" },
  { id: "membership", label: "Membership", icon: "🏛" },
];

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, err = false) => setToast({ msg, err });
  const clearToast = () => setToast(null);

  useEffect(() => {
    api
      .get("/accounts/profile/")
      .then((r) => setProfile(r.data))
      .catch(() => {
        setLoadError(true);
        showToast("Failed to load profile.", true);
      });
  }, []);

  const onSaved = (updated) => setProfile(updated);
  const completion = calcCompletion(profile);

  const renderTab = () => {
    const props = { profile, onSaved, showToast };
    switch (activeTab) {
      case "personal":
        return <PersonalSection {...props} />;
      case "spiritual":
        return <SpiritualSection {...props} />;
      case "revival":
        return <RevivalSection {...props} />;
      case "membership":
        return <MembershipSection {...props} />;
      default:
        return null;
    }
  };

  return (
    <DashLayout title="Profile Settings">
      {toast && <Toast msg={toast.msg} err={toast.err} onDone={clearToast} />}

      {loadError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
          <p className="text-zinc-400">Failed to load profile. Check your connection.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : !profile ? (
        <div className="flex items-center justify-center h-48 text-zinc-600">
          Loading…
        </div>
      ) : (
        <div className="max-w-4xl space-y-6">
          {/* Completion banner */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  Profile Completion
                </p>
                {completion < 100 && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Fill in the sections below so the SRA community can connect with
                    you better.
                  </p>
                )}
              </div>
              <span
                className={`text-lg font-black tabular-nums ${
                  completion >= 80
                    ? "text-emerald-400"
                    : completion >= 50
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {completion}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                style={{ width: `${completion}%` }}
                className={`h-full rounded-full transition-all duration-700 ${
                  completion >= 80
                    ? "bg-emerald-500"
                    : completion >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
              />
            </div>
            {completion === 100 && (
              <p className="mt-2 text-xs text-emerald-400 font-medium">
                Your profile is complete. Glory to God! 🙌
              </p>
            )}
          </div>

          {/* Tab layout */}
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            {/* Sidebar tabs */}
            <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:w-52 lg:shrink-0 lg:pb-0 lg:overflow-visible">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition text-left whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70"
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Active section */}
            <div className="flex-1 min-w-0">{renderTab()}</div>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
