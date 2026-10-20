---
name: input-lifecycle
description: Use for touch, keyboard, visibility, rotation, pause, restart, mute and storage-state work.
---

# Input Lifecycle

Read the approved brief and state contract. Add failing transition tests first. Treat touch/pointer cancel and key release as explicit states. Do not capture game keys while unrelated inputs are focused. Prevent scrolling only in the active interaction region. Pause actual simulation on visibility loss/resize and require explicit resume. Preserve state when restart confirmation is canceled. Reset cleanly after win/loss. Start optional audio only after user interaction; handle rejected audio and unavailable storage. Validate repeat cycles for duplicate loops/listeners. Distinguish real touch-device evidence from emulated viewport screenshots.
