# Snipper娘 Hero asset requirements

The landing page reserves a character layer matching the approved third Hero
composition, but it stays disabled until a clean original asset is available.

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
- enable `mascot.enabled` in `src/components/LandingPage.jsx` only after desktop,
  tablet, and mobile visual QA passes.

The supplied poster cannot produce this asset through lossless extraction because
marketing copy and a feature panel are composited directly over the character.
