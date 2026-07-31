// supabase/functions/capture-paypal-order/index.ts
//
// Deploy with: supabase functions deploy capture-paypal-order
// Same env vars as create-paypal-order.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE")!;
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalAccessToken(): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, reservation_id } = await req.json();

    if (!order_id || !reservation_id) {
      return new Response(
        JSON.stringify({ error: "Missing order_id or reservation_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Sanity check: the order_id must match what we stored for this reservation.
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("id, paypal_order_id, status")
      .eq("id", reservation_id)
      .single();

    if (fetchError || !reservation) {
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (reservation.paypal_order_id !== order_id) {
      return new Response(
        JSON.stringify({ error: "Order id mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Avoid double-capture if the client retries the request.
    if (reservation.status === "confirmed") {
      return new Response(
        JSON.stringify({ status: "already_confirmed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${order_id}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const capture = await captureRes.json();

    if (!captureRes.ok || capture.status !== "COMPLETED") {
      await supabase
        .from("reservations")
        .update({ status: "payment_failed" })
        .eq("id", reservation_id);

      return new Response(
        JSON.stringify({ error: "Payment capture failed", details: capture }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Payment confirmed -> mark reservation as confirmed.
    await supabase
      .from("reservations")
      .update({
        status: "confirmed",
        paypal_capture_id: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null,
      })
      .eq("id", reservation_id);

    return new Response(
      JSON.stringify({ status: "confirmed", capture }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
