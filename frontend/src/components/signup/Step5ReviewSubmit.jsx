import { MINISTRY_AREA_LABELS } from "../../schemas/signupSchemas";

const MEMBERSHIP_LABELS = {
  member: "Member",
  digital_group: "Digital Group Servant",
  revival_hub: "Revival Hub Starter",
};

function Section({ title, icon, children, onEdit, step }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="text-sm font-bold text-zinc-200">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:bg-zinc-800 transition"
        >
          Edit
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-5">{children}</dl>
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <>
      <dt className="text-xs text-zinc-600 font-medium truncate">{label}</dt>
      <dd className="text-xs text-zinc-300 font-semibold">{value}</dd>
    </>
  );
}

export default function Step5ReviewSubmit({
  formData,
  profilePicPreview,
  onEdit,
  onSubmit,
  loading,
  apiError,
  submitLabel,
  loadingLabel,
}) {
  const { step1, step2, step3, step4 } = formData;

  return (
    <div className="space-y-4">
      {/* Section 1 */}
      <Section title="Basic Identity" icon="👤" onEdit={onEdit} step={1}>
        <Row label="Full Name" value={step1.full_name} />
        <Row label="Email" value={step1.email} />
        <Row label="Country" value={step1.country} />
        <Row label="City" value={step1.city} />
        <Row label="Phone" value={step1.phone} />
        <Row label="Gender" value={step1.gender ? step1.gender.replace(/_/g, " ") : undefined} />
      </Section>

      {/* Section 2 */}
      <Section title="Spiritual Background" icon="✝️" onEdit={onEdit} step={2}>
        <Row label="Born Again" value={step2.born_again || undefined} />
        <Row label="Year of Salvation" value={step2.year_of_salvation} />
        <Row label="Church" value={step2.church_name} />
        <Row label="Denomination" value={step2.denomination} />
        <Row label="Serves in Church" value={step2.serves_in_church || undefined} />
        <Row
          label="Ministry Areas"
          value={
            step2.ministry_areas?.length
              ? step2.ministry_areas.map((k) => MINISTRY_AREA_LABELS[k]).join(", ")
              : undefined
          }
        />
        {step2.testimony && (
          <>
            <dt className="col-span-2 text-xs text-zinc-600 font-medium">Testimony</dt>
            <dd className="col-span-2 text-xs text-zinc-300 leading-relaxed line-clamp-3">{step2.testimony}</dd>
          </>
        )}
      </Section>

      {/* Section 3 */}
      <Section title="Revival Alignment" icon="🔥" onEdit={onEdit} step={3}>
        {step3.why_join && (
          <>
            <dt className="col-span-2 text-xs text-zinc-600 font-medium">Why Join</dt>
            <dd className="col-span-2 text-xs text-zinc-300 leading-relaxed line-clamp-3">{step3.why_join}</dd>
          </>
        )}
        <Row
          label="Unity Agreement"
          value={step3.unity_agreement ? "✓ Agreed" : "✗ Not agreed"}
        />
        <Row
          label="Statement of Faith"
          value={step3.statement_of_faith ? "✓ Agreed" : "✗ Not agreed"}
        />
        <Row
          label="Code of Conduct"
          value={step3.code_of_conduct ? "✓ Agreed" : "✗ Not agreed"}
        />
        <Row
          label="Daily Scripture"
          value={step3.subscribe_scripture ? "Subscribed" : "Not subscribed"}
        />
      </Section>

      {/* Section 4 */}
      <Section title="Leadership & Profile" icon="🌟" onEdit={onEdit} step={4}>
        <Row
          label="Membership Type"
          value={MEMBERSHIP_LABELS[step4.membership_type] || step4.membership_type}
        />
        <Row label="Led Ministry Before" value={step4.led_ministry_before || undefined} />
        {step4.leadership_experience && (
          <>
            <dt className="col-span-2 text-xs text-zinc-600 font-medium">Experience</dt>
            <dd className="col-span-2 text-xs text-zinc-300 leading-relaxed line-clamp-2">{step4.leadership_experience}</dd>
          </>
        )}
        {profilePicPreview && (
          <>
            <dt className="col-span-2 text-xs text-zinc-600 font-medium">Profile Picture</dt>
            <dd className="col-span-2">
              <img src={profilePicPreview} alt="Profile" className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-500/30" />
            </dd>
          </>
        )}
      </Section>

      {/* API Error */}
      {apiError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      {/* Terms reminder */}
      <p className="text-center text-xs text-zinc-600">
        By submitting, you confirm all information is accurate and you agree to our{" "}
        <span className="text-amber-500">Terms & Conditions</span>.
      </p>

      {/* Submit button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="btn-gold w-full py-3.5 text-base font-bold disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {loadingLabel ?? "Creating your account…"}
          </span>
        ) : (
          submitLabel ?? "🚀 Join Spirit Revival Africa"
        )}
      </button>
    </div>
  );
}
