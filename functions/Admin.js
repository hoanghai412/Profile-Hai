(function () {
  if (!window.firebase || !window.firebaseConfig) return;
  if (!window.isFirebaseConfigReady || !window.isFirebaseConfigReady(true)) return;

  var adminApp = null;
  firebase.apps.forEach(function (app) {
    if (app.name === "admin-dashboard") adminApp = app;
  });
  if (!adminApp) adminApp = firebase.initializeApp(window.firebaseConfig, "admin-dashboard");
  var auth = adminApp.auth();
  var db = adminApp.database();

  var loginView = document.getElementById("login-view");
  var inboxView = document.getElementById("inbox-view");
  var loginForm = document.getElementById("login-form");
  var emailInput = document.getElementById("login-email");
  var passInput = document.getElementById("login-pass");
  var passwordToggleBtn = document.getElementById("toggle-password");
  var loginError = document.getElementById("login-error");
  var logoutBtn = document.getElementById("logout-btn");

  var threadListEl = document.getElementById("thread-list");
  var threadSearchInput = document.getElementById("thread-search");
  var convHead = document.getElementById("conv-head");
  var convMessages = document.getElementById("conv-messages");
  var convForm = document.getElementById("conv-form");
  var convText = document.getElementById("conv-text");
  var convStatus = document.getElementById("conv-status");
  var convSendButton = convForm ? convForm.querySelector("button") : null;

  var activeUid = null;
  var activeMsgRef = null;
  var threadsRef = null;
  var threadsCache = {};
  var pendingMessages = {};

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";
    var d = new Date(timestamp);
    return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      loginError.textContent = "";
      auth.signInWithEmailAndPassword(emailInput.value.trim(), passInput.value)
        .catch(function () {
          loginError.textContent = "Đăng nhập thất bại. Kiểm tra lại thông tin.";
        });
    });
  }

  if (passwordToggleBtn && passInput) {
    passwordToggleBtn.addEventListener("click", function () {
      var showPassword = passInput.type === "password";
      passInput.type = showPassword ? "text" : "password";
      var toggleLabel = showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu";
      passwordToggleBtn.setAttribute("aria-label", toggleLabel);
      passwordToggleBtn.setAttribute("title", toggleLabel);
      passwordToggleBtn.setAttribute("aria-pressed", String(showPassword));
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () { auth.signOut(); });
  }

  if (threadSearchInput) {
    threadSearchInput.addEventListener("input", function () {
      renderThreadList(threadsCache);
    });
  }

  auth.onAuthStateChanged(function (user) {
    if (user && user.email === window.firebaseConfig.adminEmail) {
      loginView.style.display = "none";
      inboxView.style.display = "flex";
      listenThreads();
    } else {
      if (user) auth.signOut();
      stopListening();
      loginView.style.display = "block";
      inboxView.style.display = "none";
    }
  });

  function listenThreads() {
    if (threadsRef) return;
    threadsRef = db.ref("threads");
    threadsRef.on("value", function (snap) {
      var data = snap.val() || {};
      threadsCache = data;
      renderThreadList(data);
    });
  }

  function stopListening() {
    if (threadsRef) threadsRef.off();
    if (activeMsgRef) activeMsgRef.off();
    threadsRef = null;
    activeMsgRef = null;
    activeUid = null;
    threadsCache = {};
  }

  function renderThreadList(data) {
    var query = threadSearchInput ? threadSearchInput.value.trim().toLocaleLowerCase() : "";
    var allUids = Object.keys(data).filter(function (uid) { return data[uid] && data[uid].meta; });
    var uids = allUids.filter(function (uid) {
      if (!query) return true;
      var meta = data[uid].meta;
      var detailsMatch = ((meta.name || "Khách") + " " + (meta.lastText || "")).toLocaleLowerCase().indexOf(query) !== -1;
      if (detailsMatch) return true;
      var messages = data[uid].messages || {};
      return Object.keys(messages).some(function (key) {
        var text = messages[key] && messages[key].text;
        return typeof text === "string" && text.toLocaleLowerCase().indexOf(query) !== -1;
      });
    });
    uids.sort(function (a, b) { return (data[b].meta.lastTime || 0) - (data[a].meta.lastTime || 0); });

    threadListEl.innerHTML = "";
    if (!uids.length) {
      var empty = document.createElement("div");
      empty.className = "thread-empty";
      empty.textContent = allUids.length ? "Không tìm thấy hội thoại phù hợp." : "Chưa có khách nào nhắn tin.";
      threadListEl.appendChild(empty);
      return;
    }
    uids.forEach(function (uid) {
      var meta = data[uid].meta;
      var item = document.createElement("div");
      item.className = "thread-item" + (uid === activeUid ? " active" : "");
      item.dataset.uid = uid;

      var summary = document.createElement("div");
      summary.className = "thread-summary";
      var name = document.createElement("div");
      name.className = "t-name";
      name.textContent = meta.name || "Khách";
      summary.appendChild(name);

      var messages = data[uid].messages || {};
      var unreadCount = Object.keys(messages).reduce(function (count, key) {
        var message = messages[key];
        return count + (message && message.from !== "owner" && message.seen !== true ? 1 : 0);
      }, 0);
      if (unreadCount) {
        var unreadBadge = document.createElement("span");
        unreadBadge.className = "thread-unread";
        unreadBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
        unreadBadge.setAttribute("aria-label", unreadCount + " tin chưa đọc");
        summary.appendChild(unreadBadge);
      }

      var preview = document.createElement("div");
      preview.className = "t-preview";
      preview.textContent = meta.lastText || "";
      item.appendChild(summary);
      item.appendChild(preview);
      item.addEventListener("click", function () { openThread(uid); });
      threadListEl.appendChild(item);
    });
  }

  if (convForm) {
    convForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!activeUid) return;
      var uid = activeUid;
      var text = convText.value.trim();
      if (!text) return;

      // Xóa chữ ô input ngay lập tức cho mượt
      convText.value = "";
      convText.focus();

      convStatus.textContent = "Đang gửi...";
      var timeStamp = firebase.database.ServerValue.TIMESTAMP;
      var msgRef = db.ref("threads/" + uid + "/messages");

      var messageRef = msgRef.push();
      pendingMessages[messageRef.key] = true;
      messageRef.set({ from: "owner", text: text, time: timeStamp, seen: false })
        .then(function () {
          delete pendingMessages[messageRef.key];
          updateAdminMessageStatus(messageRef.key, { from: "owner" });
          if (activeUid === uid) convStatus.textContent = "Đã gửi phản hồi.";
          return db.ref("threads/" + uid + "/meta").update({ lastText: text, lastTime: timeStamp });
        }).catch(function (error) {
          if (pendingMessages[messageRef.key]) throw error;
          if (activeUid === uid) convStatus.textContent = "Đã gửi tin nhưng chưa cập nhật được danh sách.";
        }).catch(function () {
          if (pendingMessages[messageRef.key]) {
            delete pendingMessages[messageRef.key];
            updateAdminMessageStatus(messageRef.key, { from: "owner", failed: true });
            if (activeUid === uid) convStatus.textContent = "Lỗi gửi tin.";
          }
        });
    });
 }
 function openThread(uid) {
  if (activeMsgRef) activeMsgRef.off();
  activeUid = uid;

  Array.prototype.forEach.call(threadListEl.children, function (el) {
    el.classList.toggle("active", el.dataset.uid === uid);
  });

  var meta = threadsCache[uid] && threadsCache[uid].meta;
  convHead.textContent = meta ? (meta.name || "Khách") : "Khách";
  convMessages.innerHTML = "";
  convForm.style.display = "flex";

  activeMsgRef = db.ref("threads/" + uid + "/messages");
  
  activeMsgRef.limitToLast(100).on("child_added", function (snap) {
    renderMessage(snap.val(), snap.key);
    var msg = snap.val();
    if (msg.from !== "owner" && msg.seen !== true) {
      snap.ref.update({ seen: true });
    }
  });

  activeMsgRef.limitToLast(100).on("child_changed", function (snap) {
    updateAdminMessageStatus(snap.key, snap.val());
  });
}

