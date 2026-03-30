import api from "./client";

export const getHomeFeed = (params) => api.get("/content/home-feed/", { params });
export const getShortStoryById = (id) => api.get(`/content/short-stories/${id}/`);
export const getTrending = () => api.get("/analytics/trending/");
