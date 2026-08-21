/**
 * Lanavix website chat widget. Embed with:
 *   <script src="https://lanavix.com/lanavix-widget.js" data-business="YOUR_BUSINESS_ID" async></script>
 *
 * Plain, dependency-free JS on purpose - this file is loaded directly on a
 * contractor's own site, so it can't assume any bundler, framework, or
 * build step is available there. Talks to /api/public/web-chat/$business_id
 * on the same origin this script itself was loaded from, so it keeps
 * working unchanged across preview/staging deployments and production.
 */
(function () {
  "use strict";

  var thisScript = document.currentScript;
  if (!thisScript) return;

  var businessId = thisScript.getAttribute("data-business");
  if (!businessId) {
    console.error("[lanavix-widget] missing data-business attribute on the script tag");
    return;
  }

  var apiBase = new URL(thisScript.src).origin;
  var apiUrl = apiBase + "/api/public/web-chat/" + encodeURIComponent(businessId);

  var SESSION_KEY = "lanavix_wc_session";
  function getSessionId() {
    try {
      var existing = window.localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var fresh = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      window.localStorage.setItem(SESSION_KEY, fresh);
      return fresh;
    } catch (e) {
      // Storage blocked (private browsing, etc.) - fall back to an
      // in-memory id that lasts for this page view only.
      return "session-" + Math.random().toString(36).slice(2);
    }
  }
  var sessionId = getSessionId();

  var PRIMARY = "#6366f1";
  var PRIMARY_DARK = "#4f46e5";

  var style = document.createElement("style");
  style.textContent =
    ".lvx-wc-bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:" +
    PRIMARY +
    ";box-shadow:0 4px 16px rgba(0,0,0,.2);border:none;cursor:pointer;z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:transform .15s ease}" +
    ".lvx-wc-bubble:hover{transform:scale(1.05)}" +
    ".lvx-wc-panel{position:fixed;bottom:88px;right:20px;width:340px;max-width:calc(100vw - 40px);height:460px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
    ".lvx-wc-panel.lvx-wc-open{display:flex}" +
    ".lvx-wc-header{background:" +
    PRIMARY +
    ";color:#fff;padding:14px 16px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:space-between}" +
    ".lvx-wc-close{background:none;border:none;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0;opacity:.85}" +
    ".lvx-wc-close:hover{opacity:1}" +
    ".lvx-wc-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f9fafb}" +
    ".lvx-wc-msg{max-width:82%;padding:8px 12px;border-radius:14px;font-size:13px;line-height:1.4;white-space:pre-wrap;word-break:break-word}" +
    ".lvx-wc-msg-bot{background:#fff;border:1px solid #e5e7eb;color:#111827;align-self:flex-start;border-bottom-left-radius:4px}" +
    ".lvx-wc-msg-user{background:" +
    PRIMARY +
    ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px}" +
    ".lvx-wc-msg-error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;align-self:flex-start}" +
    ".lvx-wc-msg-system{background:none;border:none;color:#6b7280;align-self:center;font-size:12px;text-align:center;max-width:100%;padding:2px 8px}" +
    ".lvx-wc-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}" +
    ".lvx-wc-input{flex:1;border:1px solid #d1d5db;border-radius:10px;padding:8px 10px;font-size:13px;font-family:inherit;resize:none;outline:none}" +
    ".lvx-wc-input:focus{border-color:" +
    PRIMARY +
    "}" +
    ".lvx-wc-send{background:" +
    PRIMARY +
    ";color:#fff;border:none;border-radius:10px;padding:0 14px;font-size:13px;font-weight:600;cursor:pointer}" +
    ".lvx-wc-send:hover{background:" +
    PRIMARY_DARK +
    "}" +
    ".lvx-wc-send:disabled{opacity:.6;cursor:not-allowed}";
  document.head.appendChild(style);

  var bubble = document.createElement("button");
  bubble.className = "lvx-wc-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';

  var panel = document.createElement("div");
  panel.className = "lvx-wc-panel";
  panel.innerHTML =
    '<div class="lvx-wc-header"><span class="lvx-wc-title">Chat</span><button class="lvx-wc-close" aria-label="Close chat">\u00D7</button></div>' +
    '<div class="lvx-wc-messages"></div>' +
    '<form class="lvx-wc-form"><textarea class="lvx-wc-input" rows="1" maxlength="1000" placeholder="Type a message..." aria-label="Message"></textarea><button type="submit" class="lvx-wc-send">Send</button></form>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var titleEl = panel.querySelector(".lvx-wc-title");
  var closeBtn = panel.querySelector(".lvx-wc-close");
  var messagesEl = panel.querySelector(".lvx-wc-messages");
  var form = panel.querySelector(".lvx-wc-form");
  var input = panel.querySelector(".lvx-wc-input");
  var sendBtn = panel.querySelector(".lvx-wc-send");

  function addMessage(text, kind) {
    var el = document.createElement("div");
    var cls =
      kind === "user" ? "lvx-wc-msg-user" : kind === "error" ? "lvx-wc-msg-error" : kind === "system" ? "lvx-wc-msg-system" : "lvx-wc-msg-bot";
    el.className = "lvx-wc-msg " + cls;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  var greeted = false;
  function openPanel() {
    panel.classList.add("lvx-wc-open");
    bubble.setAttribute("aria-label", "Close chat");
    if (!greeted) {
      greeted = true;
      fetch(apiUrl, { method: "GET" })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data && data.businessName) titleEl.textContent = "Chat with " + data.businessName;
          addMessage((data && data.greeting) || "Hi! How can we help?", "bot");
        })
        .catch(function () {
          addMessage("Hi! How can we help?", "bot");
        });
    }
    input.focus();
  }
  function closePanel() {
    panel.classList.remove("lvx-wc-open");
    bubble.setAttribute("aria-label", "Open chat");
  }

  bubble.addEventListener("click", function () {
    if (panel.classList.contains("lvx-wc-open")) closePanel();
    else openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";
    input.style.height = "auto";
    sendBtn.disabled = true;

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId, message: text }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        // `pending` means a person now owns this conversation (human
        // takeover) - the message was received, but nothing automated
        // replied, so this renders as a neutral system note, never as a
        // reply bubble from the business.
        if (result.ok && result.data && result.data.pending) {
          addMessage(result.data.notice || "Message received.", "system");
        } else if (result.ok && result.data && result.data.reply) {
          addMessage(result.data.reply, "bot");
        } else {
          addMessage((result.data && result.data.error) || "Sorry, something went wrong. Please try again.", "error");
        }
      })
      .catch(function () {
        addMessage("Couldn't reach the chat right now. Please try again shortly.", "error");
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 90) + "px";
  });
})();
