import { Link } from "react-router-dom";

export default function CTAButtons() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
      <Link to="/register" className="btn-gold px-8 py-3 text-sm sm:text-base">
        Join the Movement
      </Link>
      <Link
        to="/book/beneath-the-crown"
        className="rounded-xl border border-amber-500/40 bg-black/40 px-8 py-3 text-sm font-semibold text-amber-300 transition hover:shadow-[0_0_18px_rgba(212,175,55,0.2)] sm:text-base"
      >
        Read the Book
      </Link>
    </div>
  );
}
