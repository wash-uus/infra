import { useState, useCallback } from "react";

const STORAGE_KEY = "sra_signup_draft";

const defaultData = {
  step1: {
    full_name: "", email: "", username: "", password: "",
  },
  step2: {},
  step3: {},
  step4: {},
};

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return {
      step1: { ...defaultData.step1, ...parsed.step1 },
      step2: { ...defaultData.step2, ...parsed.step2 },
      step3: { ...defaultData.step3, ...parsed.step3 },
      step4: { ...defaultData.step4, ...parsed.step4 },
    };
  } catch {
    return defaultData;
  }
}

function saveDraft(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* noop */ }
}

export function useSignupPersist() {
  const [formData, setFormDataRaw] = useState(loadDraft);

  const setStepData = useCallback((step, data) => {
    setFormDataRaw((prev) => {
      const next = { ...prev, [step]: { ...prev[step], ...data } };
      saveDraft(next);
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setFormDataRaw(defaultData);
  }, []);

  return { formData, setStepData, clearDraft };
}
