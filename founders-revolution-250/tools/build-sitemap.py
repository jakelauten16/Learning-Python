#!/usr/bin/env python3
"""Write sitemap.xml and the Sitemap: line in robots.txt.

One HOST, set below.  If the site is published somewhere other than
foundersrevolution250.com, change HOST here and run this — it keeps the
sitemap, robots.txt and the pages' own <link rel=canonical> in step, which
is the pair search engines check against each other.

    python3 tools/build-sitemap.py            # rewrite for HOST
    python3 tools/build-sitemap.py --check    # exit 1 if anything is stale
"""
import datetime
import pathlib
import re
import sys

HOST = 'https://foundersrevolution250.com/'

# Path in the site, and how much it matters relative to the others. 404.html
# and demo.html are deliberately absent: neither is a page anyone should land
# on from a search result.
PAGES = [
    ('',                    '1.0'),
    ('collectors-box.html', '0.9'),
    ('bourbon.html',        '0.9'),
    ('buy.html',            '0.9'),
    ('heritage.html',       '0.7'),
    ('founders.html',       '0.7'),
    ('partnerships.html',   '0.6'),
]

ROOT = pathlib.Path(__file__).resolve().parent.parent


def sitemap(today):
    rows = '\n'.join(
        '  <url>\n'
        '    <loc>{}{}</loc>\n'
        '    <lastmod>{}</lastmod>\n'
        '    <priority>{}</priority>\n'
        '  </url>'.format(HOST, path, today, pri)
        for path, pri in PAGES)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!-- Written by tools/build-sitemap.py. Do not edit by hand. -->\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + rows + '\n</urlset>\n')


def canonical_problems():
    """Pages whose canonical URL does not sit under HOST."""
    bad = []
    for path, _ in PAGES:
        f = ROOT / (path or 'index.html')
        m = re.search(r'rel="canonical" href="([^"]+)"', f.read_text())
        if not m:
            bad.append((f.name, '(no canonical tag)'))
        elif not m.group(1).startswith(HOST):
            bad.append((f.name, m.group(1)))
    return bad


def main():
    check = '--check' in sys.argv
    today = datetime.date.today().isoformat()

    bad = canonical_problems()
    for name, found in bad:
        print('canonical does not match HOST: {} -> {}'.format(name, found))

    want_map = sitemap(today)
    smf = ROOT / 'sitemap.xml'
    # Compare ignoring lastmod, so a re-run on a later day is not "stale".
    strip = lambda s: re.sub(r'<lastmod>[^<]*</lastmod>', '', s)
    stale = not smf.exists() or strip(smf.read_text()) != strip(want_map)

    rf = ROOT / 'robots.txt'
    robots = rf.read_text()
    want_line = 'Sitemap: {}sitemap.xml'.format(HOST)
    robots_stale = want_line not in robots

    if check:
        if stale:
            print('sitemap.xml is out of date')
        if robots_stale:
            print('robots.txt does not point at {}sitemap.xml'.format(HOST))
        ok = not (stale or robots_stale or bad)
        print('OK' if ok else 'STALE')
        return 0 if ok else 1

    smf.write_text(want_map)
    if robots_stale:
        rf.write_text(re.sub(r'Sitemap: \S+', want_line, robots))
    print('wrote sitemap.xml ({} urls) for {}'.format(len(PAGES), HOST))
    if bad:
        print('WARNING: fix the canonical tags above, or search engines will '
              'index one host and be told the page lives on another.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
