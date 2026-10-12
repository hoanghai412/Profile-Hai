(function () {
  var vietnameseToEnglish = {
    "Đổi chế độ Sáng/Tối": "Toggle light/dark theme",
    "Giao diện": "Theme",
    "Hồ sơ cá nhân": "Personal Profile",
    "Phát triển phần mềm": "Software Development",
    "Xem hồ sơ": "View Profile",
    "Ẩn hồ sơ": "Hide Profile",
    "Mục tiêu nghề nghiệp": "Career Objective",
    "Ngắn hạn": "Short-term",
    "— Mong muốn được làm việc trong môi trường chuyên nghiệp để áp dụng kiến thức lập trình Frontend/Backend/Full-Stack vào các dự án thực tế, đồng thời nâng cao kỹ năng xây dựng và phát triển phần mềm.": "— To apply my Frontend, Backend, and Full-Stack development skills in real-world projects while continuing to improve my software development abilities in a professional environment.",
    "Dài hạn": "Long-term",
    "— Trở thành một Software Developer chuyên nghiệp, có khả năng phát triển các hệ thống web ổn định, bảo mật và hiệu quả; không ngừng học hỏi công nghệ mới để đóng góp vào sự phát triển của doanh nghiệp.": "— To become a professional Software Developer capable of building reliable, secure, and efficient web systems, while continuously learning new technologies and contributing to business growth.",
    "Học vấn": "Education",
    "Kinh nghiệm làm việc": "Work Experience",
    "Phân tích & thu thập yêu cầu nghiệp vụ từ khách hàng/stakeholders, chuẩn hóa thành tài liệu chi tiết": "Gather and analyze requirements from clients and stakeholders, then turn them into clear documentation.",
    "Xây dựng tài liệu đặc tả SRS/BRD và chi tiết hóa luồng nghiệp vụ cho team Dev": "Create SRS/BRD specifications and clarify business workflows for the development team.",
    "Mô hình hóa hệ thống bằng biểu đồ UML (Use Case, Activity, Sequence)": "Model systems with UML diagrams, including Use Case, Activity, and Sequence diagrams.",
    "Xây dựng Test Case cơ bản, hỗ trợ nghiệm thu chức năng, phối hợp cùng Dev & Tester": "Write basic test cases, support feature acceptance, and coordinate with developers and testers.",
    "Dự án": "Projects",
    "Hệ thống quản lý quán coffee: quản lý sản phẩm, bàn, hóa đơn và dữ liệu cửa hàng; thiết kế & xử lý API phục vụ hoạt động hệ thống; chấm công ra vào bằng nhận diện khuôn mặt.": "A coffee shop management system for products, tables, invoices, and store data. Designed and implemented APIs, including face-recognition attendance tracking.",
    "Hệ thống đặt phòng và quản lý khách sạn đa chi nhánh (Multi-Hotel).": "A multi-hotel booking and management system.",
    "Tìm kiếm, lọc phòng theo loại, giá, tiện nghi; đặt phòng online, tra cứu bằng mã booking": "Search and filter rooms by type, price, and amenities; book online and look up reservations by booking code.",
    "Quản lý nhiều chi nhánh, phòng và đơn đặt phòng; dashboard doanh thu & tỷ lệ lấp đầy": "Manage branches, rooms, and reservations with revenue and occupancy dashboards.",
    "Quản lý quy trình Check-in, Check-out, No-show; mã giảm giá & khuyến mãi": "Manage check-in, check-out, and no-show workflows, plus discount codes and promotions.",
    "Phân quyền người dùng với Spring Security (Admin, Staff, Promotion Manager)": "Manage user roles with Spring Security (Admin, Staff, and Promotion Manager).",
    "Kỹ năng chuyên môn": "Technical Skills",
    "Ngôn ngữ lập trình": "Programming Languages",
    "Cơ sở dữ liệu": "Databases",
    "Công cụ": "Tools",
    "Kỹ năng mềm": "Soft Skills",
    "Giao tiếp & làm việc nhóm": "Communication and teamwork",
    "Giải quyết vấn đề": "Problem solving",
    "Quản lý thời gian": "Time management",
    "Tin học văn phòng": "Office software",
    "Sở thích": "Interests",
    "Đọc sách về phát triển bản thân": "Reading about personal development",
    "Tìm hiểu thuật toán & công nghệ mới": "Exploring algorithms and new technologies",
    "Đi du lịch khám phá": "Travel and exploration",
    "Liên hệ": "Contact",
    "Trò chuyện": "Chat",
    "Đóng": "Close",
    "Tên của bạn": "Your name",
    "Nhập tin nhắn...": "Type your message...",
    "Gửi": "Send",
    "Tin nhắn tự động": "Automatic message",
    "Chào bạn, cảm ơn bạn đã ghé trang cá nhân của mình. Hãy để lại lời nhắn, mình sẽ phản hồi sớm nhé.": "Hello! Thanks for visiting my portfolio. Leave me a message and I will get back to you as soon as I can.",
    "Trân trọng!!": "Best regards,",
    "Tin nhắn có thể được gửi tới MyMemory để dịch.": "Messages may be sent to MyMemory for translation."
  };

  var englishToVietnamese = {};
  Object.keys(vietnameseToEnglish).forEach(function (vietnamese) {
    englishToVietnamese[vietnameseToEnglish[vietnamese]] = vietnamese;
  });

  function getSavedLanguage() {
    try {
      return localStorage.getItem("hh-language") === "en" ? "en" : "vi";
    } catch (error) {
      return "vi";
    }
  }

  window.appLanguage = getSavedLanguage();
  try {
    window.languageManuallySelected = localStorage.getItem("hh-language-manual") === "true";
  } catch (error) {
    window.languageManuallySelected = false;
  }

  function translateTextNodes(language) {
    var dictionary = language === "en" ? vietnameseToEnglish : englishToVietnamese;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(function (node) {
      var original = node.nodeValue;
      var trimmed = original.trim();
      if (!trimmed || !dictionary[trimmed]) return;
      var leading = original.match(/^\s*/)[0];
      var trailing = original.match(/\s*$/)[0];
      node.nodeValue = leading + dictionary[trimmed] + trailing;
    });
  }

  function setLanguage(language, manualSelection) {
    window.appLanguage = language === "en" ? "en" : "vi";
    if (manualSelection) {
      window.languageManuallySelected = true;
      try { localStorage.setItem("hh-language-manual", "true"); } catch (error) {}
    }
    document.documentElement.lang = window.appLanguage;
    translateTextNodes(window.appLanguage);

    var profileToggle = document.getElementById("profile-toggle");
    if (profileToggle) {
      var isOpen = profileToggle.getAttribute("aria-expanded") === "true";
      profileToggle.textContent = window.appLanguage === "en"
        ? (isOpen ? "Hide Profile" : "View Profile")
        : (isOpen ? "Ẩn hồ sơ" : "Xem hồ sơ");
    }

      var themeToggle = document.querySelector(".theme-toggle");
      if (themeToggle) themeToggle.title = window.appLanguage === "en" ? "Toggle light/dark theme" : "Đổi chế độ Sáng/Tối";

      var languageToggle = document.querySelector(".language-toggle");
      if (languageToggle) languageToggle.setAttribute("aria-label", window.appLanguage === "en" ? "Language" : "Ngôn ngữ");
      var loader = document.querySelector(".site-loader");
      if (loader) loader.setAttribute("aria-label", window.appLanguage === "en" ? "Loading page" : "Đang tải trang");
      var phoneLink = document.querySelector('.icon-row a[href^="tel:"]');
      if (phoneLink) phoneLink.setAttribute("aria-label", window.appLanguage === "en" ? "Phone number" : "Số điện thoại");

    var chatPanel = document.getElementById("chat-panel");
    if (chatPanel) chatPanel.setAttribute("aria-label", window.appLanguage === "en" ? "Chat" : "Trò chuyện");
    var chatToggle = document.getElementById("chat-toggle");
    if (chatToggle) chatToggle.title = window.appLanguage === "en" ? "Chat" : "Trò chuyện";
    var chatClose = document.getElementById("chat-close");
    if (chatClose) chatClose.setAttribute("aria-label", window.appLanguage === "en" ? "Close" : "Đóng");
    var nameInput = document.getElementById("chat-name");
    if (nameInput) nameInput.placeholder = window.appLanguage === "en" ? "Your name" : "Tên của bạn";
    var textInput = document.getElementById("chat-text");
    if (textInput) textInput.placeholder = window.appLanguage === "en" ? "Type your message..." : "Nhập tin nhắn...";

    var languageButtons = document.querySelectorAll("[data-language]");
    Array.prototype.forEach.call(languageButtons, function (button) {
      var selected = button.dataset.language === window.appLanguage;
      button.setAttribute("aria-pressed", String(selected));
    });

    try { localStorage.setItem("hh-language", window.appLanguage); } catch (error) {}
    document.dispatchEvent(new CustomEvent("app-language-change", { detail: { language: window.appLanguage } }));
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-language]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLanguage(button.dataset.language, true);
      });
    });
    setLanguage(window.appLanguage);
  });
})();