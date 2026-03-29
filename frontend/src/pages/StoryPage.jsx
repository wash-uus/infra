import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { getShortStoryById } from "../api/homeContent";
import ShareButton from "../components/ShareButton";

export default function StoryPage() {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);

    getShortStoryById(id)
      .then(({ data }) => {
        if (!mounted) return;
        setStory(data?.story ?? null);
      })
      .catch((error) => {
        if (!mounted) return;
        if (error?.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <section className="mx-auto min-h-[60vh] max-w-4xl px-6 py-20">
        <p className="text-center text-zinc-400">Loading story…</p>
      </section>
    );
  }

  if (notFound || !story) {
    return (
      <section className="mx-auto min-h-[60vh] max-w-4xl px-6 py-20 text-center">
        <p className="mb-4 text-xl font-bold text-white">Story not found</p>
        <p className="mb-8 text-zinc-400">This story may have been removed or is not published yet.</p>
        <Link to="/" className="btn-gold px-8 py-3 text-sm">Back to Home</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-6">
        <Link to="/" className="text-xs font-semibold uppercase tracking-widest text-amber-400 hover:text-amber-300">
          ← Back to Home
        </Link>
      </div>

      <article className="rounded-3xl border border-amber-500/20 bg-zinc-950/80 p-7 shadow-xl sm:p-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Short Story</p>
        <h1 className="mb-4 text-3xl font-black text-white sm:text-4xl">{story.title}</h1>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            {story.author_name || "Spirit Revival Africa"}
          </p>
          <div className="flex items-center gap-3">
            <ShareButton
              endpoint={`/content/short-stories/${story.id}/share/`}
              label="Share story"
              className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-amber-300 transition hover:border-amber-400 hover:text-amber-200"
            />
          </div>
        </div>
        <p className="whitespace-pre-line text-base leading-relaxed text-zinc-300">{story.story}</p>
      </article>
    </section>
  );
}
