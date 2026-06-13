/**
 * Tool iframe'ine enjekte edilecek IIFE.
 * - `window.meaprojects` API'sini kurar.
 * - postMessage üzerinden parent'a istek atar.
 * - Parent yanıtladığında promise resolve eder.
 *
 * Bu dosya STRING olarak dışa açılır; bağımsız bir bundler süreci yok.
 * Tool runner sayfası bunu <script> olarak iframe'e gönderir (srcdoc patch).
 */

export interface BridgeBootstrapOptions {
  toolSlug: string;
  parentOrigin: string;
  theme: "light" | "dark";
  locale: string;
  user: { id: string; name: string };
  /** Opt-in (manifest `"ui": "mea"`): inject the mea-ui design layer + theme sync.
   *  When false/omitted the panel injects ONLY the bridge and never touches the
   *  tool's markup, styles, or <html data-theme> — the tool's design is left alone. */
  ui?: boolean;
}

export function buildBridgeScript(opts: BridgeBootstrapOptions): string {
  // Sadece veri enjekte ediyoruz; JSON.stringify XSS güvenli.
  const ctx = JSON.stringify(opts);
  return `;(function(){
  var CTX = ${ctx};
  var PARENT = window.parent;
  var REQ_ID = 0;
  var pending = Object.create(null);
  var eventListeners = Object.create(null);

  function nextId(){ REQ_ID++; return "r_" + Date.now() + "_" + REQ_ID; }

  function request(channel, payload){
    return new Promise(function(resolve, reject){
      var id = nextId();
      var timer = setTimeout(function(){
        if (pending[id]) {
          delete pending[id];
          reject(new Error("Bridge zaman aşımı: '" + channel + "' yanıt vermedi (120 sn)."));
        }
      }, 120000);
      pending[id] = { resolve: resolve, reject: reject, timer: timer };
      PARENT.postMessage({ __meaprojects__: true, kind: "request", id: id, channel: channel, payload: payload }, CTX.parentOrigin);
    });
  }

  function streamRequest(channel, payload, onChunk){
    return new Promise(function(resolve, reject){
      var id = nextId();
      var timer = setTimeout(function(){
        if (pending[id]) {
          delete pending[id];
          reject(new Error("Bridge zaman aşımı: '" + channel + "' yanıt vermedi (120 sn)."));
        }
      }, 120000);
      pending[id] = { resolve: resolve, reject: reject, timer: timer, onChunk: onChunk || null };
      PARENT.postMessage({ __meaprojects__: true, kind: "request", id: id, channel: channel, payload: payload }, CTX.parentOrigin);
    });
  }

  function applyTheme(theme){
    try {
      document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    } catch (_e) {}
  }
  // Only touch the tool's <html data-theme> when it opted into mea-ui. Otherwise
  // we never modify the tool's design.
  if (CTX.ui) {
    applyTheme(CTX.theme);
    if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", function(){ applyTheme(CTX.theme); });
    }
  }

  function sendReady(){
    PARENT.postMessage({ __meaprojects__: true, kind: "ready", toolSlug: CTX.toolSlug }, CTX.parentOrigin);
  }

  window.addEventListener("message", function(e){
    if (!e.data || e.data.__meaprojects__ !== true) return;
    if (e.origin !== CTX.parentOrigin) return;
    var msg = e.data;
    if (msg.kind === "host-ready") {
      // Parent listener'i baglandi; ilk ready kacmis olabilir, tekrar yolla.
      sendReady();
      return;
    }
    if (msg.kind === "stream-chunk" && pending[msg.id]) {
      try { if (pending[msg.id].onChunk) pending[msg.id].onChunk(msg.chunk); } catch (_e) {}
      return;
    }
    if (msg.kind === "response" && pending[msg.id]) {
      var h = pending[msg.id];
      delete pending[msg.id];
      if (h.timer) clearTimeout(h.timer);
      if (msg.ok) h.resolve(msg.result);
      else h.reject(new Error(msg.error || "Bridge hatası"));
    } else if (msg.kind === "event") {
      // Built-in: keep the design tokens in sync with the panel theme.
      if (msg.name === "theme" && msg.payload && msg.payload.theme) {
        if (CTX.ui) applyTheme(msg.payload.theme);
        if (window.meaprojects && window.meaprojects.context) window.meaprojects.context.theme = msg.payload.theme;
      }
      var handlers = eventListeners[msg.name] || [];
      for (var i = 0; i < handlers.length; i++) {
        try { handlers[i](msg.payload); } catch (_e) {}
      }
    }
  });

  window.meaprojects = {
    llm: {
      complete: function(args){ return request("llm.complete", args); },
      stream: function(args, onChunk){
        return streamRequest("llm.stream", args, typeof onChunk === "function" ? onChunk : null);
      }
    },
    storage: {
      get:    function(key){ return request("storage.get", { key: key }); },
      set:    function(key, value){ return request("storage.set", { key: key, value: value }); },
      delete: function(key){ return request("storage.delete", { key: key }); },
      list:   function(prefix){ return request("storage.list", { prefix: prefix || "" }); }
    },
    events: {
      emit: function(name, payload){
        PARENT.postMessage({ __meaprojects__: true, kind: "event-emit", name: name, payload: payload }, CTX.parentOrigin);
      },
      on: function(name, handler){
        eventListeners[name] = eventListeners[name] || [];
        eventListeners[name].push(handler);
      },
      off: function(name, handler){
        if (!eventListeners[name]) return;
        eventListeners[name] = eventListeners[name].filter(function(h){ return h !== handler; });
      }
    },
    context: {
      toolSlug: CTX.toolSlug,
      theme: CTX.theme,
      locale: CTX.locale,
      user: CTX.user
    },
    ui: {
      toast: function(args){
        PARENT.postMessage({ __meaprojects__: true, kind: "ui.toast", payload: args }, CTX.parentOrigin);
      },
      confirm: function(args){ return request("ui.confirm", args); }
    },
    jobs: {
      register: function(name, opts){ return request("jobs.register", Object.assign({ name: name }, opts)); },
      cancel:   function(name){ return request("jobs.cancel",   { name: name }); },
      pause:    function(name){ return request("jobs.pause",    { name: name }); },
      resume:   function(name){ return request("jobs.resume",   { name: name }); },
      list:     function(){     return request("jobs.list",     {}); }
    },
    notifications: {
      poll: function(since){ return request("notifications.poll", { since: since || null }); },
      connect: function(callback, intervalMs){
        var ms = intervalMs || 3000;
        var lastSince = new Date().toISOString();
        var active = true;
        var tick = function(){
          if (!active) return;
          window.meaprojects.notifications.poll(lastSince).then(function(msgs){
            lastSince = new Date().toISOString();
            if (Array.isArray(msgs)) msgs.forEach(callback);
          }).catch(function(){});
          if (active) setTimeout(tick, ms);
        };
        setTimeout(tick, ms);
        return function(){ active = false; };
      }
    }
  };

  // Bridge hazir oldugunda parent'a bildir. Parent listener'i henuz bagli
  // degilse bu kacabilir; parent mount olunca host-ready yollar, biz de
  // yukaridaki handler'da ready'yi tekrar gondeririz (iki yonlu el sikisma).
  sendReady();
})();`;
}

