import { useEffect, useState } from "react";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DiscipleshipPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [startedIds, setStartedIds] = useState(new Set());
  const [enrollingId, setEnrollingId] = useState(null);
  const { isAuthenticated } = useAuth();

  const handleStartCourse = async (id) => {
    // Optimistically mark as started, then confirm with the API
    setStartedIds((prev) => new Set(prev).add(id));
    setEnrollingId(id);
    try {
      await api.post(`/discipleship/courses/${id}/enroll/`);
    } catch {
      // Endpoint may not exist yet or user already enrolled — keep optimistic state
    } finally {
      setEnrollingId(null);
    }
  };

  const handleLoadMore = () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    api.get(nextUrl.replace(/^https?:\/\/[^/]+/, ""))
      .then((r) => {
        setCourses((prev) => [...prev, ...(r.data.results || [])]);
        setNextUrl(r.data.next || null);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    api.get("/discipleship/courses/")
      .then((r) => {
        setCourses(r.data.results || r.data);
        setNextUrl(r.data.next || null);
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Growth</p>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Discipleship Courses</h1>
          <p className="mt-2 text-zinc-500">Structured teaching to help you grow deeper in Christ.</p>
        </div>

        {/* Courses */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-zinc-900" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-20 text-center">
            <p className="text-5xl mb-4">🎓</p>
            <p className="font-bold text-zinc-300 text-lg">Courses Coming Soon</p>
            <p className="mt-2 text-sm text-zinc-600">
              Admins can create courses and lessons through the API or Django admin panel.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div key={course.id} className="card-hover flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-2xl ring-1 ring-zinc-800">
                    🎓
                  </span>
                  <div>
                    <h3 className="font-bold text-white line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-zinc-500">{course.lessons?.length ?? 0} lessons</p>
                  </div>
                </div>

                {course.description && (
                  <p className="text-sm text-zinc-500 line-clamp-3">{course.description}</p>
                )}

                {course.lessons?.length > 0 && (
                  <ul className="space-y-1.5 border-t border-zinc-800 pt-3">
                    {course.lessons.slice(0, 3).map((lesson) => (
                      <li key={lesson.id} className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="h-1 w-1 rounded-full bg-amber-500" />
                        {lesson.title}
                        {lesson.video_url && (
                          <span className="ml-auto badge-gold">Video</span>
                        )}
                      </li>
                    ))}
                    {course.lessons.length > 3 && (
                      <li className="text-xs text-zinc-600">+{course.lessons.length - 3} more…</li>
                    )}
                  </ul>
                )}

                {isAuthenticated && (
                  startedIds.has(course.id) ? (
                    <p className="mt-auto text-center text-sm font-semibold text-emerald-400">
                      ✓ In Progress
                    </p>
                  ) : (
                    <button
                      className="mt-auto btn-gold py-2 text-sm w-full justify-center disabled:opacity-60"
                      disabled={enrollingId === course.id}
                      onClick={() => handleStartCourse(course.id)}
                    >
                      {enrollingId === course.id ? "Starting…" : "Start Course"}
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {nextUrl && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="rounded-full border border-zinc-700 px-8 py-2.5 text-sm font-semibold text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load More Courses"}
            </button>
          </div>
        )}

        {/* CTA */}
        <div className="mt-20 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950 px-8 py-12 text-center glow-gold">
          <p className="text-3xl mb-3">🔥</p>
          <h2 className="text-xl font-black text-white">Grow. Disciple. Transform.</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            From new believer to revival leader — the discipleship system is built to grow you step by step.
          </p>
        </div>
      </div>
    </div>
  );
}
