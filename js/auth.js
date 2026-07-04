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

export async function signOut() {
  await supabase.auth.signOut();
  store.session = null;
  store.settings = null;
  store.categories = [];
}
