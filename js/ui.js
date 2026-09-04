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
    fundo.className = 'fundo-modal' + (opcoes.classe ? ' ' + opcoes.classe : '');
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
  /* ------------------------------------------------- avatar do cliente
     Um lugar só decide entre logo e iniciais. Usado no dashboard, na
     lista de clientes, nas gravações, na busca e na paleta.
     A logo do cliente nunca é recolorida, cortada ou distorcida. */
  function avatarCliente(nome, logoUrl, classe) {
    const cls = 'avatar' + (classe ? ' ' + classe : '');
    if (logoUrl) {
      return '<div class="' + cls + ' com-logo"><img src="' + esc(logoUrl) + '" alt="' + esc(nome || '') + '" ' +
        'onerror="this.parentElement.classList.remove(\'com-logo\');' +
        'this.parentElement.textContent=this.dataset.ini" data-ini="' + esc(iniciais(nome)) + '"></div>';
    }
    return '<div class="' + cls + '">' + esc(iniciais(nome)) + '</div>';
  }

  /* "Mercato Sadia" → MS · "ClimaPro" → CP · "Águas Mucugê" → ÁM
     Nome de uma palavra só usa a maiúscula interna quando existe
     (ClimaPro, AutoEscola); sem ela, cai nas duas primeiras letras. */
  function iniciais(nome) {
    const limpo = (nome || '?').trim();
    if (!limpo) return '?';
    const partes = limpo.split(/\s+/).filter(Boolean);
    if (partes.length > 1) return (partes[0][0] + partes[1][0]).toUpperCase();
    const interna = partes[0].slice(1).match(/[A-ZÀ-Þ0-9]/);
    return (partes[0][0] + (interna ? interna[0] : (partes[0][1] || ''))).toUpperCase();
  }
  function classeStatus(s) {
    if (s === 'Gravado') return 'gravado';
    if (s === 'Pronto para gravar') return 'pronto';
    return 'rascunho';
  }
  function chipStatus(s) {
    return '<span class="chip-status ' + classeStatus(s) + '">' + esc(s || 'Rascunho') + '</span>';
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
  /* Ctrl+K: ações e busca de cliente, gravação e roteiro no mesmo lugar.
     Navegação por ↑ ↓ Enter Esc. */
  const ICP = {
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    pessoa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/></svg>',
    grav: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5l6-3.5v10l-6-3.5z"/></svg>',
    rot:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h9l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1-1.5z"/><path d="M14 3.5V9h5"/></svg>'
  };

  function paleta() {
    const acoes = [
      { ic: ICP.mais,   rot: 'Nova gravação',  dica: 'começar um grupo de roteiros', fn: () => B7.Dashboard.modalNovaGravacao() },
      { ic: ICP.pessoa, rot: 'Novo cliente',   dica: 'cadastrar um cliente',         fn: () => B7.Dashboard.modalNovoCliente() },
      { ic: ICP.play,   rot: 'Abrir gravação recente', dica: 'últimas gravações editadas', fn: () => recentes() },
      { ic: ICP.grav,   rot: 'Ver gravações',  dica: 'todas as gravações',           fn: () => { location.hash = '#/gravacoes'; } }
    ];

    const m = modal(
      '<div class="busca-cp"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input id="cp-in" data-foco placeholder="Buscar ou executar uma ação…"></div>' +
      '<div class="cp-lista" id="cp-lista"></div>' +
      '<div class="cp-pe"><span><kbd>↑↓</kbd>navegar</span><span><kbd>Enter</kbd>abrir</span>' +
      '<span><kbd>Esc</kbd>fechar</span></div>', { classe: 'paleta' });

    const entrada = m.querySelector('#cp-in');
    const lista = m.querySelector('#cp-lista');
    let itens = [], foco = 0;

    function pintar(html, novosItens) {
      lista.innerHTML = html;
      itens = novosItens;
      foco = 0;
      marcar();
      [...lista.querySelectorAll('.cp-item')].forEach((b, i) => b.onclick = () => executar(i));
    }
    function marcar() {
      [...lista.querySelectorAll('.cp-item')].forEach((b, i) => b.classList.toggle('ativo', i === foco));
      const ativo = lista.querySelector('.cp-item.ativo');
      if (ativo) ativo.scrollIntoView({ block: 'nearest' });
    }
    function executar(i) {
      const it = itens[i];
      if (!it) return;
      m.fechar();
      it.fn();
    }
    const linha = (ic, titulo, sub) =>
      '<button class="cp-item"><div class="ic">' + ic + '</div><div><b>' + esc(titulo) +
      '</b><small>' + esc(sub) + '</small></div></button>';

    function mostrarAcoes(filtro) {
      const f = (filtro || '').toLowerCase();
      const lst = acoes.filter(a => !f || (a.rot + ' ' + a.dica).toLowerCase().includes(f));
      pintar('<div class="cp-grupo">AÇÕES</div>' + lst.map(a => linha(a.ic, a.rot, a.dica)).join(''), lst);
    }
    mostrarAcoes('');

    const procurar = debounce(async termo => {
      if (!termo.trim()) return mostrarAcoes('');
      const acoesFiltradas = acoes.filter(a => (a.rot + ' ' + a.dica).toLowerCase().includes(termo.toLowerCase()));
      let html = '', novos = [];
      if (acoesFiltradas.length) {
        html += '<div class="cp-grupo">AÇÕES</div>' + acoesFiltradas.map(a => linha(a.ic, a.rot, a.dica)).join('');
        novos = novos.concat(acoesFiltradas);
      }
      try {
        const r = await B7.DB.buscar(termo);
        if (r.clientes.length) {
          html += '<div class="cp-grupo">CLIENTES</div>' + r.clientes.map(c =>
            linha(c.logo_url ? '<img src="' + esc(c.logo_url) + '" style="width:100%;height:100%;object-fit:contain">'
                             : '<span>' + esc(iniciais(c.nome)) + '</span>', c.nome,
              c.total_gravacoes + ' gravaç' + (c.total_gravacoes === 1 ? 'ão' : 'ões'))).join('');
          novos = novos.concat(r.clientes.map(c => ({ fn: () => { location.hash = '#/cliente/' + c.id; } })));
        }
        if (r.gravacoes.length) {
          html += '<div class="cp-grupo">GRAVAÇÕES</div>' + r.gravacoes.map(g =>
            linha(ICP.grav, g.nome, g.cliente_nome)).join('');
          novos = novos.concat(r.gravacoes.map(g => ({ fn: () => { location.hash = '#/gravacao/' + g.id; } })));
        }
        if (r.roteiros.length) {
          html += '<div class="cp-grupo">ROTEIROS</div>' + r.roteiros.map(t =>
            linha(ICP.rot, t.titulo || 'Sem título', 'abrir na gravação')).join('');
          novos = novos.concat(r.roteiros.map(t => ({
            fn: () => { location.hash = '#/gravacao/' + t.recording_session_id + '?roteiro=' + t.id; } })));
        }
      } catch (e) { /* sem banco: só as ações */ }
      pintar(html || '<div class="nada" style="padding:26px;text-align:center;color:var(--ink-3)">Nada encontrado</div>', novos);
    }, 220);

    entrada.oninput = () => procurar(entrada.value);
    entrada.onkeydown = e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); foco = Math.min(foco + 1, itens.length - 1); marcar(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); foco = Math.max(foco - 1, 0); marcar(); }
      if (e.key === 'Enter')     { e.preventDefault(); executar(foco); }
    };
  }

  async function recentes() {
    try {
      const lista = await B7.DB.gravacoesRecentes(8);
      if (!lista.length) return toast('Nenhuma gravação ainda');
      const m = modal('<h3>Gravações recentes</h3><div class="sub">Escolha onde continuar.</div>' +
        '<div class="corpo">' + lista.map(g =>
          '<button class="cp-item" data-id="' + esc(g.id) + '"><div class="ic">' + ICP.grav + '</div>' +
          '<div><b>' + esc(g.nome) + '</b><small>' + esc(g.cliente_nome) + ' · ' + g.total_roteiros +
          ' roteiro' + (g.total_roteiros === 1 ? '' : 's') + ' · editado ' + quando(g.updated_at) +
          '</small></div></button>').join('') + '</div>' +
        '<div class="acoes"><button class="b" data-fecha>Fechar</button></div>');
      m.querySelectorAll('.cp-item').forEach(b => b.onclick = () => {
        m.fechar(); location.hash = '#/gravacao/' + b.dataset.id;
      });
    } catch (e) { toast('Não consegui buscar as gravações', { tipo: 'erro' }); }
  }

  /* lista de atalhos, para quem quiser trabalhar sem tirar a mão do teclado */
  function atalhos() {
    const linha = (t, d) => '<div style="display:flex;align-items:center;gap:12px;padding:10px 2px;' +
      'border-bottom:1px solid var(--borda)"><kbd style="font-family:inherit;background:var(--suave);' +
      'border-radius:6px;padding:4px 9px;font-size:12px;font-weight:600;min-width:74px;text-align:center">' +
      t + '</kbd><span style="font-size:13.5px;color:var(--ink-2)">' + d + '</span></div>';
    modal('<h3>Atalhos</h3><div class="sub">Funcionam em qualquer tela do sistema.</div>' +
      '<div class="corpo">' +
      linha('Ctrl K', 'ações rápidas e busca') +
      linha('/', 'ir para a busca do topo') +
      linha('Ctrl S', 'forçar o salvamento agora') +
      linha('Ctrl P', 'imprimir (dentro do editor)') +
      linha('Esc', 'fechar janela aberta') +
      '</div><div class="acoes"><button class="b pri" data-fecha>Entendi</button></div>');
  }

  return { atalhos, avatarCliente, esc, toast, modal, confirmar, ligarMenus, dica, esconderDica, MESES, paleta,
           dataBR, mesRotulo, quando, iniciais, chipStatus, classeStatus, hojeISO, debounce, autoAltura };
})();
