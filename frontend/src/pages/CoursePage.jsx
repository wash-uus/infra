import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function CoursePage() {
  const { courseId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    api.get(`/discipleship/courses/${courseId}/`)
      .then(({ data }) => {
        setCourse(data);
        // If user already has progress on any lesson, treat as enrolled
        if (data.completed_lessons > 0 || data.total_lessons === 0) {
          setEnrolled(true);
        }
      })
      .catch(() => navigate("/discipleship", { replace: true }))
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/discipleship/course/${courseId}` } } });
      return;
    }
    setEnrolling(true);
    try {
      await api.post(`/discipleship/courses/${courseId}/enroll/`);
      setEnrolled(true);
    } catch { /* already enrolled — treat as enrolled */ setEnrolled(true); }
    finally { setEnrolling(false); }
  };

  if (loading) {
    return (
      <div className="page-bg min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-16 space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-zinc-900" />)}
        </div>
      </div>
    );
  }

  if (!course) return null;

  const { completed_lessons = 0, total_lessons = 0 } = course;
  const progress = total_lessons > 0 ? Math.round((completed_lessons / total_lessons) * 100) : 0;

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Back */}
        <Link to="/discipleship" className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Courses
        </Link>

        {/* Course header */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500">Course</p>
          <h1 className="text-2xl font-black text-white sm:text-3xl">{course.title}</h1>
          {course.description && (
            <p className="mt-2 text-zinc-400 leading-relaxed">{course.description}</p>
          )}
        </div>

        {/* Progress */}
        {isAuthenticated && total_lessons > 0 && (
          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-300">Your Progress</span>
              <span className="text-sm font-bold text-amber-400">{completed_lessons} / {total_lessons} lessons</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-600">{progress}% complete</p>
          </div>
        )}

        {/* Enroll CTA */}
        {isAuthenticated && !enrolled && total_lessons > 0 && (
          <div className="mb-8">
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="btn-gold py-2.5 px-8 text-sm disabled:opacity-60"
            >
              {enrolling ? "Enrolling…" : "Enroll in This Course"}
            </button>
          </div>
        )}

        {/* Lessons list */}
        {course.lessons?.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white mb-4">Lessons</h2>
            {course.lessons.map((lesson, idx) => (
              <Link
                key={lesson.id}
                to={`/discipleship/course/${courseId}/lesson/${lesson.id}`}
                className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:border-amber-500/30 hover:bg-zinc-900 transition group"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                  lesson.completed ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40" : "bg-zinc-900 text-zinc-500 ring-1 ring-zinc-800"
                }`}>
                  {lesson.completed ? "✓" : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${lesson.completed ? "text-zinc-400" : "text-white"}`}>
                    {lesson.title}
                  </p>
                  {lesson.video_url && (
                    <p className="text-xs text-zinc-600 mt-0.5">🎬 Video lesson</p>
                  )}
                </div>
                <svg className="h-4 w-4 text-zinc-600 group-hover:text-amber-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
            <p className="text-4xl mb-3">🎓</p>
            <p className="text-zinc-400">No lessons added yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
