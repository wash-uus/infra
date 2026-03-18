import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Fetch the course to locate the specific lesson
    api.get(`/discipleship/courses/${courseId}/`)
      .then(({ data }) => {
        const found = (data.lessons || []).find((l) => String(l.id) === String(lessonId));
        if (!found) {
          navigate(`/discipleship/course/${courseId}`, { replace: true });
          return;
        }
        setLesson(found);
        setCompleted(!!found.completed);
      })
      .catch(() => navigate("/discipleship", { replace: true }))
      .finally(() => setLoading(false));
  }, [courseId, lessonId, navigate]);

  const handleMarkComplete = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: window.location.pathname } } });
      return;
    }
    setMarking(true);
    try {
      await api.post("/discipleship/progress/mark-complete/", { lesson: Number(lessonId) });
      setCompleted(true);
    } catch { /* noop */ }
    finally { setMarking(false); }
  };

  if (loading) {
    return (
      <div className="page-bg min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-16 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-900" />)}
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-zinc-500">
          <Link to="/discipleship" className="hover:text-zinc-300 transition">Discipleship</Link>
          <span>/</span>
          <Link to={`/discipleship/course/${courseId}`} className="hover:text-zinc-300 transition">Course</Link>
          <span>/</span>
          <span className="text-zinc-300 truncate max-w-[200px]">{lesson.title}</span>
        </nav>

        {/* Lesson header */}
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500">Lesson</p>
          <h1 className="text-2xl font-black text-white sm:text-3xl">{lesson.title}</h1>
        </div>

        {/* Video */}
        {lesson.video_url && (
          <div className="mb-8 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            <iframe
              src={lesson.video_url}
              title={lesson.title}
              className="h-full w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Lesson content */}
        {lesson.content && (
          <div className="prose prose-invert max-w-none mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300 leading-relaxed">
            <p className="whitespace-pre-line">{lesson.content}</p>
          </div>
        )}

        {/* Mark complete */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t border-zinc-800 pt-6">
          {completed ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5">
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-emerald-400">Lesson Completed</span>
            </div>
          ) : (
            <button
              onClick={handleMarkComplete}
              disabled={marking}
              className="btn-gold py-2.5 px-6 text-sm disabled:opacity-60"
            >
              {marking ? "Saving…" : "Mark as Complete"}
            </button>
          )}
          <Link
            to={`/discipleship/course/${courseId}`}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            ← Back to course
          </Link>
        </div>
      </div>
    </div>
  );
}
