# Partner logos

Drop the supplied artwork here (PNG or SVG, any size), then point the card at it
in `partnerships.html`:

```html
<div class="partner__mark">
  <img src="assets/img/partners/sar.png" alt="Sons of the American Revolution">
</div>
```

replacing the `<span>` stand-in that is there now.

The box is a fixed 5:3 and the image is fitted with `object-fit: contain`, so a
tall crest and a wide wordmark both sit correctly inside it and neither is ever
stretched to fill. Nothing needs cropping or resizing first.

Expected, from the current site:

| File | Partner |
| --- | --- |
| `tp-hooper.png` | T&P Hooper |
| `deer-ridge.png` | Deer Ridge Woodcraft LLC |
| `sar.png` | Sons of the American Revolution Foundation |
| `dar.png` | Daughters of the American Revolution |
| `responder-bourbon.png` | Responder Bourbon |
| `project-never-broken.png` | Project Never Broken |
