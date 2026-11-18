# A realistic background: design

Date: 2026-11-18. Agreed with the owner in chat. A small change: short design.

## Why

The owner says the main screen and backgrounds "look fake" and wants the design to look more realistic, starting with the background. Today `src/app/15-torch.js` draws a 3D corridor out of flat-shaded blocks on a canvas (`#bgScene`), with braziers, cobwebs and drips. Flat blocks read as cartoonish: real stone has texture, grime and soft shadow, which code drawing can't easily fake.

## Goals

- Replace the drawn corridor with a **photo-realistic dungeon corridor picture**: rough wet stone, iron wall sconces, a dark passage fading into the distance, tinted to the app's cool blue and amber palette.
- **Two pictures:** a wide one (laptops, TVs) and a tall one (phones), so phones get a composed scene, not a bad crop, and a smaller download.
- **Live torchlight stays:** the existing animated flames (`Flame`) and a flickering glow are drawn on the sconces in the picture, so the torches burn. Each picture records where its torches are (as fractions of the picture), and the flames follow the picture's cover-crop and scaling.
- **Reduced motion:** the still picture only.
- The pictures are **fingerprinted and cached** like the code and data (`tools/build.mjs`, `src/sw.js`), so they download once and work offline.
- A **What's new** entry.

## Non-goals

- The panels, buttons, header and the rest of the main screen. Those are the next piece of work.
- The header's two title torches. They don't change.
- The maps (Dungeon, World, region). They don't change.

## Anti-goals

- A slower page. The picture must not hold up the first paint; the page shows the current dark background colour until the picture arrives.
- Something that looks worse on phones than now.

## Approaches

- **A. A real picture with live torchlight on top (picked by the owner).** Most realistic, lighter on phones than drawing the scene, and the look can be changed later by swapping the picture.
- **B. Photo textures on the drawn corridor.** More realistic than now, but not photo-like, and slower on phones.
- **C. Better drawing code only (noise, grime, shadows).** Cheapest, but still looks drawn.

## Decided

- The pictures are made with the ManyMotions image connector. The prompt and settings are shown to the owner first; credits are spent only when the owner says go. The owner picks the result.
- The drawn corridor, its braziers, cobwebs and drips are removed. The flame code is kept.

## Left to the builder

- Picture format and size (aim: WebP, about 200 KB wide, less for tall), and where the source pictures live in `src/`.
- How the build copies and fingerprints images, and how the service worker lists them.
- Where the torch positions are stored, and how the glow flickers.
- Keeping the 30 frames a second cap (20 on phones) and pausing when the tab is hidden.
- Tests: the backdrop picture loads, is fingerprinted and cached offline, the flames sit on the torches at laptop and phone sizes, and reduced motion draws no animation.
