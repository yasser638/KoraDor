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

// ---------- Récupère les créneaux déjà réservés pour un terrain (et sous-terrain) à une date donnée ----------
// Passe par une fonction SQL dédiée (get_reserved_slots) plutôt que par une lecture directe
// de la table `reservations`, pour que n'importe quel visiteur puisse voir les horaires pris
// SANS avoir accès aux infos privées des autres clients (nom, téléphone, CIN, email).
async function kdGetReservedSlots({ terrain_id, numero_terrain, date_reservation }) {
  const { data, error } = await supabaseClient.rpc('get_reserved_slots', {
    p_terrain_id: terrain_id,
    p_numero_terrain: numero_terrain,
    p_date: date_reservation
  });
  if (error) throw error;
  return (data || []).map(r => r.heure_reservation);
}

// ---------- Crée une réservation ----------
// Fonctionne aussi pour un visiteur non connecté (user_id sera alors null).
async function kdCreateReservation({ terrain_id, numero_terrain, date_reservation, heure_reservation, nom_client, telephone_client, cin_client, email_client }) {
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
