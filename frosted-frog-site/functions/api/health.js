/* ---------------------------------------------------------------------------
   GET /api/health

   A deploy check. It proves the function can see the catalog and whether the
   Stripe key is present, without revealing the key or anything about orders.
   --------------------------------------------------------------------------- */
import { PRODUCTS, SHOP_CONFIG, json } from "../_lib/order.js";

export function onRequestGet({ env }) {
  return json({
    ok: true,
    products: PRODUCTS.length,
    paymentMode: SHOP_CONFIG.paymentMode,
    stripeKeySet: Boolean(env.STRIPE_SECRET_KEY),
    webhookSecretSet: Boolean(env.STRIPE_WEBHOOK_SECRET),
    orderEndpointSet: Boolean(env.ORDER_ENDPOINT || SHOP_CONFIG.orderEndpoint),
  });
}
