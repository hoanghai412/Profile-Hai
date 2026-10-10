(function () {
  var firebaseReady = !!(window.firebase && window.firebaseConfig &&
    window.isFirebaseConfigReady && window.isFirebaseConfigReady(false));

  if (firebaseReady && !firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
  var db = firebaseReady ? firebase.database() : null;
  var auth = firebaseReady ? firebase.auth() : null;

  var toggleBtn = document.getElementById("chat-toggle");
  var panel = document.getElementById("chat-panel");
  var closeBtn = document.getElementById("chat-close");
  var listEl = document.getElementById("chat-messages");
  var form = document.getElementById("chat-form");
  var nameInput = document.getElementById("chat-name");
  var textInput = document.getElementById("chat-text");
  var statusEl = document.getElementById("chat-status");
  var pendingMessages = {};
  var messaging = null;
  var notificationsEnabled = false;
  var notificationsOptOutKey = "hh-chat-push-disabled";

  if (!toggleBtn || !panel || !closeBtn || !listEl || !form || !nameInput || !textInput) return;

  try {
    var savedName = localStorage.getItem("hh-chat-name");
    if (savedName) nameInput.value = savedName;
  } catch (e) {}

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";
    var date = new Date(timestamp);
    return String(date.getHours()).padStart(2, '0') + ":" + String(date.getMinutes()).padStart(2, '0');
  }

  // TỰ ĐỘNG ĐÁNH DẤU "ĐÃ XEM" CÁC TIN NHẮN TỪ ADMIN
  function markAdminMessagesAsSeen(messagesRef) {
    messagesRef.once("value", function (snap) {
      snap.forEach(function (childSnap) {
        var msg = childSnap.val();
        if (msg.from === "owner" && !msg.seen) {
          childSnap.ref.update({ seen: true });
        }
      });
    });
  }

  // RENDER TIN NHẮN CÓ TRẠNG THÁI "ĐÃ GỬI / ĐÃ XEM"
  function renderMessage(msg, key) {
    var empty = listEl.querySelector(".chat-empty");
    if (empty) empty.remove();

    var isMe = (msg.from !== "owner");
    
    // Kiểm tra xem phần tử đã tồn tại chưa (để cập nhật trạng thái nếu có)
    var item = key ? listEl.querySelector('[data-key="' + key + '"]') : null;
    if (!item) {
      item = document.createElement("div");
      if (key) item.dataset.key = key;
      listEl.appendChild(item);
    }

    item.className = "chat-msg " + (isMe ? "from-me" : "from-other");

    var senderName = isMe ? "Bạn" : "Hoàng Trung Hải";
    
    // Hiển thị trạng thái cho tin nhắn Khách gửi
    var statusHtml = "";
    if (isMe) {
      var statusText = msg.seen ? "Đã xem" : (pendingMessages[key] ? "Đang gửi..." : (msg.failed ? "Gửi thất bại" : "Đã gửi"));
      statusHtml = '<div class="msg-status">' + statusText + '</div>';
    }

    item.innerHTML =
      '<div class="who">' + escapeHtml(senderName) + 
      ' <span style="font-size:10px; opacity:0.6;">' + formatTime(msg.time) + '</span></div>' +
      '<div class="bubble">' + escapeHtml(msg.text || "") + '</div>' + statusHtml;

    listEl.scrollTop = listEl.scrollHeight;
  }

  function renderWelcomeMessage() {
    if (listEl.querySelector(".auto-welcome")) return;

    var empty = listEl.querySelector(".chat-empty");
    if (empty) empty.remove();

    var item = document.createElement("div");
    item.className = "chat-msg from-other auto-welcome";
    item.innerHTML =
      '<div class="who">Tin nhắn tự động</div>' +
      '<div class="bubble">' + escapeHtml("Chào bạn, cảm ơn bạn đã ghé trang cá nhân của mình. Hãy để lại lời nhắn, mình sẽ phản hồi sớm nhé. Bạn vui lòng bật thông báo để nhận được phản hồi ngay khi mình trả lời nhé.") + '<br><br>' + escapeHtml("Trân trọng!!") + '</div>' +
      '<button class="chat-notification-btn" id="chat-enable-notifications" type="button">Bật thông báo</button>';
    listEl.appendChild(item);
    var notificationButton = item.querySelector(".chat-notification-btn");
    notificationButton.addEventListener("click", toggleNotifications);
    updateNotificationButton();
  }

  function updateNotificationButton() {
    var notificationButton = document.getElementById("chat-enable-notifications");
    if (!notificationButton) return;

    var label = notificationsEnabled ? "Tắt thông báo" : "Bật thông báo";
    notificationButton.textContent = label;
    notificationButton.setAttribute("aria-label", label);
    notificationButton.setAttribute("aria-pressed", String(notificationsEnabled));
    notificationButton.title = notificationsEnabled ? "Tắt thông báo trên thiết bị này" : "Nhận thông báo khi có phản hồi";
  }

  function toggleNotifications() {
    if (notificationsEnabled) disableNotifications();
    else enableNotifications();
  }

  function enableNotifications() {
    if (!firebaseReady || !firebase.messaging || !window.firebaseConfig.vapidKey) {
      if (statusEl) statusEl.textContent = "Thông báo chưa được cấu hình. Vui lòng thử lại sau.";
      return;
    }
    if (!window.isSecureContext || !navigator.serviceWorker || !("Notification" in window)) {
      if (statusEl) statusEl.textContent = "Thông báo cần website HTTPS và trình duyệt hỗ trợ.";
      return;
    }

    var notificationButton = document.getElementById("chat-enable-notifications");
    if (notificationButton) notificationButton.disabled = true;
    if (statusEl) statusEl.textContent = "Đang bật thông báo...";

    Notification.requestPermission().then(function (permission) {
      if (permission !== "granted") throw new Error("notification-permission-denied");
      return Promise.resolve(firebase.messaging.isSupported());
    }).then(function (supported) {
      if (!supported) throw new Error("messaging-not-supported");
      messaging = firebase.messaging();
      return navigator.serviceWorker.register("./functions/firebase-messaging-sw.js");
    }).then(function (registration) {
      return messaging.getToken({
        vapidKey: window.firebaseConfig.vapidKey,
        serviceWorkerRegistration: registration
      });
    }).then(function (token) {
      if (!token) throw new Error("messaging-token-unavailable");
      return getMessagesRef().then(function (messagesRef) {
        return messagesRef.parent.child("pushToken").set(token);
      });
    }).then(function () {
      try { localStorage.removeItem(notificationsOptOutKey); } catch (e) {}
      notificationsEnabled = true;
      updateNotificationButton();
      if (statusEl) statusEl.textContent = "Đã bật thông báo. Bạn sẽ nhận được tin khi mình phản hồi.";
    }).catch(function (error) {
      if (statusEl) {
        statusEl.textContent = error.message === "notification-permission-denied"
          ? "Bạn chưa cấp quyền thông báo cho website."
          : "Chưa bật được thông báo. Hãy thử lại sau.";
      }
    }).then(function () {
      if (notificationButton) notificationButton.disabled = false;
    });
  }

  function disableNotifications() {
    var notificationButton = document.getElementById("chat-enable-notifications");
    if (notificationButton) notificationButton.disabled = true;
    if (statusEl) statusEl.textContent = "Đang tắt thông báo...";
    try { localStorage.setItem(notificationsOptOutKey, "true"); } catch (e) {}

    getMessagesRef().then(function (messagesRef) {
      return messagesRef.parent.child("pushToken").remove();
    }).then(function () {
      notificationsEnabled = false;
      updateNotificationButton();
      if (statusEl) statusEl.textContent = "Đã tắt thông báo trên thiết bị này.";
    }).catch(function () {
      try { localStorage.removeItem(notificationsOptOutKey); } catch (e) {}
      if (statusEl) statusEl.textContent = "Chưa tắt được thông báo. Hãy thử lại sau.";
    }).then(function () {
      if (notificationButton) notificationButton.disabled = false;
    });
  }

  function refreshPushToken() {
    if (!firebaseReady || !firebase.messaging || !window.firebaseConfig.vapidKey ||
        !window.isSecureContext || !navigator.serviceWorker || !("Notification" in window) ||
        Notification.permission !== "granted") return;
    try {
      if (localStorage.getItem(notificationsOptOutKey) === "true") return;
    } catch (e) {}

    Promise.resolve(firebase.messaging.isSupported()).then(function (supported) {
      if (!supported) return null;
      messaging = firebase.messaging();
      return navigator.serviceWorker.register("./functions/firebase-messaging-sw.js");
    }).then(function (registration) {
      if (!registration) return null;
      return messaging.getToken({
        vapidKey: window.firebaseConfig.vapidKey,
        serviceWorkerRegistration: registration
      });
    }).then(function (token) {
      if (!token) return false;
      return getMessagesRef().then(function (messagesRef) {
        return messagesRef.parent.child("pushToken").set(token).then(function () { return true; });
      });
    }).catch(function (error) {
      console.warn("Could not refresh visitor notification token:", error);
    }).then(function (enabled) {
      if (!enabled) return;
      notificationsEnabled = true;
      updateNotificationButton();
    });
  }

  function markMessageAsSeen(messageSnap) {
    var message = messageSnap.val();
    if (message.from === "owner" && message.seen !== true) {
      messageSnap.ref.update({ seen: true });
    }
  }

  function sendVisitorEmailNotice(name, text) {
    var formspreeEndpoint = "https://formspree.io/f/xkjoryer";

    fetch(formspreeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        name: name,
        message: text,
        _subject: "💬 Tin nhắn mới từ " + name + " trên Portfolio"
      })
    }).then(function (res) {
      if (res.ok) console.log("Formspree: Đã gửi email thông báo thành công!");
    }).catch(function (err) {
      console.warn("Lỗi gửi mail Formspree:", err);
    });
  }

  var authReady = auth ? auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(function () {
      return new Promise(function (resolve, reject) {
        var unsubscribe = auth.onAuthStateChanged(function (user) {
          unsubscribe();
          resolve(user);
        }, reject);
      });
    }) : Promise.resolve(null);

  var signInPromise = null;
  function getMessagesRef() {
    return authReady.then(function (initialUser) {
      var user = auth.currentUser || initialUser;
      if (user && user.isAnonymous) return user;
      if (!signInPromise) {
        var signOut = user ? auth.signOut() : Promise.resolve();
        signInPromise = signOut.then(function () {
          return auth.signInAnonymously();
        }).then(function (cred) {
          return cred.user;
        }).finally(function () {
          signInPromise = null;
        });
      }
      return signInPromise;
    }).then(function (user) {
      return db.ref("threads/" + user.uid + "/messages");
    });
  }

  if (firebaseReady) getMessagesRef().then(function (messagesRef) {
    // LẮNG NGHE TIN NHẮN MỚI
    messagesRef.limitToLast(50).on("child_added", function (snap) {
      renderMessage(snap.val(), snap.key);
      if (!panel.hasAttribute("hidden")) {
        markMessageAsSeen(snap);
      }
    });

    // LẮNG NGHE SỰ THAY ĐỔI TRẠNG THÁI (ĐÃ XEM)
    messagesRef.limitToLast(50).on("child_changed", function (snap) {
      renderMessage(snap.val(), snap.key);
    });

  });
  refreshPushToken();

  toggleBtn.addEventListener("click", function () {
    var isHidden = panel.hasAttribute("hidden");
    if (isHidden) {
      panel.removeAttribute("hidden");
      toggleBtn.setAttribute("aria-expanded", "true");
      renderWelcomeMessage();
      listEl.scrollTop = listEl.scrollHeight;
      if (firebaseReady) {
        getMessagesRef().then(function (messagesRef) {
          markAdminMessagesAsSeen(messagesRef);
        });
      }
    } else {
      panel.setAttribute("hidden", "");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  closeBtn.addEventListener("click", function () {
    panel.setAttribute("hidden", "");
    toggleBtn.setAttribute("aria-expanded", "false");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    var text = textInput.value.trim();
    if (!name || !text) return;
    if (!firebaseReady) {
      if (statusEl) statusEl.textContent = "Chat chưa kết nối. Vui lòng thử lại sau.";
      return;
    }

    textInput.value = "";
    textInput.focus();

    try { localStorage.setItem("hh-chat-name", name); } catch (e) {}
    if (statusEl) statusEl.textContent = "";

    var pendingMessage = { from: "visitor", name: name, text: text, time: Date.now(), seen: false };
    var pendingMessageRef = null;
    getMessagesRef().then(function (messagesRef) {
      var timeStamp = firebase.database.ServerValue.TIMESTAMP;
      pendingMessageRef = messagesRef.push();
      pendingMessages[pendingMessageRef.key] = true;
      return pendingMessageRef.set({
        from: pendingMessage.from,
        name: pendingMessage.name,
        text: pendingMessage.text,
        time: timeStamp,
        seen: false
      }).then(function () {
        delete pendingMessages[pendingMessageRef.key];
        renderMessage(pendingMessage, pendingMessageRef.key);
        return messagesRef.parent.child("meta").update({ name: name, lastText: text, lastTime: timeStamp }).catch(function () {
          if (statusEl) statusEl.textContent = "Tin đã gửi nhưng chưa cập nhật được hội thoại.";
        });
      }).then(function () {
        sendVisitorEmailNotice(name, text);
      });
    }).catch(function (error) {
      if (pendingMessageRef) {
        delete pendingMessages[pendingMessageRef.key];
        pendingMessage.failed = true;
        renderMessage(pendingMessage, pendingMessageRef.key);
      }
      if (textInput.value === "") textInput.value = text;
      if (statusEl) statusEl.textContent = "Gửi tin nhắn chưa thành công.";
    });
  });
})();