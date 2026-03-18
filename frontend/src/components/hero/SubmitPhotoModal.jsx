/**
 * SubmitPhotoModal
 * ─────────────────
 * Lets authenticated users submit their own worship/revival moment photos
 * for the hero collage. Photos are moderated before appearing.
 *
 * Features:
 *   • HTML5 drag-and-drop + click-to-select
 *   • Live image preview
 *   • Caption / testimony fields
 *   • Upload progress bar (Axios onUploadProgress)
 *   • Pending-moderation success state
 *   • File type + size validation (client-side guard)
 */

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { submitUserPhoto } from "../../api/heroCollage";

const MAX_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP, and GIF images are accepted.";
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return `Image must be ≤ ${MAX_MB} MB (yours is ${formatMb(file.size)}).`;
  }
  return null;
}

// ── Drag-drop zone ───────────────────────────────────────────────────────────

function DropZone({ onFile, preview, error }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const processFiles = useCallback(
    (files) => {
      const file = files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer?.files ?? []);
  };

  const handleChange = (e) => processFiles(e.target.files ?? []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Click or drag an image to upload"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors
        ${dragging
          ? "border-amber-400 bg-amber-500/8"
          : error
          ? "border-red-600/60 bg-red-900/10"
          : "border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800/50"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        onChange={handleChange}
        aria-hidden="true"
      />

      {preview ? (
        <div className="relative h-full w-full overflow-hidden rounded-lg">
          <img
            src={preview}
            alt="Selected photo preview"
            className="h-48 w-full object-cover rounded-lg opacity-90"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
            <span className="text-xs font-medium text-white">Change photo</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">🖼</span>
          <p className="text-sm font-medium text-zinc-300">
            Drop your photo here, or <span className="text-amber-400 underline">click to browse</span>
          </p>
          <p className="text-xs text-zinc-600">JPEG, PNG, WebP · max {MAX_MB} MB</p>
        </div>
      )}

      {error && (
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-red-400 px-3">{error}</p>
      )}
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <motion.div
        className="h-full rounded-full bg-amber-500"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ ease: "linear", duration: 0.2 }}
      />
    </div>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────

function SuccessState({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-10 text-center"
    >
      <span className="text-5xl" aria-hidden="true">🙏</span>
      <h3 className="text-xl font-bold text-zinc-100">Photo Submitted!</h3>
      <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
        Your revival moment has been received. Our team will review it before it
        appears in the hero collage. Thank you for sharing!
      </p>
      <button
        onClick={onClose}
        className="mt-2 rounded-xl bg-amber-500/15 px-6 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors"
      >
        Close
      </button>
    </motion.div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function SubmitPhotoModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const [caption, setCaption] = useState("");
  const [testimony, setTestimony] = useState("");
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleFile = useCallback((f) => {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      setPreview("");
      return;
    }
    setFileError("");
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result ?? "");
    reader.readAsDataURL(f);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setFileError("Please select an image."); return; }
    const fd = new FormData();
    fd.append("image", file);
    if (caption.trim()) fd.append("caption", caption.trim());
    if (testimony.trim()) fd.append("testimony", testimony.trim());

    setSubmitting(true);
    setApiError("");
    setProgress(0);

    try {
      await submitUserPhoto(fd, (pct) => setProgress(pct));
      setSubmitted(true);
    } catch (err) {
      const msg =
        err?.response?.data?.image?.[0] ||
        err?.response?.data?.detail ||
        "Upload failed. Please try again.";
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setFile(null);
    setPreview("");
    setFileError("");
    setCaption("");
    setTestimony("");
    setProgress(0);
    setSubmitting(false);
    setSubmitted(false);
    setApiError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-photo-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ ease: "easeOut", duration: 0.28 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 id="submit-photo-title" className="text-base font-bold text-zinc-100">
                Submit Your Revival Moment
              </h2>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {submitted ? (
                <SuccessState onClose={handleClose} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <DropZone
                    onFile={handleFile}
                    preview={preview}
                    error={fileError}
                  />

                  <div>
                    <label htmlFor="spm-caption" className="mb-1 block text-xs font-medium text-zinc-400">
                      Caption <span className="text-zinc-600">(optional)</span>
                    </label>
                    <input
                      id="spm-caption"
                      type="text"
                      maxLength={220}
                      placeholder='e.g. "Night of worship at Nairobi Revival Centre"'
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="spm-testimony" className="mb-1 block text-xs font-medium text-zinc-400">
                      Testimony <span className="text-zinc-600">(optional)</span>
                    </label>
                    <textarea
                      id="spm-testimony"
                      rows={3}
                      placeholder="Share what God did in this moment…"
                      value={testimony}
                      onChange={(e) => setTestimony(e.target.value)}
                      maxLength={1000}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500 transition-colors resize-none"
                    />
                    <p className="mt-1 text-right text-[10px] text-zinc-600">{testimony.length}/1000</p>
                  </div>

                  {submitting && (
                    <div className="space-y-1.5">
                      <ProgressBar pct={progress} />
                      <p className="text-center text-xs text-zinc-500">Uploading… {progress}%</p>
                    </div>
                  )}

                  {apiError && (
                    <p className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">{apiError}</p>
                  )}

                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    By submitting, you confirm you own this photo or have rights to share it.
                    All submissions are reviewed before appearing on the site.
                  </p>

                  <button
                    type="submit"
                    disabled={submitting || !file}
                    className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? "Uploading…" : "Submit Your Photo"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
