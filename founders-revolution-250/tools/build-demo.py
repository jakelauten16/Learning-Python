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

def b64(rel):
    with open(os.path.join(SITE, rel), 'rb') as fh:
        return base64.b64encode(fh.read()).decode()

# Both codecs ride along: VP9 for Chromium builds without H.264, H.264 for
# Safari. A demo that fails on the laptop it is being shown from is worthless.
lead_webm = b64('assets/media/hero-lead.webm')
lead_mp4  = b64('assets/media/hero-lead.mp4')

# ---- css: swap self-hosted faces for the one font host artifacts allow ----
css = read('assets/css/site.css')
css = re.sub(r"@font-face \{.*?\}\n", "", css, flags=re.S)
css = css.replace("'Caslon Display'", "'Libre Caslon Display'")
css = css.replace("'Caslon Text'", "'Libre Caslon Text'")

# ---- body ----------------------------------------------------------------
body = re.search(r'<body>(.*)</body>', read('index.html'), re.S).group(1)
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
body = body.replace('src="assets/media/poster.jpg"', 'src="data:image/jpeg;base64,%s"' % poster)
body = body.replace('poster="assets/media/poster.jpg"', 'poster="data:image/jpeg;base64,%s"' % poster)
body = body.replace('data-src-webm="assets/media/hero-lead.webm"',
                    'data-src-webm="data:video/webm;base64,%s"' % lead_webm)
body = body.replace('data-src-mp4="assets/media/hero-lead.mp4"',
                    'data-src-mp4="data:video/mp4;base64,%s"' % lead_mp4)
assert 'data:video/webm' in body and 'data:video/mp4' in body, 'lead-in did not inline'

# The section photographs are relative paths; a one-file page has to carry them.
for name in sorted(set(re.findall(r'src="assets/img/([^"]+\.jpg)"', body))):
    with open(os.path.join(SITE, 'assets/img', name), 'rb') as fh:
        b64 = base64.b64encode(fh.read()).decode()
    body = body.replace('src="assets/img/%s"' % name,
                        'src="data:image/jpeg;base64,%s"' % b64)
    print('  inlined', name)
# one page, so the nav walks the page instead of loading others
for a, b in [('buy.html#offers', '#buy'), ('buy.html', '#buy'),
             ('collectors-box.html', '#box'), ('bourbon.html', '#bourbon'),
             ('heritage.html', '#heritage'), ('partnerships.html', '#partners'),
             ('founders.html', '#founders'), ('index.html', '#top')]:
    body = body.replace('href="%s"' % a, 'href="%s"' % b)
# Pull the founder bios in from their own page.
founders = re.search(r'<section class="section section--flush night">(.*?)</section>',
                     read('founders.html'), re.S).group(0)
founders = founders.replace('<section class="section section--flush night">',
                            '<section class="section night" id="founders">', 1)

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
                    founders + '\n' + partners + '\n<!-- ============================================================== reserve -->')

# the closing allocation band is where "Reserve" should land
body = body.replace('<section class="section section--tight night night-2">',
                    '<section class="section section--tight night night-2" id="reserve">', 1)
assert 'id="reserve"' in body, 'the closing band moved — update this selector'
for anchor in ('#box', '#bourbon', '#heritage', '#founders', '#partners', '#buy', '#reserve'):
    assert 'id="%s"' % anchor[1:] in body, 'nothing for the nav to reach at ' + anchor

assert 'kybourbondirect.com' in body, 'the store links did not make it into the demo'

# ---- js ------------------------------------------------------------------
data_js = read('assets/js/data.js')
site_js = read('assets/js/site.js')
pour_js = read('assets/js/pour.js')

# The frames are already in the document, so there is nothing to fetch and only
# one width to choose from.
# The frames are already in the document, so there is nothing to fetch and
# only one width to choose from.
pour_js = pour_js.replace(
    """  function srcFor(i, w) {
    return 'assets/media/frames/' + w + '/f' + String(i + 1).padStart(3, '0') + '.webp';
  }""",
    """  function srcFor(i) { return window.AF_FRAMES[i]; }""")
pour_js = pour_js.replace("img.src = srcFor(i, width);", "img.src = srcFor(i);")
pour_js = re.sub(r"  function pickWidth\(widths\) \{.*?\n  \}\n", "", pour_js, flags=re.S)
pour_js = pour_js.replace("      width = pickWidth(m.widths);\n", "")

# Swap the manifest request for the copy embedded in the page.
a = pour_js.index("  fetch('assets/media/frames/manifest.json')")
body_start = pour_js.index("    .then(function (m) {", a) + len("    .then(function (m) {")
body_end = pour_js.index("    })\n    .catch(function (err) {", body_start)
inner = pour_js[body_start:body_end]
END = "      goStatic();\n    });\n"
tail = pour_js.index(END, body_end) + len(END)
pour_js = (pour_js[:a]
           + "  (function () {\n    var m = window.AF_MANIFEST;\n"
           + inner
           + "  })();\n"
           + pour_js[tail:])
assert 'AF_MANIFEST' in pour_js and 'fetch(' not in pour_js, 'manifest swap failed'

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
       json.dumps({'count': man['count'], 'handoff': man['handoff'],
                   'leadEnd': man['leadEnd'], 'widths': man['widths']}),
       json.dumps(uris), data_js, site_js, pour_js)

open(OUT, 'w').write(html)
print('demo.html  %.2f MB  (%d frames inlined)' % (os.path.getsize(OUT) / 1e6, len(uris)))
