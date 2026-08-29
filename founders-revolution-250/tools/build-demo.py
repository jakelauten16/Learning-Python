#!/usr/bin/env python3
"""
Assemble demo.html: the whole site as one file, with the frame sequence, the
poster and the section photographs inlined as data URIs.

The result needs no server, no build step and no network beyond Google Fonts —
open it from a USB stick, email it, or drop it in a deck. It is the same CSS and
the same scroll engine as the real site; only the frame loading differs, since
there is nothing left to fetch.

    python3 tools/build-demo.py

Writes demo.html next to this script's parent. Re-run it after rebuilding the
frames, or the demo will still be showing the old cut.
"""
import base64, json, os, re

SITE = '/home/user/Learning-Python/founders-revolution-250'
OUT  = os.path.join(SITE, 'demo.html')

def read(p): return open(os.path.join(SITE, p)).read()

# ---- frames -> data URIs -------------------------------------------------
man = json.load(open(os.path.join(SITE, 'assets/media/frames/manifest.json')))
fdir = os.path.join(SITE, 'assets/media/frames/720')
uris = []
for i in range(1, man['count'] + 1):
    with open(os.path.join(fdir, 'f%03d.webp' % i), 'rb') as fh:
        uris.append('data:image/webp;base64,' + base64.b64encode(fh.read()).decode())
poster = base64.b64encode(open(os.path.join(SITE, 'assets/media/poster.jpg'), 'rb').read()).decode()

# ---- css: swap self-hosted faces for the one font host artifacts allow ----
css = read('assets/css/site.css')
css = re.sub(r"@font-face \{.*?\}\n", "", css, flags=re.S)
css = css.replace("'Caslon Display'", "'Libre Caslon Display'")
css = css.replace("'Caslon Text'", "'Libre Caslon Text'")

# ---- body ----------------------------------------------------------------
body = re.search(r'<body>(.*)</body>', read('index.html'), re.S).group(1)
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
body = body.replace('src="assets/media/poster.jpg"', 'src="data:image/jpeg;base64,%s"' % poster)

# The section photographs are relative paths; a one-file page has to carry them.
for name in sorted(set(re.findall(r'src="assets/img/([^"]+\.jpg)"', body))):
    with open(os.path.join(SITE, 'assets/img', name), 'rb') as fh:
        b64 = base64.b64encode(fh.read()).decode()
    body = body.replace('src="assets/img/%s"' % name,
                        'src="data:image/jpeg;base64,%s"' % b64)
    print('  inlined', name)
# one page, so the nav walks the page instead of loading others
for a, b in [('reserve.html?offer=box', '#reserve'), ('reserve.html?offer=bottle', '#reserve'),
             ('reserve.html#form', '#reserve'), ('reserve.html', '#reserve'),
             ('collectors-box.html', '#box'), ('bourbon.html', '#bourbon'),
             ('heritage.html', '#heritage'), ('partnerships.html', '#partners'),
             ('index.html', '#top')]:
    body = body.replace('href="%s"' % a, 'href="%s"' % b)
# Pull the partner sections in from their own page, so the one-file demo shows
# what the nav points at instead of a dead anchor.
partners = re.search(r'<main id="main">(.*?)</main>', read('partnerships.html'), re.S).group(1)
partners = re.sub(r'<section class="section phead[^>]*>.*?</section>', '', partners, count=1, flags=re.S)
partners = re.sub(r'<section class="section section--tight oxblood">.*?</section>', '', partners, flags=re.S)
partners = partners.replace('<section class="section">',
                            '<section class="section" id="partners">', 1)
for a, b in [('reserve.html', '#reserve')]:
    partners = partners.replace('href="%s"' % a, 'href="%s"' % b)
body = body.replace('<!-- ============================================================== reserve -->',
                    partners + '\n<!-- ============================================================== reserve -->')

# the closing allocation band is where "Reserve" should land
body = body.replace('<section class="section section--tight night night-2">',
                    '<section class="section section--tight night night-2" id="reserve">', 1)
assert 'id="reserve"' in body, 'the reserve band moved — update this selector'

# ---- js ------------------------------------------------------------------
data_js = read('assets/js/data.js')
site_js = read('assets/js/site.js')
pour_js = read('assets/js/pour.js')

# The frames are already in the document, so there is nothing to fetch and only
# one width to choose from.
pour_js = pour_js.replace(
    """  function srcFor(i, w) {
    // manifest indexes from 0; ffmpeg numbered the files from 1
    return 'assets/media/frames/' + w + '/f' + String(i + 1).padStart(3, '0') + '.webp';
  }""",
    """  function srcFor(i) { return window.AF_FRAMES[i]; }""")
pour_js = pour_js.replace("img.src = srcFor(i, width);", "img.src = srcFor(i);")
pour_js = re.sub(r"  // One width for the life of the page.*?\n  \}\n", "", pour_js, flags=re.S)

start = pour_js.index("  fetch('assets/media/frames/manifest.json')")
end   = pour_js.index("  /* --- embers ---")
pour_js = pour_js[:start] + """  (function () {
    var m = window.AF_MANIFEST;
    conf = m;
    count = m.count;
    resize();

    var coarse = [], fine = [], i;
    for (i = 0; i < count; i++) (i % 6 === 0 || i === count - 1 ? coarse : fine).push(i);
    var mid = Math.round(((m.shots.pour + m.shots.settle) / 2) * count);
    fine.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); });

    queue(coarse, 0, function () {
      root.setAttribute('data-ready', '1');
      tick();
      queue(fine, 0);
    });

    startEmbers();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', function () { resize(); lastP = -1; tick(); }, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); tick(); }).observe(canvas);
    tick();
  })();

""" + pour_js[end:]

html = """<title>Heritage Select 250</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap">
<style>
%s
/* The demo is one page, so the header's "past the film" test needs an anchor. */
#top { position: absolute; top: 0; }
</style>
<span id="top"></span>
%s
<script>
window.AF_MANIFEST = %s;
window.AF_FRAMES = %s;
</script>
<script>%s</script>
<script>%s</script>
<script>%s</script>
""" % (css, body,
       json.dumps({'count': man['count'], 'shots': man['shots']}),
       json.dumps(uris), data_js, site_js, pour_js)

open(OUT, 'w').write(html)
print('demo.html  %.2f MB  (%d frames inlined)' % (os.path.getsize(OUT) / 1e6, len(uris)))
