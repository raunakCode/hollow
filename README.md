# HOLLOW

An atmospheric puzzle-platformer inspired by INSIDE. Built with vanilla JavaScript and canvas.

## Play

Run `python3 -m http.server` in this directory and open `http://localhost:8000` —
no build step needed. All art is procedural.

You can also open `index.html` directly (`file://`), but recorded audio
samples won't load over `file://` (browsers block `fetch` there), so those
sounds will fall back to their synthesized versions.

## Design Philosophy

- Atmosphere over everything
- Minimal UI chrome
- Let players discover through play, not tutorials

## Development

- Plain `<script>` tags, no modules
- Load order matters: util → audio → player → entities → render → levels → game
- See `dev/DESIGN.md` for mechanics and level design
- See `dev/ARCHITECTURE.md` for API documentation
