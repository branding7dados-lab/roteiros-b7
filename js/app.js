/* =====================================================================
   BOOT + ROTAS
   #/                 → dashboard
   #/cliente/<id>     → gravações daquele cliente
   #/gravacao/<id>    → editor  (?roteiro=<id> abre num roteiro específico)
   ===================================================================== */

window.B7 = window.B7 || {};

B7.Rota = (function () {
  let atual = '';

  function mostrar(tela) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById(tela).classList.add('ativa');
  }

  async function ir() {
    const bruto = location.hash || '#/';
    atual = bruto;
    const [caminho, query] = bruto.slice(1).split('?');
    const partes = caminho.split('/').filter(Boolean);
    const params = new URLSearchParams(query || '');

    B7.UI.esconderDica();

    /* #/diaria/ era o endereço da versão anterior; redireciona para não
       quebrar links que alguém já tenha guardado */
    if (partes[0] === 'diaria' && partes[1]) {
      location.replace('#/gravacao/' + partes[1] + (query ? '?' + query : ''));
      return;
    }
    if (partes[0] === 'gravacao' && partes[1]) {
      mostrar('tela-editor');
      document.querySelectorAll('.nav a').forEach(a =>
        a.classList.toggle('on', a.dataset.ir === '#/gravacoes'));
      if (B7.moverTrilha) B7.moverTrilha();
      document.body.dataset.aba = document.body.dataset.aba || 'editor';
      await B7.Editor.abrir(partes[1], params.get('roteiro'));
      if (params.get('imprimir')) setTimeout(() => B7.Editor.imprimir(), 350);
      return;
    }
    if (partes[0] === 'cliente' && partes[1]) {
      mostrar('tela-dashboard');
      await B7.Dashboard.abrirCliente(partes[1]);
      return;
    }
    if (partes[0] === 'config')     { mostrar('tela-dashboard'); return B7.Dashboard.abrirConfig(); }
    if (partes[0] === 'lixeira')    { mostrar('tela-dashboard'); return B7.Dashboard.abrirLixeira(); }
    if (partes[0] === 'arquivados') { mostrar('tela-dashboard'); return B7.Dashboard.abrirArquivados(); }
    if (partes[0] === 'clientes')  { mostrar('tela-dashboard'); return B7.Dashboard.abrirClientes(); }
    if (partes[0] === 'gravacoes') { mostrar('tela-dashboard'); return B7.Dashboard.abrirGravacoes(); }
    if (partes[0] === 'roteiros')  { mostrar('tela-dashboard'); return B7.Dashboard.abrirRoteiros(); }
    mostrar('tela-dashboard');
    await B7.Dashboard.abrir();
  }

  function recarregar() {
    const h = location.hash;
    if (h.startsWith('#/gravacao/')) location.hash = '#/';
    else ir();
  }

  window.addEventListener('hashchange', () => {
    /* garante que nada digitado se perca ao trocar de tela */
    B7.Save.agora().finally(ir);
  });

  /* título da aba acompanha o contexto */
  function titulo(partes) {
    document.title = partes && partes.length ? partes.join(' · ') + ' · Roteiros B7' : 'Roteiros B7';
  }

  return { ir, recarregar, titulo };
})();


