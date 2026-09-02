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
| **A. Replace** the Squarespace site | This site at `foundersrevolution250.com` | Repoint DNS at Squarespace — the domain stays registered there. The old URLs (`/bourbon`, `/merchandise`, `/contact`) stop working unless redirected, and **`/merchandise` is a live Squarespace store** — see below before cancelling anything. |
| **B. Subdomain** — e.g. `shop.` or `250.foundersrevolution250.com` | Both sites live at once | One DNS record. No disruption. But two sites to keep in step, and search engines split between them. |
| **C. Staging first** — the host's free URL (`*.netlify.app`, `*.pages.dev`) | Only people you send the link to | Nothing. This is the right first step regardless of which you end at. |

**Recommendation: C, then A.** Publish to the host's free URL today, look at it
on a real phone, then repoint the domain when you are satisfied. Repointing DNS
is a five-minute change you can reverse.

### Keeping the domain at Squarespace

You can, and you should. **Keep `foundersrevolution250.com` registered with
Squarespace and simply point it here.** A Squarespace domain registration is
independent of the website subscription: cancelling the site does not cancel or
expire the domain — it stays yours and keeps auto-renewing, and you edit its DNS
from the Domains panel like any registrar. So the domain never moves, never has
a transfer window, and never risks lapsing.

What you cannot do is put *this* site inside Squarespace's hosting. Squarespace
is a CMS, not a file host: there is no way to upload a folder of HTML pages and
have them served at their own URLs. Three things rule it out for this site in
particular:

- **The site is 7.1.** Squarespace's Developer Platform — the one path that
  gives you real template files — is *only available in version 7.0*. That door
  is closed before the plan question is even asked.
- **No self-hosted video, and a 20 MB per-file cap.** The hero is 85 JPEG
  frames plus an MP4 and a WebM, served from paths that JavaScript addresses
  frame by frame. Squarespace wants video on YouTube or Vimeo, which cannot be
  scrubbed by scroll. The hero *is* the site; without it there is no reason to
  rebuild.
- **Custom JS only through Code Injection**, on Core and above, and Squarespace
  states plainly that code you add "falls outside the scope of Squarespace
  support." Rebuilding the scroll engine inside a code block would mean
  reimplementing the whole thing in the one place nobody will help you debug it.

So the shape of it is: **domain stays at Squarespace, hosting moves.**

```
Squarespace  =  registrar + DNS        (keep, ~$20/yr)
Netlify or Cloudflare Pages  =  hosting  (free at this size)
```

### The actual steps

**1 — Put the site on Netlify (about ten minutes).**

Sign in at netlify.com with GitHub, then *Add new site → Import an existing
project* and pick `jakelauten16/Learning-Python`. Four settings matter:

| Field | Value |
|---|---|
| Branch to deploy | `claude/founders-revolution-bourbon-site-finnzq` |
| Base directory | `founders-revolution-250` |
| Build command | leave empty — `netlify.toml` supplies it |
| Publish directory | `founders-revolution-250` |

The branch is not `main` because this repository has no `main`: its default
branch is the unrelated coffee project. Netlify is happy to treat any branch as
production; pick this one from the dropdown.

Deploy. You get a URL like `radiant-praline-9f2c31.netlify.app`. **Open it on
your phone before going any further** — that is the whole point of doing this
before touching DNS. Nothing about the live site has changed yet.

Cloudflare Pages works identically: same repo, same branch, build output
directory `founders-revolution-250`, no build command. `_redirects` and
`_headers` are read by both.

**2 — Point the domain (about five minutes, plus waiting).**

In Netlify: *Domain management → Add a domain →* `foundersrevolution250.com`.
Netlify will print the exact records it wants — typically an **A** record for
the apex and a **CNAME** for `www`. Use the values Netlify prints, not any
found in a tutorial.

In Squarespace: *Domains → foundersrevolution250.com → DNS → DNS Settings →
Custom Records*. Delete the four Squarespace A records (`198.185.159.144/145`,
`198.49.23.144/145`) and the `www` CNAME pointing at `ext-sq.squarespace.com`,
then add Netlify's. Also **disconnect the domain from the Squarespace site**,
or Squarespace will keep trying to claim it.

DNS takes anywhere from ten minutes to a few hours. The old site keeps serving
until it propagates; there is no moment where nothing works.

**3 — Leave Squarespace alone for a week.**

The subscription still runs, the site is still there, and if something is wrong
you put the old DNS records back and you are exactly where you started. Only
once you are sure — and once merchandise has somewhere to live, see below —
cancel the website subscription. **Keep the domain subscription.** It is
separate, and cancelling the site does not touch it.

### The old URLs keep working

