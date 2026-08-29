#!/usr/bin/env python3
"""
Cut the scroll film: turn the two source clips into one frame sequence.

The hero is not a playing video. It is a few hundred stills painted onto a
<canvas>, with the frame chosen by how far down the track you have scrolled.
Scrubbing a real <video> by writing currentTime is jittery on most phones and
flatly unreliable on iOS; drawing decoded images is neither, and it means the
whiskey stops dead when the scroll does.

The camera move is BAKED IN rather than done at runtime. Each shot below names a
source, a time range, how densely to sample it, and a zoom/centre pair; this
script crops and rescales every frame accordingly. So the push from the two men
down into the bottle and out the other side into the pour is real footage
re-framed, not a CSS transform over a static picture — which means it costs the
page nothing and cannot drift out of sync with the scroll.

Sampling is deliberately uneven. The pour is kept at the source's full 24fps
while the near-static wide shots are thinned out. Scroll distance is spent per
*frame*, not per second, so that alone gives the pour the largest share of the
track at a fraction of the bytes.

    python3 tools/build-frames.py
"""
import json, math, os, shutil, subprocess, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.dirname(HERE)
MEDIA  = os.path.join(ROOT, "assets", "media")
FRAMES = os.path.join(MEDIA, "frames")

CAMP = os.path.join(MEDIA, "camp.mp4")    # the two men, then their pour
POUR = os.path.join(MEDIA, "pour.mp4")    # the original clip — used for its clean tail

SRC_FPS  = 24.0
WIDTHS   = [1280, 720]
QUALITY  = {1280: 76, 720: 72}

# Colour: the tavern is lit like a tavern. Warming the lows, cooling the
# highlights and closing the vignette down pushes it towards firelight, so the
# two of them read as sitting at a fire rather than standing at a bar. The
# flicker, embers and haze are added over the top at runtime by pour.js.
FIRE  = ("colorbalance=rs=.07:gs=.01:bs=-.09:rm=.09:gm=.02:bm=-.11:rh=.03:bh=-.05,"
         "eq=contrast=1.09:saturation=1.06:gamma=1.04,"
         "vignette=a=PI/4.4")
# The close work is already warm; it only needs to match.
CLOSE = ("colorbalance=rs=.03:rm=.04:bm=-.05,"
         "eq=contrast=1.04:saturation=1.02:gamma=1.02,"
         "vignette=a=PI/5.2")

# (name, source, start_s, end_s, every_nth_frame, zoom0, zoom1, cx0,cy0, cx1,cy1, grade, blur0, blur1)
# zoom 1.0 is the full frame; centres are fractions of the source frame.
#
# Two rules govern this list.
#
# One: the sampling rate steps by at most one level between neighbouring shots
# (8 -> 12 -> 24 -> ... -> 12 -> 8). Scroll distance is spent per frame, so a
# shot sampled at 8fps next to one sampled at 24fps makes the action appear to
# drop to a third speed the moment you cross the boundary. Ramping the density
# instead of stepping it is most of what makes the whole move read as one take.
#
# Two: anything the eye is meant to follow — the cork coming out, the pour —
# runs at the source's full 24fps and is framed tight enough to see. The cork
# pull used to sit at 8fps inside the wide shot, which is why it did not read.
SHOTS = [
    ("establish", CAMP, 0.05, 0.80, 2, 1.00, 1.10, .44, .52, .40, .52, FIRE, 0, 0),
    ("cork_in",   CAMP, 0.80, 1.20, 2, 1.10, 1.55, .40, .52, .36, .52, FIRE, 0, 0),
    # The cork itself: his hand is on it from ~0.8s and lifts clear at ~2.0s.
    ("cork",      CAMP, 1.20, 2.05, 1, 1.55, 1.95, .36, .52, .35, .55, FIRE, 0, 0),
    ("present",   CAMP, 2.05, 2.60, 1, 1.95, 1.75, .35, .55, .375, .60, FIRE, 0, 0),
    # Aimed at the amber in the bottle's shoulder, not the label — the whole
    # point of the move is to end on whiskey.
    ("push",      CAMP, 2.60, 3.25, 1, 1.75, 2.40, .375, .60, .415, .665, FIRE, 0, 0),
    # Through the glass: the last frames push past what the lens can hold and go
    # soft, and the pour comes back out of the same amber. The match cut does
    # the work — no dissolve needed.
    ("through",   CAMP, 3.25, 3.44, 1, 2.40, 4.00, .415, .665, .425, .668, FIRE, 0, 8),
    # The cut lands with the bottle still in the top-left of the close-up, so
    # the push comes back out of the same amber it went into, then pulls back to
    # find the cup as the stream starts.
    ("pour",      CAMP, 3.47, 5.40, 1, 2.10, 1.05, .26, .245, .50, .50, CLOSE, 5, 0),
    # The new clip burns in a caption from 5.55s, so the pour finishes on the
    # original one. Both cups are at the same level and framed the same way at
    # the join, so it reads as one continuous pour.
    ("pour2",     POUR, 6.10, 7.40, 1, 1.10, 1.00, .50, .50, .50, .50, CLOSE, 0, 0),
    ("settle",    POUR, 7.40, 8.65, 2, 1.00, 1.00, .50, .50, .50, .50, CLOSE, 0, 0),
    ("set",       POUR, 8.70, 10.00, 3, 1.06, 1.00, .50, .50, .50, .50, CLOSE, 0, 0),
]


def ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("need ffmpeg on PATH, or: pip install imageio-ffmpeg")


def lerp(a, b, t):
    return a + (b - a) * t


def plan():
    """Every output frame, in order, with the crop it needs."""
    out = []
    for (name, src, t0, t1, step, z0, z1, cx0, cy0, cx1, cy1, grade, b0, b1) in SHOTS:
        n0, n1 = int(round(t0 * SRC_FPS)), int(round(t1 * SRC_FPS))
        span = max(1, n1 - n0 - step)
        for n in range(n0, n1, step):
            t = (n - n0) / span if span else 0.0
            t = min(1.0, max(0.0, t))
            # ease-in-out, so each move starts and lands softly instead of
            # snapping at the shot boundaries
            e = t * t * (3 - 2 * t)
            out.append({
                "shot": name, "src": src, "n": n, "sec": round(n / SRC_FPS, 4),
                "zoom": lerp(z0, z1, e),
                "cx": lerp(cx0, cx1, e), "cy": lerp(cy0, cy1, e),
                "grade": grade, "blur": lerp(b0, b1, e),
            })
    return out


def vf_for(f, w, h, out_w, out_h):
    """crop -> scale -> (blur) -> (sharpen) -> grade"""
    cw = max(16, int(round(w / f["zoom"] / 2)) * 2)
    chh = max(16, int(round(h / f["zoom"] / 2)) * 2)
    x = int(round(f["cx"] * w - cw / 2))
    y = int(round(f["cy"] * h - chh / 2))
    x = max(0, min(w - cw, x))            # keep the window inside the frame
    y = max(0, min(h - chh, y))
    parts = [f"crop={cw}:{chh}:{x}:{y}",
             f"scale={out_w}:{out_h}:flags=lanczos"]
    if f["blur"] > 0.15:
        parts.append(f"boxblur={f['blur']:.2f}:1")
    elif f["zoom"] > 1.25:
        # a little bite back after upscaling a small crop
        parts.append("unsharp=5:5:0.55:5:5:0.0")
    parts.append(f["grade"])
    return ",".join(parts)


def main():
    ff = ffmpeg()
    for p in (CAMP, POUR):
        if not os.path.exists(p):
            sys.exit(f"missing source clip: {p}")

    frames = plan()
    print(f"  {len(frames)} frames across {len(SHOTS)} shots")

    for out_w in WIDTHS:
        out_h = int(out_w * 9 / 16 / 2) * 2
        outdir = os.path.join(FRAMES, str(out_w))
        shutil.rmtree(outdir, ignore_errors=True)
        os.makedirs(outdir, exist_ok=True)
        for i, f in enumerate(frames):
            subprocess.run([
                ff, "-y", "-ss", str(f["sec"]), "-i", f["src"], "-frames:v", "1",
                "-vf", vf_for(f, 1280, 720, out_w, out_h),
                "-c:v", "libwebp", "-quality", str(QUALITY[out_w]),
                "-compression_level", "6",
                os.path.join(outdir, "f%03d.webp" % (i + 1)),
            ], check=True, capture_output=True)
        size = sum(os.path.getsize(os.path.join(outdir, x)) for x in os.listdir(outdir))
        print(f"  {out_w:>5}px  {len(os.listdir(outdir)):>4} frames  {size/1e6:5.2f} MB")

    # Stills for the poster, the og:image, and anyone whose canvas never runs.
    first, last = frames[0], frames[-1]
    for name, f, w in [("poster.jpg", first, 1280), ("og.jpg", last, 1200)]:
        h = int(w * 9 / 16 / 2) * 2
        subprocess.run([
            ff, "-y", "-ss", str(f["sec"]), "-i", f["src"], "-frames:v", "1",
            "-vf", vf_for(f, 1280, 720, w, h), "-q:v", "4",
            os.path.join(MEDIA, name),
        ], check=True, capture_output=True)

    # Where each shot begins in 0..1 scroll space, so the page can pin its copy
    # to the cut rather than to numbers typed in by hand.
    marks, seen = {}, set()
    for i, f in enumerate(frames):
        if f["shot"] not in seen:
            seen.add(f["shot"])
            marks[f["shot"]] = round(i / len(frames), 4)
    marks["end"] = 1.0

    manifest = {
        "count": len(frames),
        "widths": WIDTHS,
        "pattern": "assets/media/frames/{width}/f{index:03d}.webp",
        "shots": marks,
        "seconds": [f["sec"] for f in frames],
    }
    with open(os.path.join(FRAMES, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")
    print("  shot marks: " + "  ".join(f"{k}={v}" for k, v in marks.items()))


if __name__ == "__main__":
    main()
