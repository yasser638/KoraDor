// ==========================================================
// KORADOR — Authentification Supabase (Phase 1)
// ==========================================================
// ⚠️ Remplace ces deux valeurs par celles de TON projet Supabase
// (Dashboard Supabase > Project Settings > API)
const SUPABASE_URL = 'https://klbgyejlqxeuyrxxorhy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__cifG7S3Xu5VWQn7Luos6Q_uCufqc_M';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Inscription ----------
async function kdSignUp({ email, password, nom, role, cin, telephone }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { nom, role, cin, telephone }, // récupéré automatiquement par le trigger handle_new_user() côté SQL
      emailRedirectTo: 'https://korador.vercel.app/login.html'
    }
  });
  if (error) throw error;
  return data;
}

// ---------- Connexion ----------
async function kdSignIn({ email, password }) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ---------- Vérifie le code à 6 chiffres reçu par email après l'inscription ----------
async function kdVerifyOtp({ email, token, type = 'signup' }) {
  const { data, error } = await supabaseClient.auth.verifyOtp({ email, token, type });
  if (error) throw error;
  return data;
}

// ---------- Renvoie un nouveau code de confirmation ----------
async function kdResendCode({ email, type = 'signup' }) {
  const { data, error } = await supabaseClient.auth.resend({ type, email });
  if (error) throw error;
  return data;
}

// ---------- Récupère le profil (et donc le rôle) de l'utilisateur connecté ----------
async function kdGetProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ---------- Déconnexion ----------
async function kdSignOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ---------- Vérifie si quelqu'un est déjà connecté au chargement de la page ----------
async function kdCheckSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

// ---------- Jeton de session (identifie cet onglet/navigateur pour les holds temporaires) ----------
const kdSessionToken = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// ---------- Récupère les créneaux déjà réservés OU actuellement "tenus" par un autre visiteur ----------
async function kdGetReservedSlots({ terrain_id, numero_terrain, date_reservation }) {
  const { data, error } = await supabaseClient.rpc('get_reserved_slots', {
    p_terrain_id: terrain_id,
    p_numero_terrain: numero_terrain,
    p_date: date_reservation,
    p_session_token: kdSessionToken
  });
  if (error) throw error;
  return (data || []).map(r => r.heure_reservation);
}

// ---------- Verrouille temporairement un créneau (5 min) pendant que l'utilisateur finalise sa réservation ----------
async function kdCreateHold({ terrain_id, numero_terrain, date_reservation, heure_reservation }) {
  const { data, error } = await supabaseClient.rpc('create_hold', {
    p_terrain_id: terrain_id,
    p_numero_terrain: numero_terrain,
    p_date: date_reservation,
    p_heure: heure_reservation,
    p_session_token: kdSessionToken
  });
  if (error) {
    if (error.message && error.message.includes('SLOT_TAKEN')) {
      const e = new Error("Ce créneau vient d'être réservé par quelqu'un d'autre.");
      e.code = 'SLOT_TAKEN';
      throw e;
    }
    if (error.message && error.message.includes('SLOT_HELD')) {
      const e = new Error("Quelqu'un d'autre est en train de réserver ce créneau. Réessaie dans quelques minutes.");
      e.code = 'SLOT_HELD';
      throw e;
    }
    throw error;
  }
  return data; // id du hold
}

// ---------- Libère le hold de cette session (annulation, retour en arrière, fermeture du modal) ----------
async function kdReleaseHold() {
  try {
    await supabaseClient.rpc('release_hold', { p_session_token: kdSessionToken });
  } catch (err) {
    console.error('Korador: erreur libération hold —', err);
  }
}


// ---------- Crée une réservation ----------
// Fonctionne aussi pour un visiteur non connecté (user_id sera alors null).
async function kdCreateReservation({ terrain_id, numero_terrain, date_reservation, heure_reservation, nom_client, telephone_client, cin_client, email_client, paypal_capture_id }) {
  const session = await kdCheckSession();

  const { error } = await supabaseClient
    .from('reservations')
    .insert({
      terrain_id,
      numero_terrain,
      date_reservation,
      heure_reservation,
      user_id: session ? session.user.id : null,
      nom_client,
      telephone_client,
      cin_client,
      email_client,
      paypal_capture_id: paypal_capture_id || null,
      statut: 'en_attente'
    });

  if (error) {
    // Code 23505 = violation de contrainte unique -> quelqu'un d'autre vient de prendre ce créneau
    if (error.code === '23505') {
      const conflictErr = new Error("Ce créneau vient d'être réservé par quelqu'un d'autre. Choisis-en un autre.");
      conflictErr.code = 'SLOT_TAKEN';
      throw conflictErr;
    }
    throw error;
  }

  return true;
}

// ---------- Récupère toutes les réservations de l'utilisateur connecté ----------
async function kdGetMyReservations() {
  const session = await kdCheckSession();
  if (!session) return [];
  const { data, error } = await supabaseClient
    .from('reservations')
    .select('*, terrains(nom, quartier, prix, photo), avis(id)')
    .eq('user_id', session.user.id)
    .order('date_reservation', { ascending: false })
    .order('heure_reservation', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------- Annule une réservation (la sienne uniquement, via RLS) ----------
async function kdCancelReservation(reservationId) {
  const { error } = await supabaseClient
    .from('reservations')
    .update({ statut: 'annulee' })
    .eq('id', reservationId);
  if (error) throw error;
}

// ---------- Laisse un avis sur un terrain après une réservation jouée ----------
async function kdSubmitAvis({ reservation_id, terrain_id, note, commentaire }) {
  const session = await kdCheckSession();
  if (!session) throw new Error('Connecte-toi pour laisser un avis.');
  const { error } = await supabaseClient
    .from('avis')
    .insert({ reservation_id, terrain_id, user_id: session.user.id, note, commentaire: commentaire || null });
  if (error) throw error;
}

// ---------- Récupère en un seul appel la session + le profil (nom, cin, téléphone, rôle) ----------
// Retourne null si personne n'est connecté ou si le profil n'est pas encore prêt.
// Utile pour pré-remplir des formulaires (ex: la modale de réservation).
async function kdGetCurrentProfile() {
  const session = await kdCheckSession();
  if (!session) return null;
  try {
    const profile = await kdGetProfile(session.user.id);
    return { ...profile, email: session.user.email };
  } catch (err) {
    return null;
  }
}
