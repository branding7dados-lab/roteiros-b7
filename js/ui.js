/* =====================================================================
   COMPONENTES DE INTERFACE
   Toasts, modais, confirmação, menus, dica flutuante e utilitários.
   Nada de alert() nas ações comuns.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.UI = (function () {
  const esc = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ------------------------------------------------------------ toasts */
  function toast(msg, opcoes = {}) {
    const cx = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (opcoes.tipo === 'erro' ? ' erro' : '');
    el.innerHTML = '<span>' + esc(msg) + '</span>';
    if (opcoes.acao) {
      const b = document.createElement('button');
      b.className = 'acao';
      b.textContent = opcoes.acao;
      b.onclick = () => { fecha(); opcoes.aoClicar && opcoes.aoClicar(); };
      el.appendChild(b);
    }
    cx.appendChild(el);
    const tempo = opcoes.tempo || (opcoes.acao ? 7000 : 3200);
    const t = setTimeout(fecha, tempo);
    function fecha() {
      clearTimeout(t);
      el.classList.add('saindo');
      setTimeout(() => el.remove(), 200);
    }
    return fecha;
  }

  /* ------------------------------------------------------------ modais */
  function modal(html, opcoes = {}) {
    const fundo = document.createElement('div');
    fundo.className = 'fundo-modal';
    fundo.innerHTML = '<div class="modal' + (opcoes.larga ? ' larga' : '') + '">' + html + '</div>';
    fundo.addEventListener('mousedown', e => { if (e.target === fundo) fechar(); });
    document.addEventListener('keydown', tecla);
    function tecla(e) { if (e.key === 'Escape') fechar(); }
    function fechar() {
      document.removeEventListener('keydown', tecla);
      fundo.remove();
      opcoes.aoFechar && opcoes.aoFechar();
    }
    fundo.fechar = fechar;
    document.body.appendChild(fundo);
    fundo.querySelectorAll('[data-fecha]').forEach(b => b.onclick = fechar);
    const foco = fundo.querySelector('[data-foco]');
    if (foco) { foco.focus(); if (foco.select) foco.select(); }
    return fundo;
  }

  function confirmar({ titulo, texto, rotulo = 'Confirmar', perigo = false, aoConfirmar }) {
    const m = modal(
      '<h3>' + esc(titulo) + '</h3><div class="sub">' + esc(texto) + '</div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b ' + (perigo ? 'pri' : 'pri') + '" data-ok data-foco>' + esc(rotulo) + '</button></div>');
    m.querySelector('[data-ok]').onclick = () => { m.fechar(); aoConfirmar(); };
    return m;
  }

  /* ------------------------------------------------------------- menus */
  function ligarMenus(raiz = document) {
    raiz.querySelectorAll('.menu > button').forEach(b => {
      if (b.dataset.ligado) return;
      b.dataset.ligado = '1';
      b.addEventListener('click', e => {
        e.stopPropagation();
        const menu = b.parentElement;
        const jaAberto = menu.classList.contains('aberto');
        document.querySelectorAll('.menu.aberto').forEach(m => m.classList.remove('aberto'));
        if (!jaAberto) menu.classList.add('aberto');
      });
    });
  }
  document.addEventListener('click', () => {
    document.querySelectorAll('.menu.aberto').forEach(m => m.classList.remove('aberto'));
  });

  /* ------------------------------------------------------------- dica */
  let dicaEl = null;
  function dica(alvo, texto) {
    esconderDica();
    if (!texto) return;
    dicaEl = document.createElement('div');
    dicaEl.className = 'dica';
    dicaEl.textContent = texto;
    document.body.appendChild(dicaEl);
    const r = alvo.getBoundingClientRect();
    dicaEl.style.left = Math.min(window.innerWidth - dicaEl.offsetWidth - 10, r.right + 10) + 'px';
    dicaEl.style.top = (r.top + r.height / 2 - dicaEl.offsetHeight / 2) + 'px';
  }
  function esconderDica() { if (dicaEl) { dicaEl.remove(); dicaEl = null; } }

  /* --------------------------------------------------------- utilidades */
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function dataBR(iso) {
    if (!iso) return '';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return d + '/' + m + '/' + a;
  }
  function mesRotulo(iso) {
    if (!iso) return 'Sem data';
    const [a, m] = String(iso).slice(0, 10).split('-');
    return (MESES[+m - 1] || '') + ' ' + a;
  }
  function quando(iso) {
    if (!iso) return '';
    const d = new Date(iso), agora = new Date();
    const seg = (agora - d) / 1000;
    if (seg < 60) return 'agora há pouco';
    if (seg < 3600) return 'há ' + Math.floor(seg / 60) + ' min';
    if (d.toDateString() === agora.toDateString()) return 'hoje às ' + d.toTimeString().slice(0, 5);
    const ontem = new Date(agora); ontem.setDate(agora.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return 'ontem';
    if (seg < 604800) return 'há ' + Math.floor(seg / 86400) + ' dias';
    return d.toLocaleDateString('pt-BR');
  }
  function iniciais(nome) {
    return (nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
  function classeStatus(s) {
    if (s === 'Gravado') return 'gravado';
    if (s === 'Pronto para gravar') return 'pronto';
    return 'rascunho';
  }
  function badgeStatus(s) {
    return '<span class="badge-status ' + classeStatus(s) + '">' + esc(s || 'Rascunho') + '</span>';
  }
  function hojeISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function debounce(fn, ms) {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  }
  function autoAltura(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }

  /* ------------------------------------------------ paleta de comandos */
  /* Ctrl+K / Cmd+K: as quatro ações mais usadas sem tirar a mão do teclado. */
  function paleta() {
    const acoes = [
      { rot: 'Nova gravação',          dica: 'criar uma gravação para um cliente', fn: () => B7.Dashboard.modalNovaGravacao() },
      { rot: 'Novo cliente',           dica: 'cadastrar um cliente',               fn: () => B7.Dashboard.modalNovoCliente() },
      { rot: 'Abrir gravação recente', dica: 'últimas gravações editadas',         fn: () => abrirRecente() },
      { rot: 'Buscar roteiro',         dica: 'procurar por título',                fn: () => irParaBusca() }
    ];
    const m = modal('<h3>O que você quer fazer?</h3>' +
      '<input class="campo mb" id="cp-filtro" data-foco placeholder="Digite para filtrar…">' +
      '<div class="corpo" id="cp-lista">' + acoes.map((a, i) =>
        '<button class="cp-item" data-i="' + i + '"><b>' + esc(a.rot) + '</b><small>' + esc(a.dica) + '</small></button>'
      ).join('') + '</div>');

    const filtro = m.querySelector('#cp-filtro');
    const itens = () => [...m.querySelectorAll('.cp-item')].filter(b => b.style.display !== 'none');
    let foco = 0;
    const pintar = () => itens().forEach((b, i) => b.classList.toggle('ativo', i === foco));
    pintar();

    filtro.oninput = () => {
      const q = filtro.value.toLowerCase();
      m.querySelectorAll('.cp-item').forEach(b => {
        b.style.display = b.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      foco = 0; pintar();
    };
    filtro.onkeydown = e => {
      const lista = itens();
      if (e.key === 'ArrowDown') { e.preventDefault(); foco = Math.min(foco + 1, lista.length - 1); pintar(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); foco = Math.max(foco - 1, 0); pintar(); }
      if (e.key === 'Enter' && lista[foco]) { e.preventDefault(); lista[foco].click(); }
    };
    m.querySelectorAll('.cp-item').forEach(b => b.onclick = () => {
      m.fechar();
      acoes[+b.dataset.i].fn();
    });
  }

  async function abrirRecente() {
    try {
      const recentes = await B7.DB.gravacoesRecentes(8);
      if (!recentes.length) return toast('Nenhuma gravação ainda');
      const m = modal('<h3>Gravações recentes</h3>' +
        '<div class="corpo">' + recentes.map(g =>
          '<button class="cp-item" data-id="' + esc(g.id) + '"><b>' + esc(g.nome) + '</b>' +
          '<small>' + esc(g.cliente_nome) + ' · ' + g.total_roteiros + ' roteiro' +
          (g.total_roteiros === 1 ? '' : 's') + ' · editado ' + quando(g.updated_at) + '</small></button>'
        ).join('') + '</div>');
      m.querySelectorAll('.cp-item').forEach(b => b.onclick = () => {
        m.fechar(); location.hash = '#/gravacao/' + b.dataset.id;
      });
    } catch (e) { toast('Não consegui buscar as gravações', { tipo: 'erro' }); }
  }

  function irParaBusca() {
    location.hash = '#/';
    setTimeout(() => { const c = document.getElementById('campo-busca'); if (c) c.focus(); }, 120);
  }

  return { esc, toast, modal, confirmar, ligarMenus, dica, esconderDica, MESES, paleta,
           dataBR, mesRotulo, quando, iniciais, badgeStatus, classeStatus, hojeISO, debounce, autoAltura };
})();
