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

export async function updateProfile({ fullName }) {
  const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (error) throw error;
  if (store.session) store.session.user = data.user;
  return data.user;
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data.user;
}
