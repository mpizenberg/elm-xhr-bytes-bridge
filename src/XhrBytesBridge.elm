module XhrBytesBridge exposing (prefix, routeUrl)

{-| XHR monkeypatch bridge for transferring Bytes between Elm and JS
without JSON encoding. Consumers use `routeUrl` to build URLs for
`Http.request` calls that are intercepted by the companion JS module.

@docs prefix, routeUrl

-}

import Url


{-| The URL prefix used by the XHR monkeypatch to intercept requests.
-}
prefix : String
prefix =
    -- "xbb" stands for "xhr-bytes-bridge"
    "https://xbb.localhost/.xhrhook"


{-| Build a route URL for the XHR bridge.

    routeUrl "ws-send" "ws://example.com/chat"
    --> "https://xbb.localhost/.xhrhook/ws-send/ws%3A%2F%2Fexample.com%2Fchat"

-}
routeUrl : String -> String -> String
routeUrl namespace key =
    prefix ++ "/" ++ namespace ++ "/" ++ Url.percentEncode key
