/**
 * WhatsAppOptIn — "Join Revival on WhatsApp" button
 *
 * Renders a WhatsApp opt-in CTA that opens a pre-filled WhatsApp chat.
 * When the user clicks it they land in WhatsApp with "JOIN" pre-typed,
 * which triggers the automated welcome sequence on the backend.
 *
 * Usage:
 *   <WhatsAppOptIn />                         // default size
 *   <WhatsAppOptIn size="large" />            // hero CTA
 *   <WhatsAppOptIn label="Join the Revival" className="mt-4" />
 */

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "254712345678"; // E.164 without '+'

function WhatsAppOptIn({
  label = "Join Revival on WhatsApp",
  size = "default",
  className = "",
}) {
  const waUrl = `https://wa.me/${WA_NUMBER}?text=JOIN`;

  const sizeClasses =
    size === "large"
      ? "px-8 py-4 text-lg gap-3"
      : "px-5 py-2.5 text-sm gap-2";

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join our WhatsApp revival group"
      className={[
        "inline-flex items-center justify-center font-semibold rounded-full",
        "bg-[#25D366] hover:bg-[#1da851] active:bg-[#179a47]",
        "text-white transition-colors duration-200 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2",
        sizeClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* WhatsApp SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={size === "large" ? "w-7 h-7" : "w-5 h-5"}
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.553 4.118 1.522 5.854L.057 23.428A.5.5 0 0 0 .5 24a.49.49 0 0 0 .129-.017l5.739-1.498A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.028-1.384l-.36-.214-3.735.975.999-3.647-.235-.374A9.821 9.821 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
      </svg>
      {label}
    </a>
  );
}

export default WhatsAppOptIn;
