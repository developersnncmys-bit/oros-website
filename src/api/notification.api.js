import api from "@/lib/axios";

/** GET /notifications -> the signed-in user's notifications, newest first.
 *  Admins are the recipients of the admin-side events, so an admin token
 *  gets the admin feed and a customer token gets their own.
 *  params: { page, limit, isRead } — isRead filters read / unread. */
export const listNotifications = (params = {}) =>
  api.get("/notifications", { params });

/** PATCH /notifications/:id -> mark one as read. */
export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}`);

/** DELETE /notifications/:id -> remove one. */
export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`);

/** DELETE /notifications/clear -> remove many. params: { isRead } to limit
 *  the wipe to just the read or just the unread ones; omit for all. */
export const clearNotifications = (params = {}) =>
  api.delete("/notifications/clear", { params });
