# elm-xhr-bytes-bridge

Transfer `Bytes` between Elm and JavaScript without JSON encoding.

Elm has no built-in way to pass raw binary data through ports. This package works around that limitation by monkeypatching `XMLHttpRequest` so that `Http.request` calls targeting a special `xbb.localhost` URL never hit the network — they are intercepted and dispatched to handler functions you register on the JS side.

## How it works

1. **JS** — call `install()` to monkeypatch XHR, then `handle(route, callback)` to register routes.
2. **Elm** — use `XhrBytesBridge.routeUrl` to build a URL, then make a normal `Http.request` with `Http.bytesBody` / `Http.expectBytesResponse`.
3. The monkeypatch intercepts the request, looks up the route, and calls your JS handler with the raw body. The handler calls `resolve(status, responseBody)` to complete the XHR lifecycle.

No data leaves the browser. The fake URL (`https://xbb.localhost/.xhrhook/…`) is caught before any network call is made.

## Elm API

```elm
import XhrBytesBridge

-- The URL prefix: "https://xbb.localhost/.xhrhook"
XhrBytesBridge.prefix

-- Build a route URL:
XhrBytesBridge.routeUrl "my-namespace" "some-key"
--> "https://xbb.localhost/.xhrhook/my-namespace/some-key"
```

Then use the URL in a standard `Http.request`. The bridge itself has no dependency on `elm/http` or `elm/bytes` — you bring your own.

## JS API

```js
import * as bridge from "elm-xhr-bytes-bridge/js/xhr-bytes-bridge.js";

// Install the XHR monkeypatch (idempotent)
bridge.install();

// Register a route handler
bridge.handle("my-namespace/some-key", (req, resolve) => {
  // req = { method, url, headers, body }
  // body is the raw value passed to XHR send() (e.g. DataView from Elm's Bytes)
  doSomethingWith(req.body);
  resolve(200, new ArrayBuffer(0));
});

// Unregister when done
bridge.unhandle("my-namespace/some-key");
```

## Example: elm-websocket-manager

[elm-websocket-manager](https://github.com/mpizenberg/elm-websocket-manager) uses this bridge to send and receive binary WebSocket frames:

```js
import * as bridge from "elm-xhr-bytes-bridge/js/xhr-bytes-bridge.js";

bridge.install();
bridge.handle("ws-send/" + encodedId, (req, resolve) => {
  ws.send(req.body);
  resolve(200, new ArrayBuffer(0));
});
```

```elm
sendUrl =
    XhrBytesBridge.routeUrl "ws-send" wsUrl
```