// Render tin nhắn trong Admin có hiển thị chữ "Đã gửi" / "Đã xem" bên dưới tin của Admin
function renderMessage(msg, key) {
  var isOwner = (msg.from === "owner" || msg.sender === "Admin");
  var item = document.createElement("div");
  item.className = "chat-msg " + (isOwner ? "from-owner" : "from-visitor");
  if (key) item.dataset.key = key;

  var senderName = isOwner ? "Bạn" : escapeHtml(msg.name || "Khách");

  var statusHtml = "";
  if (isOwner) {
    var statusText = msg.seen ? "Đã xem" : (pendingMessages[key] ? "Đang gửi..." : (msg.failed ? "Gửi thất bại" : "Đã gửi"));
    statusHtml = '<div class="msg-status">' + statusText + '</div>';
  }

  item.innerHTML =
    '<div class="who">' + senderName + 
    ' <span style="font-size:10px; opacity:0.6;">' + formatTime(msg.time) + '</span></div>' +
    '<div class="bubble">' + escapeHtml(msg.text || "") + "</div>" + statusHtml;

  convMessages.appendChild(item);
  convMessages.scrollTop = convMessages.scrollHeight;
}

function updateAdminMessageStatus(key, msg) {
  var item = convMessages.querySelector('[data-key="' + key + '"]');
  if (item && (msg.from === "owner" || msg.sender === "Admin")) {
    var statusEl = item.querySelector(".msg-status");
    if (statusEl) {
      statusEl.textContent = msg.seen ? "Đã xem" : (pendingMessages[key] ? "Đang gửi..." : (msg.failed ? "Gửi thất bại" : "Đã gửi"));
    }
  }
}

})();
