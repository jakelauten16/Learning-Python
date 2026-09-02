#!/usr/bin/env python3
"""
Cut the hero: a lead-in film, then the frames the scroll scrubs.

The hero runs in two phases, and they use different machinery on purpose.

  Phase A — the camp.  0 to HANDOFF plays as an ordinary muted <video>, and
  loops for as long as the page sits at the top. Linear playback needs no
  seeking, so it is smooth and keeps the source's full quality.

  Phase B — the pour.  The first scroll cuts here. From HANDOFF to the end the
  film is a frame sequence painted onto a <canvas> and driven by the scrollbar. Scrubbing a <video> with
  currentTime is jittery and unreliable — these clips carry only a handful of
  keyframes across ten seconds — so the pour is stills instead.

The join is a cut in the source itself: at HANDOFF the camera cuts to the tight
close-up with the stream already running, so the handoff lands on a real edit
rather than in the middle of a shot.

Nothing is zoomed. The earlier version faked camera moves by cropping 2-4x into
a 1280px source, which is what made it soft; this clip does its own cuts, so
every frame here is the full frame at native framing. The grade is deliberately
almost nothing — the footage is already lit by firelight at dusk.

    python3 tools/build-frames.py
"""
import json, os, shutil, subprocess, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.dirname(HERE)
MEDIA  = os.path.join(ROOT, "assets", "media")
FRAMES = os.path.join(MEDIA, "frames")

SOURCE  = os.path.join(MEDIA, "camp.mp4")

SRC_FPS = 24.0
HANDOFF = 6.47     # the cut to the tight pour — the stream is already running
# The lead-in ends exactly ON that cut, never past it. It loops while the page
# sits at the top, so a single frame of the pour spilling into the loop would
# flash the payoff before anyone has scrolled for it.
LEAD_END = HANDOFF
END     = 10.00

WIDTHS  = [1280, 720]
# Higher than a normal web still. These are the frames a customer stares at
# while they scrub, and compression mush reads as "blurry video".
QUALITY = {1280: 88, 720: 82}

# The clip is golden hour and firelight already. A touch of contrast to match
# the site and nothing else — no vignette, no colour push, no blur. The page's
# own gradient handles legibility under the copy.
GRADE = "eq=contrast=1.04:saturation=1.03"


def ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("need ffmpeg on PATH, or: pip install imageio-ffmpeg")


def main():
    ff = ffmpeg()
    if not os.path.exists(SOURCE):
        sys.exit(f"missing source clip: {SOURCE}")

    # ---- phase A: the lead-in, as a real video ---------------------------
    # Audio is stripped: browsers only autoplay muted video, and there is
    # nothing to hear. faststart puts the index first so it starts playing
    # before the whole file has arrived.
    lead = os.path.join(MEDIA, "hero-lead.mp4")
    subprocess.run([
        ff, "-y", "-i", SOURCE, "-t", str(LEAD_END),
        "-an", "-c:v", "libx264", "-crf", "20", "-preset", "slow",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-vf", GRADE, lead,
    ], check=True, capture_output=True)
    print(f"  lead-in   0.00–{LEAD_END:.2f}s   {os.path.getsize(lead)/1e6:5.2f} MB  h264")

    # VP9 as well, offered first. It is smaller at the same quality, and some
    # Chromium builds ship without the proprietary H.264 decoder — on those the
    # mp4 alone leaves the hero frozen on its poster.
    webm = os.path.join(MEDIA, "hero-lead.webm")
    subprocess.run([
        ff, "-y", "-i", SOURCE, "-t", str(LEAD_END),
        "-an", "-c:v", "libvpx-vp9", "-crf", "31", "-b:v", "0",
        "-deadline", "good", "-cpu-used", "2", "-row-mt", "1",
        "-pix_fmt", "yuv420p", "-vf", GRADE, webm,
    ], check=True, capture_output=True)
    print(f"  lead-in   0.00–{LEAD_END:.2f}s   {os.path.getsize(webm)/1e6:5.2f} MB  vp9")

    # ---- phase B: the pour, as frames ------------------------------------
    n0 = int(round(HANDOFF * SRC_FPS))
    n1 = int(round(END * SRC_FPS))
    keep = list(range(n0, n1))
    expr = "+".join(f"eq(n\\,{n})" for n in keep)

    for w in WIDTHS:
        out = os.path.join(FRAMES, str(w))
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out, exist_ok=True)
        subprocess.run([
            ff, "-y", "-i", SOURCE,
            "-vf", f"select='{expr}',scale={w}:-2:flags=lanczos,{GRADE}",
            "-vsync", "0", "-c:v", "libwebp",
            "-quality", str(QUALITY[w]), "-compression_level", "6",
            os.path.join(out, "f%03d.webp"),
        ], check=True, capture_output=True)
        got = len(os.listdir(out))
        size = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
        print(f"  {w:>5}px  {got:>4} frames  {size/1e6:5.2f} MB")
        if got != len(keep):
            sys.exit(f"expected {len(keep)} frames at {w}px, wrote {got}")

    # ---- stills ----------------------------------------------------------
    for name, at, w in [("poster.jpg", 0.30, 1280), ("og.jpg", 9.60, 1200)]:
        h = int(w * 9 / 16 / 2) * 2
        subprocess.run([
            ff, "-y", "-ss", str(at), "-i", SOURCE, "-frames:v", "1",
            "-vf", f"scale={w}:{h}:flags=lanczos,{GRADE}", "-q:v", "3",
            os.path.join(MEDIA, name),
        ], check=True, capture_output=True)

    manifest = {
        "count": len(keep),
        "widths": WIDTHS,
        "pattern": "assets/media/frames/{width}/f{index:03d}.webp",
        "lead": "assets/media/hero-lead.mp4",
        # Where the video stops and the scroll takes over, in seconds.
        "handoff": HANDOFF,
        "leadEnd": LEAD_END,
        "sourceFps": SRC_FPS,
    }
    with open(os.path.join(FRAMES, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")
    print(f"  handoff at {HANDOFF}s; {len(keep)} frames scrub {HANDOFF}–{END}s")


if __name__ == "__main__":
    main()
