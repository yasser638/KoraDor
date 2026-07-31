// supabase/functions/create-paypal-order/index.ts
//
// Deploy with: supabase functions deploy create-paypal-order
// Env vars needed (set via `supabase secrets set`):
//   PAYPAL_CLIENT_ID
//   PAYPAL_CLIENT_SECRET
//   PAYPAL_API_BASE          -> https://api-m.sandbox.paypal.com (sandbox) or https://api-m.paypal.com (live)
//   SUPABASE_URL             -> auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY-> auto-injected by Supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE")!;
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tqder tbeddlha l domain ta3 Korador f production
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
    const { terrain_id, date, heure_debut, heure_fin, user_id } = await req.json();

    if (!terrain_id || !date || !heure_debut || !heure_fin || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client: bypasses RLS, so we control exactly what's trusted here.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Get the real price from DB — NEVER trust a price sent from the client.
    const { data: terrain, error: terrainError } = await supabase
      .from("terrains")
      .select("id, nom, prix_heure")
      .eq("id", terrain_id)
      .single();

    if (terrainError || !terrain) {
      return new Response(
        JSON.stringify({ error: "Terrain not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Check the slot isn't already booked (basic race-condition guard).
    const { data: conflict } = await supabase
      .from("reservations")
      .select("id")
      .eq("terrain_id", terrain_id)
      .eq("date", date)
      .eq("heure_debut", heure_debut)
      .neq("status", "cancelled")
      .maybeSingle();

    if (conflict) {
      return new Response(
        JSON.stringify({ error: "Slot already booked" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Calculate duration -> amount (assumes heure_debut/heure_fin as "HH:MM")
    const [hStart, mStart] = heure_debut.split(":").map(Number);
    const [hEnd, mEnd] = heure_fin.split(":").map(Number);
    const durationHours = (hEnd * 60 + mEnd - (hStart * 60 + mStart)) / 60;
    const amount = (terrain.prix_heure * durationHours).toFixed(2);

    // 4. Create a pending reservation row so we have a record to reconcile against.
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .insert({
        terrain_id,
        user_id,
        date,
        heure_debut,
        heure_fin,
        status: "pending_payment",
        montant: amount,
      })
      .select()
      .single();

    if (resError) {
      return new Response(
        JSON.stringify({ error: "Could not create reservation", details: resError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Create the PayPal order.
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
            reference_id: reservation.id,
            description: `Réservation ${terrain.nom} - ${date} ${heure_debut}`,
            amount: {
              currency_code: "USD", // PayPal sandbox default; switch currency per your PayPal account setup
              value: amount,
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

    // Store the PayPal order id on the reservation so capture step can verify it.
    await supabase
      .from("reservations")
      .update({ paypal_order_id: order.id })
      .eq("id", reservation.id);

    return new Response(
      JSON.stringify({ order_id: order.id, reservation_id: reservation.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
