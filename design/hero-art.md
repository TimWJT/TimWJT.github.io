# Discovered interactions

The nav top starts stationary and upright. A press applies a damped wobble impulse. Four closely spaced presses knock it loose; isolated presses settle without accumulating indefinitely. Scroll and wheel movement never add energy or activate it.

Activation below the hero smoothly returns to the top (instant under reduced motion), waits for arrival, then launches from the nav position into the hero. Manual scrolling interrupts that return. The deployed top has randomized launch destination, restitution, spin direction, and fall direction, plus gravity, floor and side-wall collisions, friction, and a damped balance model. It renders in a fixed body-level layer above the navigation, while its world coordinates and lifetime remain confined to the hero. It returns to the dock when the hero leaves view. Escape docks it. Idle and settled states request no frames; hidden tabs pause simulation.

The squares retain drag, toss, keyboard, and scroll interactions. Visible hints, arrows, move icons, drag text, and tooltip instructions are removed. Screen-reader names and keyboard controls remain available.


## Directional controls and collisions

Pointer presses act immediately and push away from the impact point: left hits steer right, right hits steer left, and hits underneath produce high jumps. Keyboard arrows steer and Space jumps. The top overlay is repositioned on scroll even when asleep, and only the toy itself intercepts pointer input.

Each square registers a collider sampled from its SVG screen transform, including drag, spring rotation, responsive scale, and hero choreography. Circle-versus-convex-polygon contact resolution runs at physics substeps. Relative linear/angular velocity determines rebound, with opposite impulses and torque sent to the block springs. Dragged blocks act as kinematic bodies; reduced-motion blocks remain fixed collision surfaces. Registry subscriptions are cleaned up on unmount.
