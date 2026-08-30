# Campaign

`campaign.html` is the launch playbook — open it in a browser. It holds the social
posts, the email sequences, the six-week calendar, and the compliance constraints
that shape all of it. Every post has a copy button.

It is versioned here so edits are tracked alongside the site, and so the prices,
the store URL and the product facts stay in step with `assets/js/data.js`.

## Posture

Everything in it is a **draft awaiting approval**. Nothing is scheduled and nothing
sends. That is deliberate for a spirits brand: one bad post can cost a Meta ad
account, and a badly-aimed cold email can burn a sending domain permanently.

## The four constraints, in short

1. **TikTok prohibits alcohol advertising globally.** Organic only, no exceptions.
   The TikTok content is built around history and craft, and nobody drinks on camera.
2. **Meta allows it, gated.** Age-restrict the Page *before* the first post; 21+
   targeting in the US; exclude countries where alcohol ads are banned.
3. **No implied SAR or DAR endorsement.** The founders are members and the company
   supports these organisations. That is the story. "Official bourbon of…" is not.
4. **TTB and CAN-SPAM.** No health or benefit claims. Every commercial email needs a
   real postal address and a working unsubscribe. Do not buy a list.

## What Claude can and cannot do here

**Can, once connected:** Klaviyo and Mailchimp both have Claude connectors. Connect
one at claude.ai → Settings → Connectors and enable it for the chat, and Claude can
draft campaigns into the account and read back performance.

**Cannot:** post organic content to Facebook, Instagram or TikTok — no connector
exists for it. The social entries in the directory are analytics or paid-ads only.
Social stays copy-and-paste, or goes through a scheduler you paste into.

**Cannot:** run unattended on a schedule from a chat session. Recurring work needs a
host — GitHub Actions, a server, or a scheduling SaaS. Not set up, by choice.

## Before anything goes out

- Fill every `[bracketed]` value — postal address, chapter names, counts.
- Confirm the Terre Haute giving claim in FB-04 is committed, and to whom.
- Check state rules before offering a set for any chapter raffle or auction;
  raffling alcohol needs a permit in most states and is illegal in some.
- Check state rules and adult-signature requirements before shipping reviewer samples.
