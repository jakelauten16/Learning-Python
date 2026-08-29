#!/usr/bin/env python3
"""
Turn the pour film into the frame sequence the hero scrubs through.

The hero doesn't play a video, it draws stills onto a canvas as you scroll,
so the pour tracks the scrollbar exactly instead of chasing it. That needs the
frames as individual files, and it needs them sampled unevenly: the pour itself
is kept at the source's full 24fps, while the near-static bar shots at either
end are thinned out. Because scroll distance is handed out per *frame*, not per
second, that alone makes the pour occupy ~55% of the scroll while costing far
fewer bytes than sampling the whole clip densely.

Two widths are emitted; the page picks one from the viewport. Re-run this after
replacing pour.mp4 and commit whatever lands in assets/media/.

    python3 tools/build-frames.py path/to/pour.mp4
"""
import json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MEDIA = os.path.join(ROOT, "assets", "media")
FRAMES = os.path.join(MEDIA, "frames")

SRC_FPS = 24.0
WIDTHS = [1280, 720]          # full-bleed desktop, and phones
QUALITY = {1280: 76, 720: 72}

# (start_s, end_s, keep_every_nth_source_frame) -> effective fps = 24 / nth
SEGMENTS = [
    (0.00,  3.55, 3),   #  8fps  bar at rest: bottle, cup, the open box
    (3.55,  4.25, 2),   # 12fps  a hand comes in for the bottle, cut to the cup
    (4.25,  7.40, 1),   # 24fps  THE POUR — every frame the camera shot
    (7.40,  8.65, 2),   # 12fps  stream tapers, whiskey settles
    (8.65, 10.02, 3),   #  8fps  pull back to the full set
]


def ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("need ffmpeg on PATH, or: pip install imageio-ffmpeg")


def chosen_frames():
    """Source frame numbers to keep, in order, with their timestamps."""
    picked = []
    for start, end, step in SEGMENTS:
        n = int(round(start * SRC_FPS))
        last = int(round(end * SRC_FPS))
        while n < last:
            if not picked or n > picked[-1]:
                picked.append(n)
            n += step
    return [(n, round(n / SRC_FPS, 4)) for n in picked]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(MEDIA, "pour.mp4")
    if not os.path.exists(src):
        sys.exit(f"no source film at {src}")
    ff = ffmpeg()

    frames = chosen_frames()
    # One select expression naming every frame we keep: ffmpeg decodes the file
    # once and writes only these, so nothing is re-compressed on the way out.
    expr = "+".join(f"eq(n\\,{n})" for n, _ in frames)

    for w in WIDTHS:
        out = os.path.join(FRAMES, str(w))
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out, exist_ok=True)
        subprocess.run([
            ff, "-y", "-i", src,
            "-vf", f"select='{expr}',scale={w}:-2",
            "-vsync", "0", "-c:v", "libwebp",
            "-quality", str(QUALITY[w]), "-compression_level", "6",
            os.path.join(out, "f%03d.webp"),
        ], check=True, capture_output=True)
        got = len(os.listdir(out))
        size = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
        print(f"  {w:>5}px  {got:>4} frames  {size/1e6:5.2f} MB")
        if got != len(frames):
            sys.exit(f"expected {len(frames)} frames at {w}px, wrote {got}")

    # A still for the poster, the og:image, and anyone who never runs the canvas.
    for name, at, width in [("poster.jpg", 0.0, 1280), ("og.jpg", 8.95, 1200)]:
        subprocess.run([
            ff, "-y", "-ss", str(at), "-i", src, "-frames:v", "1",
            "-vf", f"scale={width}:-2", "-q:v", "4",
            os.path.join(MEDIA, name),
        ], check=True, capture_output=True)

    manifest = {
        "count": len(frames),
        "widths": WIDTHS,
        "pattern": "assets/media/frames/{width}/f{index:03d}.webp",
        "sourceFps": SRC_FPS,
        "seconds": [t for _, t in frames],
        # Where the pour itself sits in 0..1 scroll space, so the page can pin
        # its copy to the stream rather than to guessed numbers.
        "pourStart": round(next(i for i, (_, t) in enumerate(frames) if t >= 4.25) / len(frames), 4),
        "pourEnd":   round(next(i for i, (_, t) in enumerate(frames) if t >= 7.40) / len(frames), 4),
        "settled":   round(next(i for i, (_, t) in enumerate(frames) if t >= 8.65) / len(frames), 4),
    }
    with open(os.path.join(FRAMES, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")
    print(f"  manifest: {manifest['count']} frames, "
          f"pour {manifest['pourStart']}–{manifest['pourEnd']}, "
          f"settled {manifest['settled']}")


if __name__ == "__main__":
    main()
