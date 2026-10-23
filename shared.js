(() => {
  const SUPABASE_URL = 'https://cclxkyorlhomlppmakqq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_zblri1nzPme3N4AR-Q4BmA_lRzUjqWk';
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const empty = () => ({ clients: [], vehicles: [], products: [], orders: [], payments: [], settings: { company: 'Minha Oficina' } });
  let currentUser = null;
  let payload = empty();
  let revision = 0;

  async function readAccount() {
    const { data, error } = await client.from('oficinapro_accounts').select('payload,revision').eq('user_id', currentUser.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      const { error: insertError } = await client.from('oficinapro_accounts').insert({ user_id: currentUser.id, payload: empty(), revision: 0 });
      if (insertError && insertError.code !== '23505') throw insertError;
      return readAccount();
    }
    payload = { ...empty(), ...data.payload };
    for (const key of ['clients', 'vehicles', 'products', 'orders', 'payments']) if (!Array.isArray(payload[key])) payload[key] = [];
    payload.settings = { ...empty().settings, ...(payload.settings || {}) };
    revision = Number(data.revision || 0);
    return { user: currentUser, data: structuredClone(payload), revision };
  }
  async function initialize() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    currentUser = data.session?.user || null;
    return currentUser ? readAccount() : { user: null, data: empty(), revision: 0 };
  }
  async function signUp(email, password) {
    return client.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: location.origin + location.pathname } });
  }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    currentUser = data.user;
    return readAccount();
  }
  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    currentUser = null;
    payload = empty();
    revision = 0;
  }
  async function save(next) {
    if (!currentUser) throw new Error('Entre na sua conta para salvar.');
    const { data, error } = await client.from('oficinapro_accounts').update({ payload: next, revision: revision + 1, updated_at: new Date().toISOString() }).eq('user_id', currentUser.id).eq('revision', revision).select('revision').maybeSingle();
    if (error) throw error;
    if (!data) {
      await readAccount();
      throw new Error('Os dados foram atualizados em outro aparelho. A tela foi recarregada; confira antes de editar de novo.');
    }
    payload = structuredClone(next);
    revision = Number(data.revision);
    return { revision };
  }
  async function reload() { return currentUser ? readAccount() : { user: null, data: empty(), revision: 0 }; }
  function onAuthStateChange(callback) { return client.auth.onAuthStateChange(callback); }
  window.OfficeProStore = { initialize, signUp, signIn, signOut, save, reload, onAuthStateChange, empty };
  window.OfficeProUtil = {
    money: value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0)),
    date: value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—',
    id: () => crypto.randomUUID(),
    escape: value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
  };
})();

