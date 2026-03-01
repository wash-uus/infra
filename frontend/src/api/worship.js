import api from "./client";

export const getWorshipTeams = () => api.get("/worship/teams/");
export const getWorshipTeam = (id) => api.get(`/worship/teams/${id}/`);
export const getWorshipMembers = (params) => api.get("/worship/members/", { params });
export const getWorshipTracks = (params) => api.get("/worship/tracks/", { params });
export const recordPlay = (trackId) => api.post(`/worship/tracks/${trackId}/play/`);
export const submitJoinRequest = (data) => api.post("/worship/join/", data);
