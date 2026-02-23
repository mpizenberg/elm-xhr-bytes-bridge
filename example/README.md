# Example

Minimal echo demo: Elm sends bytes through the bridge, JS echoes them back.

## Run

**From the repository root** (otherwise the static server will forbid the parent ".." loading path):

```sh
cd example && elm make src/Main.elm --output=elm.js && cd ..
python -m http.server
```

Then open http://localhost:8000/example/
