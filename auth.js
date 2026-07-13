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
      data: { nom, role, cin, telephone } // récupéré automatiquement par le trigger handle_new_user() côté SQL
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
