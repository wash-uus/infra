/**
 * messaging.js  —  Messaging service layer
 *
 * All messaging API calls are centralised here. The transport (polling vs
 * WebSocket) is decoupled from the business logic: to switch to WebSockets
 * in the future, replace only the send* methods and the polling hook — the
 * rest of the app stays unchanged.
 */
import api from "./client";

const messaging = {
  // ── Direct Messages ──────────────────────────────────────────────────────

  /**
   * Returns the first page of conversations (latest message per partner).
   */
  getConversations: () => api.get("/messaging/direct/"),

  /**
   * Returns a thread between the current user and `interlocutorId`.
   * Pass `since` (ISO string) for incremental polling.
   */
  getThread: (interlocutorId, since = null) =>
    api.get("/messaging/direct/", {
      params: {
        interlocutor: interlocutorId,
        ...(since ? { since } : {}),
      },
    }),

  /**
   * Send a direct message to `receiverId`.
   */
  sendDirect: (receiverId, text) =>
    api.post("/messaging/direct/", { receiver: receiverId, text }),

  /**
   * Soft-delete a direct message by id.
   */
  deleteDirect: (id) => api.delete(`/messaging/direct/${id}/`),

  /**
   * Mark all messages from `senderId` as read (call after opening a thread).
   */
  markDirectRead: (senderId) =>
    api.post("/messaging/direct/mark-read/", { sender_id: senderId }),

  // ── Group Messages ───────────────────────────────────────────────────────

  /**
   * Returns messages in `groupId`.
   * Pass `since` (ISO string) for incremental polling.
   */
  getGroupThread: (groupId, since = null) =>
    api.get("/messaging/group/", {
      params: {
        group: groupId,
        ...(since ? { since } : {}),
      },
    }),

  /**
   * Send a message to `groupId`.
   */
  sendGroup: (groupId, text) =>
    api.post("/messaging/group/", { group: groupId, text }),

  /**
   * Soft-delete a group message by id.
   */
  deleteGroup: (id) => api.delete(`/messaging/group/${id}/`),

  /**
   * Update the last-read receipt for a group (call after opening a group chat).
   */
  markGroupRead: (groupId) =>
    api.post("/messaging/group/mark-read/", { group_id: groupId }),

  // ── Unread counts ────────────────────────────────────────────────────────

  /**
   * Returns { dm: N, group: N, total: N } for the authenticated user.
   * Power the notification badge in the navigation.
   */
  getUnreadCount: () => api.get("/messaging/unread-count/"),
};

export default messaging;
