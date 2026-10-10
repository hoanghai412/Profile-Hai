(function (scope) {
scope.firebaseConfig = {
  apiKey: "AIzaSyBltzUOLKsdQxW6r5zMMQDPaujoNOn_OEE",
  authDomain: "tinnhan-454c9.firebaseapp.com",
  databaseURL: "https://tinnhan-454c9-default-rtdb.firebaseio.com",
  projectId: "tinnhan-454c9",
  storageBucket: "tinnhan-454c9.firebasestorage.app",
  messagingSenderId: "349216619870",
  appId: "1:349216619870:web:65e522d7fbaeb1c0a1a3cf",
  vapidKey: "BBWtWqXPb15Oe4j0lPmO_7EWRoPbP9UZl10thJs-NWQaNM4on_OeuSR_vWosQnepq0tEAB8skKDWNBbuwaUS6-U",
  adminEmail: "haihttv00313@gmail.com"
};

scope.isFirebaseConfigReady = function (requireAdminEmail) {
  var fields = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId"];
  if (requireAdminEmail) fields.push("adminEmail");
  return fields.every(function (field) {
    var value = scope.firebaseConfig[field];
    return typeof value === "string" && value.trim() !== "";
  });
};
})(typeof globalThis !== "undefined" ? globalThis : window);