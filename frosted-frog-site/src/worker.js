/* ---------------------------------------------------------------------------
   The Worker entry point.

   This project deploys as a Cloudflare Worker with static assets. In that
   setup the `functions/` folder convention does not apply: that is a Pages
   feature, and a Workers deploy ignores it. So this file is the router, and
   it hands each path to the very same handler the Pages build would have
   used. One implementation, two ways to deploy it.

   Everything that is not /api/... is a file on the site, served straight from
   the assets binding.
   --------------------------------------------------------------------------- */
import { onRequestPost as checkout } from "../functions/api/checkout.js";
import { onRequestPost as stripeWebhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as session } from "../functions/api/session.js";
import { onRequestGet as health } from "../functions/api/health.js";

const ROUTES = {
  "/api/checkout": { POST: checkout },
  "/api/stripe-webhook": { POST: stripeWebhook },
  "/api/session": { GET: session },
  "/api/health": { GET: health },
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = ROUTES[url.pathname];

    if (!route) {
      return env.ASSETS.fetch(request);
    }

    const handler = route[request.method];
    if (!handler) {
      return json({ error: "Method not allowed" }, 405);
    }

    /* The handlers were written for Pages, which passes one context object.
       Same shape here, so neither side needs to know about the other. */
    try {
      return await handler({ request, env, ctx, waitUntil: ctx.waitUntil.bind(ctx) });
    } catch (error) {
      console.error(url.pathname, error && error.message);
      return json({ error: "Something went wrong at our end" }, 500);
    }
  },
};
