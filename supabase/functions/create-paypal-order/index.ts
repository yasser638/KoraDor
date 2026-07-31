// supabase/functions/create-paypal-order/index.ts
//
// Deploy:  supabase functions deploy create-paypal-order
// Secrets: supabase secrets set PAYPAL_CLIENT_ID=xxx PAYPAL_CLIENT_SECRET=xxx PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE")!;
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

// PayPal doesn't support MAD. Fixed conversion rate — update this periodically,
// or swap for a live exchange-rate API call if you want it to stay current automatically.
const MAD_TO_USD = 0.10; // 1 MAD ≈ 0.10 USD — VERIFY this rate before going live

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // remplace par ton domaine Vercel en production
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
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { terrain_id } = await req.json();

    if (!terrain_id) {
      return new Response(
        JSON.stringify({ error: "Missing terrain_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Prix en DH récupéré côté serveur — jamais envoyé par le client, pour éviter toute manipulation.
    const { data: terrain, error: terrainError } = await supabase
      .from("terrains")
      .select("id, nom, prix")
      .eq("id", terrain_id)
      .single();

    if (terrainError || !terrain) {
      return new Response(
        JSON.stringify({ error: "Terrain not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const amountUsd = (terrain.prix * MAD_TO_USD).toFixed(2);

    const accessToken = await getPayPalAccessToken();
    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: `Réservation ${terrain.nom} - Korador`,
            amount: {
              currency_code: "USD",
              value: amountUsd,
            },
          },
        ],
      }),
    });

    const order = await orderRes.json();

    if (!orderRes.ok) {
      return new Response(
        JSON.stringify({ error: "PayPal order creation failed", details: order }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount_dh: terrain.prix,
        amount_usd: amountUsd,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});