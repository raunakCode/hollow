# HOLLOW

An atmospheric puzzle-platformer inspired by INSIDE. Built with vanilla JavaScript and canvas.

## Play

Open `index.html` in your browser — no build step needed. All audio is synthesized, all art is procedural.

## Design Philosophy

- Atmosphere over everything
- Minimal UI chrome
- Let players discover through play, not tutorials

## Development

- Plain `<script>` tags, no modules
- Load order matters: util → audio → player → entities → render → levels → game
- See `dev/DESIGN.md` for mechanics and level design
- See `dev/ARCHITECTURE.md` for API documentation
