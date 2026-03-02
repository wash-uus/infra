import api from "./client";

/** Fetch approved gallery items. Optional ?type=photo|video filter. */
export const getGallery = (mediaType) => {
  const params = mediaType ? { type: mediaType } : {};
  return api.get("/content/gallery/", { params });
};

/** Fetch a raw paginated URL (for Load More). */
export const getGalleryPage = (url) => api.get(url);
