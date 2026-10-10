const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");
const { onValueCreated } = require("firebase-functions/v2/database");
const logger = require("firebase-functions/logger");

initializeApp();

exports.notifyVisitorOfAdminReply = onValueCreated({
  ref: "/threads/{uid}/messages/{messageId}",
  region: "us-central1"
}, async (event) => {
  const message = event.data.val();
  if (!message || message.from !== "owner") return;

  const tokenSnapshot = await getDatabase().ref(`/threads/${event.params.uid}/pushToken`).get();
  const token = tokenSnapshot.val();
  if (typeof token !== "string" || !token) return;

  try {
    await getMessaging().send({
      token,
      data: {
        title: "Bạn có phản hồi mới",
        body: "Admin đã trả lời tin nhắn của bạn.",
        url: "/"
      },
      webpush: { headers: { TTL: "86400" } }
    });
  } catch (error) {
    if (error.code === "messaging/registration-token-not-registered" || error.code === "messaging/invalid-registration-token") {
      await getDatabase().ref(`/threads/${event.params.uid}/pushToken`).remove();
      return;
    }
    logger.error("Failed to send visitor push notification", {
      uid: event.params.uid,
      messageId: event.params.messageId,
      error: error.message
    });
    throw error;
  }

  logger.info("Visitor push notification sent", {
    uid: event.params.uid,
    messageId: event.params.messageId
  });
});
