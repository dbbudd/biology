# ScrollyTale UI Rebuild Plan

This is the live-app chrome job only. The molecule-to-mastery experience is documented separately in `SCROLLYTALE-KNOWLEDGE-VISION.md` (same folder, 2026-11-09). Do not fold that prototype into these four components.

## Goal
Modern, dynamic, intuitive shell without changing the reader contract.

## Targets
- Toolbar.tsx
- SiteMenu.tsx
- DepthPanel.tsx
- ReadingBar.tsx

## Constraints
- CSS tokens only
- No hardcoded hex/rgb
- Segoe UI only
- WCAG 4.5:1 minimum contrast
- Backward compatible reader embeds
- Preserve bio_theme integration
- Preserve asset version contract

## UX Direction
### Toolbar
- Command-bar feel
- Strong page identity
- Faster navigation
- Clear active state
- Better mobile behavior

### Site Menu
- Knowledge-map navigation
- Strong hierarchy
- Unit grouping
- Progress visibility
- Better scanning

### Depth Panel
- Context-aware companion panel
- Cleaner information architecture
- Progressive disclosure
- Reduced visual noise

### Reading Bar
- Rich progress indicator
- Chapter position + journey position
- Better affordance for navigation

## Verification
- Light theme
- Sepia theme
- Dark theme
- Embed mode
- Keyboard navigation
- Reduced motion
