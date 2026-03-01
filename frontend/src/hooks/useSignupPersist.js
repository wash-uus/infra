import { useState, useCallback } from "react";

const STORAGE_KEY = "sra_signup_draft";

const defaultData = {
  step1: {
    full_name: "", email: "", password: "", confirm_password: "",
    country: "", city: "", phone: "", gender: "",
  },
  step2: {
    born_again: "", year_of_salvation: "", church_name: "",
    denomination: "", serves_in_church: "", ministry_areas: [], testimony: "",
  },
  step3: {
    why_join: "", unity_agreement: false, statement_of_faith: false,
    code_of_conduct: false, subscribe_scripture: true,
  },
  step4: {
    membership_type: "member", led_ministry_before: "",
    leadership_experience: "", profile_picture: null,
  },
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
      step4: { ...defaultData.step4, ...parsed.step4, profile_picture: null },
    };
  } catch {
    return defaultData;
  }
}

function saveDraft(data) {
  try {
    // Don't persist File objects
    const toSave = { ...data, step4: { ...data.step4, profile_picture: null } };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
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