/* ===================================================== inicialização */
(function iniciar() {
  document.addEventListener('DOMContentLoaded', async () => {

    /* ---- configuração ausente: explica em vez de quebrar ---- */
    if (!B7.configurado || !B7.sb) {
      if (B7.motivoConfig === 'painel') {
        document.querySelector('#setup h2').textContent = 'URL errada no config.js';
        document.querySelector('#setup p').innerHTML =
          'O endereço em <code>js/config.js</code> é o do painel do Supabase, não o do projeto. ' +
          'O certo termina em <b>.supabase.co</b> e está em Project Settings → API → Project URL:';
      }
      document.getElementById('setup').classList.add('ativo');
      return;
    }

    /* ---- topo: dashboard ---- */
    const busca = document.getElementById('campo-busca');
    const caixaRes = document.getElementById('resultados-busca');
    busca.addEventListener('input', () => B7.Dashboard.buscar(busca.value, caixaRes));
    busca.addEventListener('focus', () => { if (busca.value.trim()) caixaRes.classList.add('aberto'); });
    document.addEventListener('click', e => {
      if (!e.target.closest('.busca-topo')) caixaRes.classList.remove('aberto');
    });
    document.getElementById('bt-nova-gravacao').onclick = () => B7.Dashboard.modalNovaGravacao();
    document.getElementById('mn-novo-cliente').onclick = () => B7.Dashboard.modalNovoCliente();
    document.getElementById('mn-paleta').onclick = () => B7.UI.paleta();
    document.getElementById('mn-exportar').onclick = () => B7.Backup.exportar();
    document.getElementById('mn-importar').onclick = () => B7.Backup.importar();

    /* ---- topo: editor ---- */
    document.getElementById('bt-voltar').onclick = () => { location.hash = '#/'; };
    document.getElementById('ed-status').onclick = () => B7.Editor.menuStatus();
    document.getElementById('bt-imprimir').onclick = () => B7.Editor.imprimir();
    document.getElementById('bt-baixar').onclick = () => B7.Editor.baixar();
    document.getElementById('mn-ed-apresentar').onclick = () => B7.Editor.apresentar();
    document.getElementById('mn-ed-arquivar').onclick = () =>
      B7.Dashboard.arquivarGravacao(B7.Editor.estado.gravacao.id, true);
    document.getElementById('mn-ed-dados').onclick = () => B7.Editor.editarGravacao();
    document.getElementById('mn-ed-foco').onclick = () => B7.Editor.modoFoco();
    document.getElementById('bt-foco').onclick = () => B7.Editor.modoFoco();
    document.getElementById('mn-ed-novo').onclick = () => B7.Editor.novoRoteiro();
    document.getElementById('mn-ed-exportar').onclick = () => B7.Backup.exportar();
    document.getElementById('mn-ed-excluir').onclick = () =>
      B7.Dashboard.excluirGravacao(B7.Editor.estado.gravacao.id);

    /* ---- zoom ---- */
    document.getElementById('zoom-menos').onclick = () => B7.Editor.zoom(-0.08);
    document.getElementById('zoom-mais').onclick = () => B7.Editor.zoom(0.08);
    document.getElementById('zoom-ajustar').onclick = () => B7.Editor.zoomAjustar();

    /* ---- abas do celular ---- */
    document.querySelectorAll('.abas button').forEach(b => b.onclick = () => {
      document.querySelectorAll('.abas button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      document.body.dataset.aba = b.dataset.aba;
      B7.Editor.aplicarZoom();
    });

    /* ---- sidebar ---- */
    document.querySelectorAll('.nav a[data-ir]').forEach(a => a.onclick = () => {
      location.hash = a.dataset.ir;
      document.body.classList.remove('gaveta');
    });
    document.getElementById('nav-backup').onclick = () => B7.Backup.menu();
    document.getElementById('nav-atalhos').onclick = () => B7.UI.atalhos();
    document.getElementById('nav-config').onclick = () => { location.hash = '#/config'; };
    document.getElementById('bt-recolher').onclick = () => {
      const r = document.body.classList.toggle('recolhida');
      B7.pref.gravar('sidebar_recolhida', r);
      if (document.getElementById('tela-editor').classList.contains('ativa')) B7.Editor.aplicarZoom();
    };
    const abre = document.getElementById('abre-menu');
    if (abre) abre.onclick = e => { e.stopPropagation(); document.body.classList.toggle('gaveta'); };
    document.addEventListener('click', e => {
      if (document.body.classList.contains('gaveta') && !e.target.closest('.lateral'))
        document.body.classList.remove('gaveta');
    });
    if (B7.pref.ler('sidebar_recolhida', false)) document.body.classList.add('recolhida');

    /* estado do banco na sidebar, junto com o autosave */
    const pintarEstado = () => {
      const el = document.getElementById('estado-banco');
      if (!el) return;
      const off = !navigator.onLine;
      el.className = 'estado' + (off ? ' off' : '');
      el.querySelector('span:last-child').textContent = off ? 'Sem conexão' : 'Banco conectado';
    };
    window.addEventListener('online', pintarEstado);
    window.addEventListener('offline', pintarEstado);
    pintarEstado();

    /* ---- B7 Light Trail: a trilha desliza até o item ativo ---- */
    const nav = document.querySelector('.nav');
    const trilha = document.createElement('div');
    trilha.className = 'nav-trilha';
    nav.appendChild(trilha);
    B7.moverTrilha = function () {
      const ativo = nav.querySelector('a.on');
      if (!ativo) { trilha.classList.remove('visivel'); return; }
      trilha.style.top = (ativo.offsetTop + 8) + 'px';
      trilha.style.height = (ativo.offsetHeight - 16) + 'px';
      trilha.classList.add('visivel');
    };
    /* nada de observar mutações aqui: a própria trilha muda de classe e o
       observador se auto-alimentava. Quem marca a seção ativa chama isto. */
    window.addEventListener('resize', () => B7.moverTrilha());
    setTimeout(() => B7.moverTrilha(), 60);

    /* ---- tema claro/escuro ---- */
    const trocarLogos = () => {
      const escuro = document.documentElement.getAttribute('data-theme') === 'dark';
      /* troca o arquivo oficial, nunca inverte ou recolore a marca */
      document.querySelectorAll('[data-logo="lockup"]').forEach(img => {
        img.src = 'assets/brand/logo-' + (escuro ? 'white' : 'color') + '.png';
      });
    };
    B7.alternarTema = function () {
      const escuro = document.documentElement.getAttribute('data-theme') === 'dark';
      const novo = escuro ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', novo);
      try { localStorage.setItem('b7_tema', novo); } catch (e) {}
      trocarLogos();
      return novo;
    };
    document.querySelectorAll('[data-tema]').forEach(b => b.onclick = () => B7.alternarTema());

    /* densidade da interface, guardada por navegador */
    B7.aplicarDensidade = function (valor) {
      const d = valor || B7.pref.ler('densidade', 'confortavel');
      document.documentElement.setAttribute('data-densidade', d);
      if (valor) B7.pref.gravar('densidade', valor);
      return d;
    };
    B7.aplicarDensidade();
    trocarLogos();
    /* enquanto a pessoa não escolher manualmente, seguimos o sistema */
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ev => {
        if (localStorage.getItem('b7_tema')) return;
        document.documentElement.setAttribute('data-theme', ev.matches ? 'dark' : 'light');
        trocarLogos();
      });
    } catch (e) {}

    /* ---- preferências locais ---- */
    if (B7.pref.ler('foco', false)) document.body.classList.add('foco');

    /* ---- atalhos ---- */
    document.addEventListener('keydown', e => {
      const alvo = document.activeElement;
      /* atalhos de letra só fora de campos de texto — nunca no meio de um roteiro */
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) || alvo.isContentEditable;
      const noEditor = document.getElementById('tela-editor').classList.contains('ativa');
      const temModal = !!document.querySelector('.fundo-modal');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); B7.Save.agora(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); B7.UI.paleta(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && noEditor) {
        e.preventDefault(); B7.Editor.imprimir(); return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || digitando || temModal) return;

      if (e.key === '/') {
        const busca = document.getElementById('campo-busca');
        if (busca && !noEditor) { e.preventDefault(); busca.focus(); }
      }
      if (e.key === '?') { e.preventDefault(); B7.UI.atalhos(); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); B7.Dashboard.modalNovaGravacao(); }
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); B7.Dashboard.modalNovoCliente(); }
      if ((e.key === 'f' || e.key === 'F') && noEditor) { e.preventDefault(); B7.Editor.modoFoco(); }
      if ((e.key === 'p' || e.key === 'P') && noEditor) { e.preventDefault(); B7.Editor.imprimir(); }
      if ((e.key === 'd' || e.key === 'D') && noEditor) { e.preventDefault(); B7.Editor.baixar(); }
      if ((e.key === 'v' || e.key === 'V') && noEditor) { e.preventDefault(); B7.Editor.espiar(); }
    });

    B7.UI.ligarMenus(document);
    B7.Save.atualizar();
    B7.Save.escoarFila();
    await B7.Rota.ir();

    /* ---- PWA ---- */
    if (navigator.serviceWorker && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  });
})();