/**
 * mea-ui design layer injected into every tool.
 *
 * - Anta Trial font (served from the panel origin at /fonts/…)
 * - The panel's semantic design tokens as CSS variables (--bg, --text, …)
 *   for both light and dark, switched via [data-theme] on <html>.
 * - Gentle, overridable base styles so a tool that does nothing still looks
 *   on-brand, while a tool with its own CSS keeps full control.
 */
export function buildDesignTokensStyle(): string {
  return `<style data-meaprojects-ui>
@font-face{font-family:"Anta Trial";src:url("/fonts/AntaTrial-Light.ttf") format("truetype");font-weight:100 300;font-display:swap}
@font-face{font-family:"Anta Trial";src:url("/fonts/AntaTrial-Book.ttf") format("truetype");font-weight:400 900;font-display:swap}
:root{
  --bg:#f0efef;--bg-elevated:#fafafa;--surface:#ffffff;
  --border:#ebebeb;--text:#080808;--text-muted:#6b6b6b;
  --accent:#080808;--danger:#b83232;--success:#3d7a56;--warning:#a07830;
  --radius:12px;--radius-sm:8px;
  --mea-font:"Anta Trial",system-ui,-apple-system,"Segoe UI",sans-serif;
}
:root[data-theme="dark"]{
  --bg:#0d0d0d;--bg-elevated:#111111;--surface:#181818;
  --border:#252525;--text:#f0f0f0;--text-muted:#666666;
  --accent:#f0f0f0;
}
*,*::before,*::after{box-sizing:border-box}
html{color-scheme:light}
html[data-theme="dark"]{color-scheme:dark}
body{
  margin:0;
  font-family:var(--mea-font);
  background:var(--bg);
  color:var(--text);
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
}
/* opt-in helpers tools can use */
.mea-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}
.mea-btn{
  display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 24px;
  border:none;border-radius:var(--radius);cursor:pointer;
  font-family:var(--mea-font);font-size:14px;font-weight:500;
  background:var(--accent);color:var(--bg);transition:opacity .15s ease;
}
.mea-btn:hover{opacity:.85}
.mea-input{
  height:44px;padding:0 14px;border:1px solid var(--border);border-radius:var(--radius);
  background:var(--surface);color:var(--text);font-family:var(--mea-font);font-size:14px;
}
.mea-input:focus{outline:none;border-color:var(--text-muted)}
</style>`;
}

/**
 * Injects the mea-ui style layer + the bridge script into a tool's index.html.
 * Style goes first so tokens/fonts are available before the tool's own CSS,
 * which can still override everything (no !important is used).
 */
export function injectBridgeIntoHtml(html: string, opts: BridgeBootstrapOptions): string {
  const design = opts.ui ? `${buildDesignTokensStyle()}\n` : "";
  const head = `${design}<script data-meaprojects-bridge>${buildBridgeScript(opts)}</script>`;
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>\n${head}\n`);
  }
  if (html.includes("<html>")) {
    return html.replace("<html>", `<html><head>${head}</head>`);
  }
  return head + html;
}
