module Main exposing (main)

import Browser
import Bytes exposing (Bytes)
import Bytes.Decode as BD
import Bytes.Encode as BE
import Html exposing (..)
import Html.Events exposing (onClick)
import Http
import XhrBytesBridge


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = \_ -> Sub.none
        , view = view
        }



-- MODEL


type alias Model =
    { status : String }


init : () -> ( Model, Cmd Msg )
init _ =
    ( { status = "Click the button to send bytes through the bridge." }
    , Cmd.none
    )



-- UPDATE


type Msg
    = SendBytes
    | GotResponse (Result String String)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        SendBytes ->
            let
                bytes =
                    BE.encode (BE.string "Hello from Elm!")
            in
            ( { model | status = "Sending..." }
            , Http.request
                { method = "POST"
                , headers = []
                , url = XhrBytesBridge.routeUrl "echo" "test"
                , body = Http.bytesBody "application/octet-stream" bytes
                , expect = Http.expectBytesResponse GotResponse handleResponse
                , timeout = Nothing
                , tracker = Nothing
                }
            )

        GotResponse (Ok text) ->
            ( { model | status = "Echoed back: " ++ text }, Cmd.none )

        GotResponse (Err err) ->
            ( { model | status = "Error: " ++ err }, Cmd.none )


handleResponse : Http.Response Bytes -> Result String String
handleResponse response =
    case response of
        Http.GoodStatus_ _ body ->
            BD.decode (BD.string (Bytes.width body)) body
                |> Result.fromMaybe "Failed to decode response bytes"

        Http.BadStatus_ metadata _ ->
            Err ("Bad status: " ++ String.fromInt metadata.statusCode)

        _ ->
            Err "Request failed"



-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ h1 [] [ text "elm-xhr-bytes-bridge example" ]
        , button [ onClick SendBytes ] [ text "Send Bytes" ]
        , p [] [ text model.status ]
        ]
