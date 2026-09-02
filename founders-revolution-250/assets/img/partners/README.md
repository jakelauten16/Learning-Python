# Partner logos

**Just drop the file in. There is no markup to edit.**

| File | Partner |
| --- | --- |
| `tp-hooper.png` | T&P Hooper |
| `deer-ridge.png` | Deer Ridge Woodcraft LLC |
| `sar.png` | Sons of the American Revolution Foundation |
| `dar.png` | Daughters of the American Revolution |
| `responder-bourbon.png` | Responder Bourbon |

Each card on `partnerships.html` already contains an `<img>` pointing at these
paths, behind which sits the partner's name set in type. When the file exists
the logo replaces the name; when it does not, `site.js` removes the broken
`<img>` and the name shows instead.

## What to supply

Whatever you have — the box does the work. It is a fixed 5:3 and the image is
fitted with `object-fit: contain`, so a tall crest and a wide wordmark both sit
correctly inside it and **neither is ever stretched**, which is what was going
wrong on the old site. No cropping or resizing needed first.

A transparent PNG or an SVG looks best against the cream panel. Project Never
Broken and the Vigo County History Center are named in type on the page rather
than shown as marks; add a slot for them the same way if you get the artwork.
