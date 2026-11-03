# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `control.EntityGizmo` - the on-map transform gizmo as a standalone public control, usable
  without the entity properties dialog:
  - `tools: "translate" | "full"` picks move axes and planes only, or adds rotation rings;
    independent of the existing `editMode: "native" | "yaw"` rotation mode, which is now
    readable and writable on the control as well
  - `autoSelect: false` leaves the selection entirely to the host application
  - `selectEntity`, `unselectEntity`, `getSelectedEntity`, `isTransforming`,
    `getActiveTransform`, `cancelTransform`
  - `transformstart`, `transformchange`, `transformend` and `transformcancel` events; one drag
    emits exactly one start and exactly one end or cancel
  - a cancelled gesture is rolled back by the gizmo itself (`pointercancel`, window blur,
    deactivation, selection change, `cancelTransform()`); the control binds no keyboard shortcut,
    a host application cancels from its own UI through `cancelTransform()`
  - `sandbox/entityGizmo` sample
- Image, video and texture sources for `Projector`:
  - `image` (image, canvas, `ImageBitmap`, `VideoFrame`), `video` (`HTMLVideoElement`) and `texture`
    (`WebGLTexture`) params; when several are given, the last declared one is used
  - `projector.source` to assign, replace or clear the source at runtime; assigning the same source
    again uploads its new pixels, e.g. after drawing on a canvas
  - `projector.sourceEnabled` to show only the projector color while keeping the source assigned
- Community governance and maintenance documents:
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - `STYLEGUIDE.md`
- GitHub contribution templates:
  - issue forms for bugs and feature requests
  - pull request template
- Prettier workflow support:
  - `format` and `format:check` npm scripts
  - `.prettierignore`

### Changed

- The gizmo mechanism moved from `src/control/entityEditor` to `src/control/entityGizmo`;
  `EntityEditorScene` is now `EntityGizmoScene` and `control.EntityEditor` extends
  `control.EntityGizmo`, so the editor dialog, selection, moving and rotating behave as before.
- The gizmo no longer leaves the axis track layer, renderer handlers or a suspended navigation
  control behind when it is deactivated, and it restores navigation to its previous state
  instead of unconditionally activating it.
- Projector `color` render mode covers the surface like a decal instead of adding its color to it:
  opacity 1 shows the projector color or source as is, and black is rendered black. The `light`
  mode is unchanged. Overlapping projectors are stacked by `priority`, the higher one on top.
- `CONTRIBUTING.md` synchronized with current project scripts and PR flow.
- Bug report form simplified for faster issue creation and optional sandbox URL.

### Removed

- `Projector` `sourceType` param and the `ProjectorSourceType` type; the source kind is now taken
  from the `image`, `video` or `texture` param. `ProjectorSource` and `ProjectorSourceKind` types
  are exported instead.

## [0.28.6] - 2026-02-23

### Changed

- Baseline release state recorded when changelog tracking was introduced.
