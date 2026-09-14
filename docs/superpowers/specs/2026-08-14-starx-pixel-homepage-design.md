# StarX Pixel Homepage Design

## Scope

Rework the default public homepage into a StarX pixel-terminal experience and
update the product-facing default brand assets. Preserve existing authentication,
navigation, custom homepage content, dynamic system branding, and all protected
project/author metadata.

## Visual Direction

- Near-black canvas with a restrained green terminal accent and acid-yellow
  action highlight.
- Letter Glitch-style character field behind the public homepage, implemented
  locally so the page does not depend on a remote animation runtime.
- Depth Text-style layered title treatment for `STARX` and `API GATEWAY` using
  offset shadow planes and a pixel-friendly monospace display stack.
- Public header remains functional but becomes a compact pixel-terminal bar:
  logo, public navigation, locale/theme controls, auth action, and mobile menu.
- Hero uses an asymmetric two-column layout: brand/message on the left and the
  existing API terminal demo on the right.
- Existing stats, feature, how-it-works, CTA, and footer sections keep their
  business links/content but receive the same visual language.

## Brand Boundary

- Use the supplied source image when available and copy it into the default
  frontend public assets as the StarX logo.
- Set the static browser title/meta and favicon defaults to StarX while keeping
  runtime system-name/logo overrides working.
- Do not remove or rewrite protected internal project identity, license,
  attribution, package, or backend metadata required by `AGENTS.md`.

## Motion

- Use the project's existing CSS animation layer for the character field and
  depth layers to avoid adding an unnecessary dependency.
- Animate only opacity, transform, and text-shadow-like visual layers.
- Respect `prefers-reduced-motion`; static character field and readable title
  remain available when motion is reduced.

## Error And Loading States

- Keep the current home content loading state and custom URL/HTML/Markdown
  branches unchanged.
- The default StarX homepage renders only after the existing content hook has
  resolved, so a failed custom-content request keeps its current fallback
  behavior.
- Logo failures use the current `HeaderLogo`/system-brand fallback path.

## Verification

- `bun run typecheck`
- `bun run lint` for changed frontend files
- `bun run format:check`
- `bun run build`
- Browser smoke check at desktop and mobile widths: title, logo/favicon,
  navigation, auth CTA, terminal panel, reduced-motion CSS, and no horizontal
  overflow.
