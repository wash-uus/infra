import api from "./client";

export const getApprovedUserPhotos = (params) =>
  api.get("/user-photos/", { params });

export const submitUserPhoto = (formData) =>
  api.post("/user-photos/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
