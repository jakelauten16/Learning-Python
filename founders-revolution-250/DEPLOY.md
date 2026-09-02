# Publishing this site

Everything here is static: seven HTML files, one stylesheet, three small
scripts, the fonts, the images and the hero video. There is no build step, no
server code, and no database. Any static host will serve it as-is. What
follows is what actually has to happen, in the order it has to happen.

---

## 1. The domain is the real decision

`foundersrevolution250.com` is **already taken by a live Squarespace site**.
It resolves to Squarespace's servers and redirects to `www`:

```
foundersrevolution250.com  ->  198.185.159.144/145, 198.49.23.144/145
www.foundersrevolution250.com  ->  ext-sq.squarespace.com   (Server: Squarespace)
```

So publishing this site is not just "upload the files" — something has to give.
There are three honest options:

| Option | What the customer sees | What it costs you |
|---|---|---|
| **A. Replace** the Squarespace site | This site at `foundersrevolution250.com` | Repoint DNS; cancel Squarespace once you are happy. The old site's URLs (`/bourbon`, `/merchandise`, `/contact`) stop working unless you redirect them. |
| **B. Subdomain** — e.g. `shop.` or `250.foundersrevolution250.com` | Both sites live at once | One DNS record. No disruption. But two sites to keep in step, and search engines split between them. |
| **C. Staging first** — the host's free URL (`*.netlify.app`, `*.pages.dev`) | Only people you send the link to | Nothing. This is the right first step regardless of which you end at. |

**Recommendation: C, then A.** Publish to the host's free URL today, look at it
on a real phone, then repoint the domain when you are satisfied. Repointing DNS
is a five-minute change you can reverse.

If you land on B or on a different domain entirely, run this first — it keeps
the sitemap, `robots.txt` and every page's canonical URL pointing at the same
host, which search engines check against each other:

```
# edit HOST at the top of tools/build-sitemap.py, then
python3 tools/build-sitemap.py
python3 tools/build-sitemap.py --check      # names any page still on the old host
```

The `<link rel="canonical">` and `og:url` tags in the seven pages still say
`foundersrevolution250.com`; `--check` will list them so nothing is missed.

## 2. Pick a host

All three below serve static files over HTTPS with a free certificate, deploy
straight from this GitHub repository, and redeploy on every push. Any of them
is fine. Differences that matter here:

- **Netlify** or **Cloudflare Pages** — connect the repo, set the *base
  directory* to `founders-revolution-250`, leave the build command empty, and
  set the publish directory to the same folder. This is the shortest path,
  because this site lives in a subdirectory of a repo whose root holds a
  different project (Lucy Lou's Coffee) and both handle that with one setting.
  Custom domain is a field in the dashboard.
- **GitHub Pages** — free and closest to the code, but it publishes a *repo*,
  not a folder: the coffee project would land at the root and this site at
  `/founders-revolution-250/`. Workable only with a GitHub Actions workflow
  that copies this folder up, or by splitting this folder into its own repo.
  If you want Pages, split the repo first; it is cleaner than fighting it.

Nothing about the site needs Node, Python or a build server at run time. The
scripts under `tools/` are authoring tools — they run on your machine, never
on the host.

## 3. What ships and what does not

Deployable weight is **6.7 MB**, nearly all of it the hero:

```
assets/media/frames/          3.5 MB   the scroll-driven pour
assets/media/hero-lead.mp4    1.6 MB   the looping camp scene
assets/media/hero-lead.webm   0.8 MB   the same, for browsers without H.264
assets/img/                   428 KB
assets/fonts/                 160 KB
```

Two files in this folder are **not** part of the published site:

- `assets/media/camp.mp4` (3.1 MB) — the raw source clip. Nothing references
  it; it is kept only so the hero can be rebuilt with `tools/build-frames.py`.
- `demo.html` (5.4 MB) — the self-contained one-file preview. Useful for
  sending someone a link; not a page for customers.

Excluding those keeps the site under the free tier of every host listed.

## 4. Before you point customers at it

- [ ] **Set a real contact address.** `allocations@foundersrevolution250.com`
      appears on `buy.html` and in the footer. It must exist and be read.
- [ ] **Confirm the allocation counter.** `claimed: 184` in
      `assets/js/data.js` is a placeholder. A number that never moves reads as
      decoration; a wrong one reads worse. Either keep it current or remove it.
- [ ] **Confirm the figures marked PLACEHOLDER in `README.md`** — mash bill,
      entry proof, and the tasting notes. These are product claims.
- [ ] **Age-gate the social accounts** before any campaign traffic arrives:
      Facebook Page and Instagram both have an alcohol age-restriction setting,
      and leaving it off is the most common compliance miss.
- [ ] **Five partner logos** are still absent (`assets/img/partners/` — see the
      README for filenames). The slots degrade to text, so this is not
      blocking, but the page is better with them.
- [ ] **Consider a "scene dramatized" credit** on the hero. The footage is
      AI-generated and shows photoreal people; a small credit is honest and
      cheap.

## 5. After it is live

- Submit `https://<your host>/sitemap.xml` in Google Search Console.
- Check `404.html` is wired up. Netlify and Cloudflare Pages use it
  automatically; other hosts may need it named in a config.
- Re-run the link audit against the live URL, not just locally. The buy
  buttons point into a store you do not control — if a product handle changes
  there, the deep link 404s. The two handles are in `assets/js/data.js`.

---

## The checkout, for the record

This site takes no payment and stores nothing. Every "Buy" button leaves for
Kentucky Bourbon Direct, who handle age verification, payment and shipping.
That is also why nothing here needs a server: there is nothing to protect.
