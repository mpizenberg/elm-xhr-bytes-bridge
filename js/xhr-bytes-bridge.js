// elm-xhr-bytes-bridge: XHR monkeypatch for transferring Bytes between Elm and JS.
// Intercepts XHR calls to a fake .localhost URL and dispatches to registered handlers.
// "xbb" stands for "xhr-bytes-bridge"

const XHR_PREFIX = "https://xbb.localhost/.xhrhook";
const xhrHandlers = {};

/**
 * Install the XHR monkeypatch. Idempotent — safe to call multiple times.
 */
export function install() {
  if (XMLHttpRequest.prototype._xhrBytesBridgePatched) return;
  XMLHttpRequest.prototype._xhrBytesBridgePatched = true;

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const origAbort = XMLHttpRequest.prototype.abort;

  // -- open: intercept XHR_PREFIX URLs, skip native open --
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === "string" && url.startsWith(XHR_PREFIX)) {
      this._xhrBridge = {
        url,
        method,
        headers: {},
        aborted: false,
      };
      // Override responseType on this instance since we skip native open()
      // (native responseType getter behavior varies in UNSENT state)
      let storedResponseType = "";
      Object.defineProperty(this, "responseType", {
        get() {
          return storedResponseType;
        },
        set(v) {
          storedResponseType = v;
        },
        configurable: true,
      });
    } else {
      origOpen.apply(this, arguments);
    }
  };

  // -- setRequestHeader: store if intercepted, pass through otherwise --
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this._xhrBridge) {
      this._xhrBridge.headers[name] = value;
    } else {
      origSetRequestHeader.apply(this, arguments);
    }
  };

  // -- send: dispatch to handler if intercepted --
  XMLHttpRequest.prototype.send = function (body) {
    if (!this._xhrBridge) {
      origSend.apply(this, arguments);
      return;
    }
    const xhr = this;
    const meta = this._xhrBridge;
    // Route = everything after XHR_PREFIX + "/"
    const route = meta.url.slice(XHR_PREFIX.length + 1);
    const handler = xhrHandlers[route];
    if (!handler) {
      console.error("[xhr-bytes-bridge] No XHR handler for route:", route);
      return;
    }
    handler(
      { method: meta.method, url: meta.url, headers: meta.headers, body },
      function resolve(status, responseBody) {
        if (meta.aborted) return;
        fabricateResponse(xhr, status, responseBody);
      },
    );
  };

  // -- abort: flag as aborted if intercepted --
  XMLHttpRequest.prototype.abort = function () {
    if (this._xhrBridge) {
      this._xhrBridge.aborted = true;
    } else {
      origAbort.apply(this, arguments);
    }
  };
}

// Fabricate a complete XHR response on an intercepted instance.
// Uses Object.defineProperty because the XHR never went through
// native open(), so its built-in properties are in UNSENT state.
function fabricateResponse(xhr, status, responseBody) {
  Object.defineProperty(xhr, "status", {
    get: () => status,
    configurable: true,
  });
  Object.defineProperty(xhr, "statusText", {
    get: () => (status === 200 ? "OK" : ""),
    configurable: true,
  });
  Object.defineProperty(xhr, "responseURL", {
    get: () => xhr._xhrBridge.url,
    configurable: true,
  });
  Object.defineProperty(xhr, "response", {
    get: () => responseBody,
    configurable: true,
  });
  Object.defineProperty(xhr, "readyState", {
    get: () => 4,
    configurable: true,
  });
  xhr.getAllResponseHeaders = () => "";

  // Async dispatch to match the XHR contract (load event is never synchronous)
  setTimeout(() => {
    if (xhr._xhrBridge.aborted) return;
    xhr.dispatchEvent(new Event("load"));
  }, 0);
}

/**
 * Register a route handler. When an intercepted XHR matches `route`,
 * the handler is called with (request, resolve).
 */
export function handle(route, handler) {
  xhrHandlers[route] = handler;
}

/**
 * Unregister a route handler.
 */
export function unhandle(route) {
  delete xhrHandlers[route];
}
