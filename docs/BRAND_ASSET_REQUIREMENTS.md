# Snipper娘 Hero asset requirements

The landing page uses a character layer matching the approved third Hero
composition. The current asset was deterministically keyed from the supplied
green-screen artwork without generative redrawing.

Required project files:

- `public/assets/brand/snipper-girl.webp`
- `public/assets/brand/snipper-girl-640.webp`
- `public/assets/brand/snipper-girl-960.webp`

Requirements:

- transparent background and no poster copy, feature panel, window scenery, or
  other baked-in layout graphics;
- original character artwork rather than the AI-redrawn figure from the visual
  reference;
- the complete head, writing hand, pen, tablet, sleeves, and intended lower-body
  crop must be present;
- WebP with alpha, ideally 200–450 KB and no larger than 600 KB per file;
- keep `mascot.enabled` in `src/components/LandingPage.jsx` enabled only while
  desktop, tablet, and mobile visual QA passes.

The earlier poster and checkerboard versions remain unsuitable as source assets:
the poster has layout graphics composited over the character, while the
checkerboard version does not contain a real alpha channel. Use the green-screen
source for future deterministic exports.
