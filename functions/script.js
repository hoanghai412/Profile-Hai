document.addEventListener('DOMContentLoaded', function () {
  // 1. LOADER TRANG
  document.body.classList.add('is-loading');

  // 2. LOGIC CHUYỂN ĐỔI THEME SÁNG / TỐI (LƯU LOCALSTORAGE)
  var themeSwitch = document.getElementById('theme-switch');
  var savedTheme = localStorage.getItem('hh-theme') || 'dark';

  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeSwitch) themeSwitch.checked = true;
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeSwitch) themeSwitch.checked = false;
  }

  if (themeSwitch) {
    themeSwitch.addEventListener('change', function () {
      if (this.checked) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('hh-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('hh-theme', 'dark');
      }
    });
  }

  // 3. LOGIC NÚT XEM HỒ SƠ / ẨN HỒ SƠ (ĐÃ KHÔI PHỤC)
  var profileToggle = document.getElementById('profile-toggle');
  var profileContent = document.getElementById('profile-content');

  if (profileToggle && profileContent) {
    profileToggle.addEventListener('click', function () {
      var isOpen = profileContent.classList.contains('is-open');

      if (isOpen) {
        // Đóng hồ sơ
        profileContent.classList.remove('is-open');
        profileContent.setAttribute('inert', '');
        profileToggle.setAttribute('aria-expanded', 'false');
        profileToggle.textContent = window.appLanguage === 'en' ? 'View Profile' : 'Xem hồ sơ';
      } else {
        // Mở hồ sơ
        profileContent.classList.add('is-open');
        profileContent.removeAttribute('inert');
        profileToggle.setAttribute('aria-expanded', 'true');
        profileToggle.textContent = window.appLanguage === 'en' ? 'Hide Profile' : 'Ẩn hồ sơ';

        // Cuộn mượt xuống nội dung hồ sơ
        window.setTimeout(function () {
          profileContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    });
  }

  // 4. HIỆU ỨNG SCROLL REVEAL
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1 });

    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // TẮT LOADER KHI TRANG TẢI XONG
  window.addEventListener('load', function () {
    window.setTimeout(function () {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
    }, 200);
  });
});