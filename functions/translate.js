(function () {
  var cache = new Map();
  var pending = new Map();
  var maxCacheEntries = 200;

  function decodeHtml(value) {
    var textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function translateChatMessage(text, targetLanguage) {
    var sourceText = String(text || "").trim();
    var target = targetLanguage === "en" ? "en" : "vi";
    if (!sourceText) return Promise.resolve({ text: "", sourceLanguage: "" });

    var cacheKey = target + "|" + sourceText;
    if (cache.has(cacheKey)) return Promise.resolve(cache.get(cacheKey));
    if (pending.has(cacheKey)) return pending.get(cacheKey);

    var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(sourceText) +
      "&langpair=autodetect%7C" + target;
    var request = fetch(url).then(function (response) {
      if (!response.ok) throw new Error("Translation service unavailable");
      return response.json();
    }).then(function (result) {
      if (Number(result.responseStatus) === 403 &&
          String(result.responseDetails || "").indexOf("PLEASE SELECT TWO DISTINCT LANGUAGES") !== -1) {
        return {
          text: sourceText,
          sourceLanguage: target
        };
      }
      if (result.responseStatus !== 200 || !result.responseData || !result.responseData.translatedText) {
        throw new Error("Translation was not returned");
      }

      var translated = decodeHtml(result.responseData.translatedText).trim();
      if (!translated || translated.toLocaleLowerCase() === sourceText.toLocaleLowerCase()) translated = sourceText;
      var translation = {
        text: translated,
        sourceLanguage: result.responseData.detectedLanguage === "en" ? "en" : "vi"
      };
      cache.set(cacheKey, translation);
      if (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
      return translation;
    }).finally(function () {
      pending.delete(cacheKey);
    });

    pending.set(cacheKey, request);
    return request;
  }

  window.translateChatText = function (text, targetLanguage) {
    return translateChatMessage(text, targetLanguage).then(function (result) { return result.text; });
  };

  window.detectChatLanguage = function (text) {
    return translateChatMessage(text, "vi").then(function (result) { return result.sourceLanguage; });
  };

  window.renderChatTranslation = function (container, text, targetLanguage, shouldTranslate, onDetectedLanguage) {
    var original = String(text || "");
    container.replaceChildren();
    var messageText = document.createElement("span");
    messageText.className = "message-text";
    messageText.textContent = original;
    container.appendChild(messageText);
    if (!shouldTranslate || !original.trim()) return;

    var controls = document.createElement("span");
    controls.className = "translation-note";
    controls.textContent = "Translating...";
    container.appendChild(controls);

    translateChatMessage(original, targetLanguage).then(function (result) {
      if (!container.isConnected) return;
      if (onDetectedLanguage) onDetectedLanguage(result.sourceLanguage);
      var translated = result.text;
      if (translated === original) {
        controls.remove();
        return;
      }

      messageText.textContent = translated;
      controls.textContent = targetLanguage === "en" ? "Translated automatically" : "Đã dịch tự động";
      var originalButton = document.createElement("button");
      originalButton.className = "translation-original-toggle";
      originalButton.type = "button";
      originalButton.textContent = targetLanguage === "en" ? "Show original" : "Xem bản gốc";
      originalButton.setAttribute("aria-expanded", "false");
      originalButton.addEventListener("click", function () {
        var showingOriginal = originalButton.getAttribute("aria-expanded") !== "true";
        messageText.textContent = showingOriginal ? original : translated;
        originalButton.textContent = showingOriginal
          ? (targetLanguage === "en" ? "Show translation" : "Xem bản dịch")
          : (targetLanguage === "en" ? "Show original" : "Xem bản gốc");
        originalButton.setAttribute("aria-expanded", String(showingOriginal));
      });
      controls.appendChild(originalButton);
    }).catch(function () {
      if (!container.isConnected) return;
      controls.textContent = targetLanguage === "en"
        ? "Translation unavailable; showing original."
        : "Không dịch được, đang hiển thị bản gốc.";
    });
  };
})();