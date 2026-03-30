import api from "./client";

// Member
export const getMemberDashboard = () => api.get("/accounts/dashboard/me/");

// Moderator
export const getModeratorStats = () => api.get("/accounts/moderator/stats/");

// Hub Leader
export const getHubLeaderStats = () => api.get("/accounts/hub-leader/stats/");

// Admin
export const getAdminStats = () => api.get("/accounts/admin/stats/");
export const getUsers = (params) => api.get("/accounts/users/", { params });
export const promoteUser = (id, role) =>
  api.post(`/accounts/users/${id}/promote/`, { role });
export const suspendUser = (id, reason) =>
  api.post(`/accounts/users/${id}/suspend/`, { reason });
export const reactivateUser = (id) =>
  api.post(`/accounts/users/${id}/reactivate/`);

// Account approval
export const getPendingApprovals = () => api.get("/accounts/users/pending-approval/");
export const approveUser = (id) => api.post(`/accounts/users/${id}/approve/`);
export const rejectUser = (id, reason) => api.post(`/accounts/users/${id}/reject/`, { reason });

// Group join requests
export const getGroupJoinRequests = (groupId) =>
  api.get("/groups/join-requests/", { params: groupId ? { group: groupId } : {} });
export const approveJoinRequest = (reqId) =>
  api.post(`/groups/join-requests/${reqId}/approve/`);
export const rejectJoinRequest = (reqId) =>
  api.post(`/groups/join-requests/${reqId}/reject/`);

// Admin messaging
export const adminSendMessage = (userId, text) =>
  api.post(`/accounts/admin/message-user/${userId}/`, { text });
export const adminBroadcast = (text) =>
  api.post("/accounts/admin/broadcast/", { text });

// WhatsApp Automation
export const waBroadcast = (message, broadcast_type = "general") =>
  api.post("/whatsapp/broadcast/", { message, broadcast_type });
export const waStats = () => api.get("/whatsapp/stats/");
export const waContacts = (opted_in = true) =>
  api.get("/whatsapp/contacts/", { params: { opted_in: opted_in ? "true" : "false" } });

// Super Admin
export const getSuperAdminStats = () => api.get("/accounts/superadmin/stats/");

// Notifications
export const getNotifications = () => api.get("/common/notifications/");
export const getUnreadCount = () => api.get("/common/notifications/unread/");
export const markAllRead = () => api.patch("/common/notifications/");

// Reviews
export const getReviews = (params) => api.get("/common/reviews/", { params });
export const reviewAction = (id, action, reason) =>
  api.post(`/common/reviews/${id}/action/`, { action, reason });

// Audit log
export const getAuditLog = (params) => api.get("/common/audit/", { params });

// Appeals
export const getAppeals = (params) => api.get("/common/appeals/", { params });
export const resolveAppeal = (id, decision, note) =>
  api.post(`/common/appeals/${id}/resolve/`, { decision, note });
export const createAppeal = (data) => api.post("/common/appeals/create/", data);
