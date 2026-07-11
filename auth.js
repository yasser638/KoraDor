// ==========================================================
// KORADOR — Authentification Supabase (Phase 1)
// ==========================================================
// ⚠️ Remplace ces deux valeurs par celles de TON projet Supabase
// (Dashboard Supabase > Project Settings > API)
const SUPABASE_URL = 'https://TON-PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'TA_CLE_ANON_PUBLIQUE';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Inscription ----------
async function kdSignUp({ email, password, nom, role }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { nom, role } // récupéré automatiquement par le trigger handle_new_user() côté SQL
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

// ---------- Vérifie le code de confirmation reçu par email (inscription) ----------
async function kdVerifyOtp({ email, token }) {
  const { data, error } = await supabaseClient.auth.verifyOtp({
    email,
    token,
    type: 'signup'
  });
  if (error) throw error;
  return data;
}

// ---------- Renvoie un nouveau code si l'utilisateur ne l'a pas reçu ----------
async function kdResendCode({ email }) {
  const { error } = await supabaseClient.auth.resend({ type: 'signup', email });
  if (error) throw error;
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
