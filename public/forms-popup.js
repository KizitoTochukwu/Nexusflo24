/* NexusFlo24 popup form embed — v1
   Usage:
   <script src="https://YOUR-DOMAIN/forms-popup.js"
           data-form="https://YOUR-DOMAIN/forms/your-slug"
           data-trigger="delay"        // button | delay | scroll | exit
           data-delay="5"              // seconds (delay trigger)
           data-scroll="50"            // percent (scroll trigger)
           data-frequency="session"    // always | session | days
           data-days="7"               // days (frequency=days)
           data-button-text="Get started"
           defer></script>
*/
(function () {
  var script = document.currentScript;
  if (!script) return;

  var formUrl = script.getAttribute("data-form");
  if (!formUrl) return;

  var trigger = script.getAttribute("data-trigger") || "button";
  var delay = parseFloat(script.getAttribute("data-delay") || "5");
  var scrollPct = parseFloat(script.getAttribute("data-scroll") || "50");
  var frequency = script.getAttribute("data-frequency") || "session";
  var days = parseFloat(script.getAttribute("data-days") || "7");
  var buttonText = script.getAttribute("data-button-text") || "Open form";
  var key = "nf24_popup_" + formUrl;

  function seen() {
    try {
      if (frequency === "always") return false;
      if (frequency === "session") return sessionStorage.getItem(key) === "1";
      var at = parseFloat(localStorage.getItem(key) || "0");
      return at > 0 && Date.now() - at < days * 86400000;
    } catch (e) { return false; }
  }

  function remember() {
    try {
      if (frequency === "session") sessionStorage.setItem(key, "1");
      else if (frequency === "days") localStorage.setItem(key, String(Date.now()));
    } catch (e) { /* storage blocked */ }
  }

  var overlay = null;
  var resizeHandler = null;

  function popupFormUrl() {
    try {
      var url = new URL(formUrl, window.location.href);
      url.searchParams.set("display", "popup");
      return url.toString();
    } catch (e) {
      return formUrl + (formUrl.indexOf("?") === -1 ? "?" : "&") + "display=popup";
    }
  }

  function close() {
    if (overlay) { overlay.remove(); overlay = null; }
    if (resizeHandler) { window.removeEventListener("message", resizeHandler); resizeHandler = null; }
    document.body.style.overflow = "";
  }

  function open() {
    if (overlay) return;
    remember();
    overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(11,31,59,.55);" +
      "display:flex;align-items:center;justify-content:center;padding:clamp(6px,2vh,16px);box-sizing:border-box;";

    var panel = document.createElement("div");
    panel.style.cssText =
      "position:relative;width:100%;max-width:560px;height:min(96dvh,760px);max-height:calc(100dvh - 12px);background:#fff;" +
      "border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.3);";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText =
      "position:absolute;top:8px;right:10px;z-index:2;border:0;background:transparent;" +
      "font-size:26px;line-height:1;cursor:pointer;color:#0B1F3B;";
    closeBtn.addEventListener("click", close);

    var iframe = document.createElement("iframe");
    iframe.src = popupFormUrl();
    iframe.loading = "lazy";
    iframe.title = "NexusFlo24 form";
    iframe.style.cssText = "width:100%;height:100%;border:0;display:block;";

    resizeHandler = function (event) {
      if (event.source !== iframe.contentWindow || !event.data || event.data.type !== "nexusflo-popup-resize") return;
      var requested = Number(event.data.height);
      if (!Number.isFinite(requested) || requested <= 0) return;
      var available = Math.max(320, window.innerHeight - 12);
      panel.style.height = Math.min(requested, available) + "px";
    };
    window.addEventListener("message", resizeHandler);

    panel.appendChild(closeBtn);
    panel.appendChild(iframe);
    overlay.appendChild(panel);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
  }

  window.NexusFlo24Popup = { open: open, close: close };

  if (trigger === "button") {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = buttonText;
    btn.style.cssText =
      "background:#0B1F3B;color:#fff;border:0;border-radius:10px;padding:12px 22px;" +
      "font-size:15px;font-weight:600;cursor:pointer;";
    btn.addEventListener("click", open);
    script.parentNode.insertBefore(btn, script);
    document.querySelectorAll("[data-nf24-popup]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); open(); });
    });
    return;
  }

  if (seen()) return;

  if (trigger === "delay") {
    setTimeout(open, Math.max(0, delay) * 1000);
  } else if (trigger === "scroll") {
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 100;
      if (pct >= scrollPct) { window.removeEventListener("scroll", onScroll); open(); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  } else if (trigger === "exit") {
    var onLeave = function (e) {
      if (e.clientY <= 0) { document.removeEventListener("mouseout", onLeave); open(); }
    };
    document.addEventListener("mouseout", onLeave);
  }
})();
