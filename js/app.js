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
      document.body.dataset.aba = document.body.dataset.aba || 'editor';
      await B7.Editor.abrir(partes[1], params.get('roteiro'));
      return;
    }
    if (partes[0] === 'cliente' && partes[1]) {
      mostrar('tela-dashboard');
      await B7.Dashboard.abrirCliente(partes[1]);
      return;
    }
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

  return { ir, recarregar };
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
    document.getElementById('mn-paleta').onclick = () => B7.Dashboard.paleta();
    document.getElementById('mn-exportar').onclick = () => B7.Backup.exportar();
    document.getElementById('mn-importar').onclick = () => B7.Backup.importar();

    /* ---- topo: editor ---- */
    document.getElementById('bt-voltar').onclick = () => { location.hash = '#/'; };
    document.getElementById('ed-status').onclick = () => B7.Editor.menuStatus();
    document.getElementById('bt-imprimir').onclick = () => B7.Editor.imprimir();
    document.getElementById('mn-ed-dados').onclick = () => B7.Editor.editarGravacao();
    document.getElementById('mn-ed-foco').onclick = () => B7.Editor.modoFoco();
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

    /* ---- preferências locais ---- */
    if (B7.pref.ler('foco', false)) document.body.classList.add('foco');

    /* ---- atalhos ---- */
    document.addEventListener('keydown', e => {
      const digitando = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); B7.Save.agora(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); B7.UI.paleta(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' &&
          document.getElementById('tela-editor').classList.contains('ativa')) {
        e.preventDefault(); B7.Editor.imprimir();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); B7.Dashboard.paleta();
      }
      if (e.key === '/' && !digitando &&
          document.getElementById('tela-dashboard').classList.contains('ativa')) {
        e.preventDefault(); document.getElementById('campo-busca').focus();
      }
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
