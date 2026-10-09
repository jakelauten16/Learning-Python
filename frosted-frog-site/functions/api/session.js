/* ---------------------------------------------------------------------------
   GET /api/session?id=cs_...

   The thank-you page asks Stripe, through us, whether that session actually
   paid. The page never decides this for itself, and this endpoint returns
   only what is safe to show the person who just paid.
   --------------------------------------------------------------------------- */
import { stripeFetch, json } from "../_lib/order.js";

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Bad request" }, 400);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Card payment is not switched on" }, 503);

  try {
    const session = await stripeFetch(env.STRIPE_SECRET_KEY, `checkout/sessions/${id}`, { method: "GET" });
    const meta = session.metadata || {};
    return json({
      paid: session.payment_status === "paid",
      reference: meta.reference || session.client_reference_id || "",
      total: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      email: session.customer_details?.email || "",
      pickup: { date: meta.pickup_date || "", time: meta.pickup_time || "" },
      fulfillment: meta.fulfillment || "pickup",
      items: meta.items || "",
    });
  } catch (error) {
    /* An id that does not exist is not our failure. Saying 404 lets the
       thank-you page tell the difference between "we cannot find that order"
       and "something is broken at our end", which read very differently to
       someone who has just handed over money. */
    if (error.status === 404) {
      return json({ error: "We have no record of that order" }, 404);
    }
    console.error("session lookup failed", error.message);
    return json({ error: "We could not look that order up" }, 502);
  }
}