`_redirects` in this folder maps every URL the old site published. Netlify and
Cloudflare Pages both read it, same format:

```
/bourbon          /bourbon.html    200      <- the one you have been sharing
/privacy-policy   /privacy.html    200
/home             /               301
/contact          /buy.html        301
```

`/bourbon` is a rewrite, not a redirect: the address bar keeps saying
`/bourbon` and the new page is served underneath. Anything printed, linked or
posted with that URL keeps working unchanged.

`/merchandise` and `/cart` are the exception — see below. They are the two
lines in `_redirects` you must decide about.

### Read this before cancelling the Squarespace subscription

**The old site sells merchandise.** `/merchandise` is a Squarespace Commerce
page and `/cart` is a live Squarespace cart. Cancelling the website
subscription takes that store down with it — the bourbon checkout is unaffected
(it lives at Kentucky Bourbon Direct), but the merch is not.

So: move the merchandise to the Kentucky Bourbon Direct store first, or keep
paying for the Squarespace plan purely to run the merch store on a subdomain.
Do not cancel and find out afterwards. Note also that the old URLs `/bourbon`,
`/merchandise`, `/contact` and `/privacy-policy` will 404 once the domain
points here — anything printed, linked or shared pointing at those needs a
redirect or an update.

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

Netlify and Cloudflare Pages both serve static files over HTTPS with a free
certificate, deploy straight from GitHub, redeploy on every push, and read the
`_redirects` and `_headers` files in this folder. Either is fine; the
walkthrough above uses Netlify because its base-directory setting handles a
site living in a subdirectory with one field.

**GitHub Pages is the one to avoid here.** It publishes a *repository*, not a
folder: the coffee project would land at the root and this site at
`/founders-revolution-250/`. It also ignores `_redirects`, so every old
Squarespace URL would 404. If you ever want Pages, split this folder into its
own repository first.

Nothing needs Node or Python at run time. The scripts under `tools/` are
authoring tools — they run on your machine, never on the host.

## 3. What ships and what does not

Deployable weight is **6.7 MB**, nearly all of it the hero:

```
assets/media/frames/          3.5 MB   the scroll-driven pour
assets/media/hero-lead.mp4    1.6 MB   the looping camp scene
assets/media/hero-lead.webm   0.8 MB   the same, for browsers without H.264
assets/img/                   428 KB
assets/fonts/                 160 KB
```

`assets/media/camp.mp4` (3.1 MB) is the raw source clip. No page references
it; it is kept only so the hero can be rebuilt with `tools/build-frames.py`.
The build command in `netlify.toml` deletes it from the deploy — from the build
machine's checkout, never from the repository.

`demo.html` (5.4 MB) is the self-contained one-file preview. It *does* deploy,
which is useful — it gives you a shareable link that works with no server — but
it is not a page for customers and it is deliberately absent from `sitemap.xml`.
A deploy is about **11.8 MB** all told, comfortably inside every free tier here.

Three files configure the host rather than the site:

```
_redirects     old Squarespace URLs -> these pages   (Netlify + Cloudflare)
_headers       cache policy, hard on media, none on HTML
netlify.toml   base directory, no build, drop camp.mp4
```

## 4. Before you point customers at it

- [ ] **Set a real contact address.** `allocations@foundersrevolution250.com`
      appears on `buy.html` and in every footer. The only address the old site
      publishes is `bruce@foundersrevolution250.com` (in its privacy policy), so
      either create `allocations@` or change the site to `bruce@` — one string
      in seven files. Do not launch pointing at a mailbox nobody reads.
- [ ] **Confirm the allocation counter.** `claimed: 184` in
      `assets/js/data.js` is a placeholder. A number that never moves reads as
      decoration; a wrong one reads worse. Either keep it current or remove it.
- [ ] **Confirm the figures marked PLACEHOLDER in `README.md`** — mash bill,
      entry proof, and the tasting notes. These are product claims.
- [ ] **Age-gate the social accounts** before any campaign traffic arrives:
      Facebook Page and Instagram both have an alcohol age-restriction setting,
      and leaving it off is the most common compliance miss.
- [ ] **Decide the two merchandise lines in `_redirects`.** Everything else in
      the old URL map is handled; `/merchandise` and `/cart` are not, because
      only you know where merch is going.
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
- Check the old URLs by hand once DNS has moved: `/bourbon`, `/privacy-policy`,
  `/home`, `/contact`. Each should land somewhere sensible, not on the 404.

---

## The checkout, for the record

This site takes no payment and stores nothing. Every "Buy" button leaves for
Kentucky Bourbon Direct, who handle age verification, payment and shipping.
That is also why nothing here needs a server: there is nothing to protect.
