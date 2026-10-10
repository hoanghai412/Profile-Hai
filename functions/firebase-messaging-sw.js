importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBltzUOLKsdQxW6r5zMMQDPaujoNOn_OEE",
  authDomain: "tinnhan-454c9.firebaseapp.com",
  databaseURL: "https://tinnhan-454c9-default-rtdb.firebaseio.com",
  storageBucket: "tinnhan-454c9.firebasestorage.app",
  projectId: "tinnhan-454c9",
  messagingSenderId: "349216619870",
  appId: "1:349216619870:web:65e522d7fbaeb1c0a1a3cf"
});

firebase.messaging().onBackgroundMessage(function (payload) {
  var data = payload.data || {};
  self.registration.showNotification(data.title || "Bạn có phản hồi mới", {
    body: data.body || "Admin đã trả lời tin nhắn của bạn.",
    icon: "/img/favicon.svg",
    badge: "/img/favicon.svg",
    tag: "portfolio-admin-reply",
    data: { url: data.url || "/" }
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var targetUrl = new URL(event.notification.data.url || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
    for (var i = 0; i < clients.length; i++) {
      if (clients[i].url.indexOf(self.location.origin) === 0) {
        return clients[i].focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  }));
});
