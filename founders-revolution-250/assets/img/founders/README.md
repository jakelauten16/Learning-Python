# Founder portraits

`bruce.jpg` and `allen.jpg` are in place — pulled from the published headshots on
foundersrevolution250.com/bourbon, cropped square on the face, resized to 640px
and stripped of EXIF.

**To replace either one, just drop the file in. There is no markup to edit.**

| File | Founder |
| --- | --- |
| `bruce.jpg` | Dr. Bruce Lautenschlager |
| `allen.jpg` | Allen Hayne |

Each slot on `founders.html` already contains an `<img>` pointing at these
paths, sitting over the founder's initials. When the file exists the photograph
covers the initials; when it does not, `site.js` removes the broken `<img>` and
the initials show instead — no broken-image glyph, and nothing to change either
way. `.png` works too; rename the `src` in `founders.html` if you use it.

## What to supply

**The original rectangular photograph, not a pre-cropped circle.** The frame is
a circle and the image is fitted with `object-fit: cover`, so the site does the
cropping. Handing it a circle already cut out of a dark square gives you a
circle inside a circle, with a ring of that square's background around it.

Roughly square, centred on the face, is ideal — but any shape works, and larger
than 520px on the short edge means it stays sharp on a retina screen.
