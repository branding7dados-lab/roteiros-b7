/* =====================================================================
   Cliente Supabase + verificação de configuração
   ===================================================================== */

window.B7 = window.B7 || {};

(function () {
  const cfg = window.B7_CONFIG || {};
  const faltando = !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY ||
                   cfg.SUPABASE_URL === 'COLE_AQUI' ||
                   cfg.SUPABASE_PUBLISHABLE_KEY === 'COLE_AQUI';

  B7.configurado = !faltando;
  B7.sb = null;

  if (!faltando && window.supabase && window.supabase.createClient) {
    B7.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  /* Preferências locais (zoom, painel, modo foco, último roteiro).
     Só isso mora no navegador — nenhum dado de roteiro. */
  B7.pref = {
    ler(chave, padrao) {
      try { const v = localStorage.getItem('b7_pref_' + chave); return v === null ? padrao : JSON.parse(v); }
      catch (e) { return padrao; }
    },
    gravar(chave, valor) {
      try { localStorage.setItem('b7_pref_' + chave, JSON.stringify(valor)); } catch (e) {}
    }
  };
})();
