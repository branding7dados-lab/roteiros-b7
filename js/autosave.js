/* =====================================================================
   AUTOSAVE
   Regras:
   • digitação  → junta as alterações e grava ~650ms depois da última tecla;
   • estrutura  → grava na hora (criar, excluir, duplicar, reordenar…);
   • sem rede   → texto fica numa fila local e sobe quando a conexão volta;
                  ações estruturais são bloqueadas, com aviso claro.
   O indicador do topo mostra sempre o estado real: nada de "Salvo" quando
   não salvou.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.Save = (function () {
  const ESPERA = 650;
  const CHAVE_FILA = 'b7_fila_pendente';

  let pendentes = new Map();   // "tabela:id" -> patch acumulado
  let timer = null;
  let emVoo = 0;
  let ultimoErro = null;
  /* há um indicador no topo de cada tela; todos mostram o mesmo estado */

  /* ------------------------------------------------------- indicador */
  function pintar(estado, texto) {
    document.querySelectorAll('.salvamento').forEach(el => {
      el.className = 'salvamento ' + estado;
      el.querySelector('.txt').textContent = texto;
      el.onclick = estado === 'erro' ? tentarNovamente : null;
      el.title = estado === 'erro' ? 'Clique para tentar salvar de novo' : '';
    });
  }
  function atualizar() {
    if (!navigator.onLine) {
      const n = pendentes.size + fila().length;
      return pintar('offline', n ? 'Sem conexão · ' + n + ' pendente' + (n > 1 ? 's' : '') : 'Sem conexão');
    }
    if (ultimoErro) return pintar('erro', 'Erro ao salvar · tentar novamente');
    if (emVoo > 0 || pendentes.size) return pintar('salvando', 'Salvando…');
    pintar('salvo', 'Salvo ✓');
  }

  /* ------------------------------------------------- fila do offline */
  function fila() {
    try { return JSON.parse(localStorage.getItem(CHAVE_FILA) || '[]'); } catch (e) { return []; }
  }
  function gravarFila(f) {
    try { localStorage.setItem(CHAVE_FILA, JSON.stringify(f)); } catch (e) {}
  }
  function enfileirar(tabela, id, patch) {
    const f = fila();
    const existente = f.find(x => x.tabela === tabela && x.id === id);
    if (existente) Object.assign(existente.patch, patch);
    else f.push({ tabela, id, patch });
    gravarFila(f);
  }
  async function escoarFila() {
    const f = fila();
    if (!f.length) return;
    gravarFila([]);
    for (const item of f) {
      try { await gravarDireto(item.tabela, item.id, item.patch); }
      catch (e) { enfileirar(item.tabela, item.id, item.patch); ultimoErro = e; }
    }
    atualizar();
  }

  async function gravarDireto(tabela, id, patch) {
    if (tabela === 'roteiros') return B7.DB.atualizarRoteiro(id, patch);
    if (tabela === 'cenas') return B7.DB.atualizarCena(id, patch);
    if (tabela === 'gravacoes') return B7.DB.atualizarGravacao(id, patch);
    if (tabela === 'clientes') return B7.DB.atualizarCliente(id, patch);
    throw new Error('Tabela desconhecida: ' + tabela);
  }

  /* --------------------------------------------------------- digitação */
  function campo(tabela, id, patch) {
    const chave = tabela + ':' + id;
    const atual = pendentes.get(chave) || { tabela, id, patch: {} };
    Object.assign(atual.patch, patch);
    pendentes.set(chave, atual);
    ultimoErro = null;
    atualizar();
    clearTimeout(timer);
    timer = setTimeout(descarregar, ESPERA);
  }

  async function descarregar() {
    if (!pendentes.size) return;
    const lote = [...pendentes.values()];
    pendentes.clear();

    if (!navigator.onLine) {
      lote.forEach(i => enfileirar(i.tabela, i.id, i.patch));
      atualizar();
      return;
    }

    emVoo++;
    atualizar();
    for (const item of lote) {
      try {
        await gravarDireto(item.tabela, item.id, item.patch);
        ultimoErro = null;
      } catch (e) {
        console.error('Falha ao salvar', item, e);
        ultimoErro = e;
        enfileirar(item.tabela, item.id, item.patch);
      }
    }
    emVoo--;
    atualizar();
  }

  /* Garante que tudo que está pendente vá para o banco agora. */
  async function agora() {
    clearTimeout(timer);
    await descarregar();
  }

  /* ------------------------------------------- ações que salvam já */
  async function acao(promessa, textoOk) {
    if (!navigator.onLine) {
      B7.UI.toast('Sem conexão — a ação não foi salva. Reconecte e tente de novo.', { tipo: 'erro' });
      throw new Error('offline');
    }
    emVoo++; atualizar();
    try {
      const r = await (typeof promessa === 'function' ? promessa() : promessa);
      ultimoErro = null;
      if (textoOk) B7.UI.toast(textoOk);
      return r;
    } catch (e) {
      ultimoErro = e;
      console.error(e);
      B7.UI.toast('Erro ao salvar: ' + (e.message || 'tente novamente'), { tipo: 'erro' });
      throw e;
    } finally {
      emVoo--; atualizar();
    }
  }

  async function tentarNovamente() {
    ultimoErro = null;
    atualizar();
    await escoarFila();
    await descarregar();
    if (!ultimoErro) B7.UI.toast('Alterações salvas');
  }

  function temPendencias() { return pendentes.size > 0 || fila().length > 0 || emVoo > 0; }

  /* ------------------------------------------------------------ eventos */
  window.addEventListener('online', () => {
    B7.UI.toast('Conexão restabelecida — enviando alterações pendentes');
    escoarFila().then(atualizar);
  });
  window.addEventListener('offline', atualizar);
  window.addEventListener('beforeunload', e => {
    if (temPendencias()) { e.preventDefault(); e.returnValue = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) agora(); });

  return { campo, acao, agora, atualizar, tentarNovamente, temPendencias, escoarFila };
})();
