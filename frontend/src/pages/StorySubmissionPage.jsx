import StorySubmissionForm from "../components/stories/StorySubmissionForm";
import { usePageMeta } from "../hooks/usePageMeta";

export default function StorySubmissionPage() {
  usePageMeta({
    title: "Share Your Story",
    description: "Submit a testimony to Spirit Revival Africa. Every story is reviewed before it becomes public and shareable.",
  });

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Stories of Faith</p>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Submit a story. Let moderation protect trust.</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            The platform only publishes approved testimonies. Submit yours here, track its review status, and share it once it goes live.
          </p>
        </div>
        <StorySubmissionForm />
      </div>
    </div>
  );
}