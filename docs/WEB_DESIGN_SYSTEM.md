# Web design system

The site uses a restrained mathematical-editorial system: warm white and pale
blue surfaces, dark graphite text, one blue action color, system font stacks,
and a mono stack for formula/source excerpts. Glass is limited to navigation,
small metadata, and product controls; body copy remains on opaque, high-contrast
surfaces.

## Rules

- Use `--ls-*` tokens from `src/styles/tokens.css`; do not introduce neon or
  rainbow gradients.
- Buttons use 10–12px radii, panels 16–20px, and the product stage 20–24px.
- Motion is opacity/transform only and is disabled under reduced-motion.
- Images have intrinsic dimensions; only the primary workspace visual is eager.
- Every interactive item has a visible focus indicator and a 44px touch target.
