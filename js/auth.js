import { supabase } from './supabase.js';
import { store } from './store.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  store.session = data.session;
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  store.session = data.session;
  return data.session;
}

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${location.origin}${location.pathname}`,
    },
  });
  if (error) throw error;
  store.session = data.session;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}${location.pathname}` },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  store.session = null;
  store.settings = null;
  store.categories = [];
}
