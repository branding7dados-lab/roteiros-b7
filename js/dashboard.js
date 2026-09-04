/* =====================================================================
   DASHBOARD — Central de Produção
   Estrutura do sistema: CLIENTE → GRAVAÇÕES → ROTEIROS → CENAS.
   Uma gravação é um grupo de roteiros de um cliente. A data é apenas
   metadado opcional: quando não existe, nada aparece no lugar dela.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.Dashboard = (function () {
  const esc = B7.UI.esc;
  const painel = () => document.getElementById('painel-dashboard');

  /* ícones lineares, todos com a mesma espessura — nada de emoji na interface */
  const traco = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const IC = {
    clientes:  '<svg viewBox="0 0 24 24" ' + traco + '><path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-1.5a4 4 0 0 0-3-3.87"/></svg>',
    gravacoes: '<svg viewBox="0 0 24 24" ' + traco + '><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5l6-3.5v10l-6-3.5z"/></svg>',
    roteiros:  '<svg viewBox="0 0 24 24" ' + traco + '><path d="M5 3.5h9l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1-1.5z"/><path d="M14 3.5V9h5"/><path d="M8.5 13.5h7M8.5 17h4.5"/></svg>',
    andamento: '<svg viewBox="0 0 24 24" ' + traco + '><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
    mais:      '<svg viewBox="0 0 24 24" ' + traco + '><path d="M12 5v14M5 12h14"/></svg>',
    pessoa:    '<svg viewBox="0 0 24 24" ' + traco + '><circle cx="12" cy="8" r="3.4"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/></svg>',
    play:      '<svg viewBox="0 0 24 24" ' + traco + '><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/></svg>',
    imprimir:  '<svg viewBox="0 0 24 24" ' + traco + '><path d="M6 9V4h12v5M6 18H4v-6h16v6h-2M8 14h8v6H8z"/></svg>'
  };

  let ultimaGravacao = null;    // alimenta as ações rápidas

  /* ------------------------------------------------------- esqueleto */
  function esqueleto(tipo) {
    const cx = tipo === 'lista'
      ? '<div class="esqueleto" style="height:44px;width:300px;margin-bottom:22px"></div>' +
        '<div class="grade-clientes">' + '<div class="esqueleto" style="height:78px"></div>'.repeat(6) + '</div>'
      : '<div class="esqueleto" style="height:172px;border-radius:22px;margin-bottom:20px"></div>' +
        '<div class="metricas">' + '<div class="esqueleto" style="height:140px"></div>'.repeat(4) + '</div>' +
        '<div class="colunas"><div>' +
          '<div class="esqueleto" style="height:116px;margin-bottom:12px"></div>' +
          '<div class="grade">' + '<div class="esqueleto" style="height:160px"></div>'.repeat(3) + '</div>' +
        '</div><div class="apoio"><div class="esqueleto" style="height:262px"></div>' +
        '<div class="esqueleto" style="height:158px"></div></div></div>';
    painel().innerHTML = '<div class="conteudo">' + cx + '</div>';
  }

  function erro(e, acao) {
    console.error(e);
    painel().innerHTML = '<div class="conteudo"><div class="cartao vazio"><div class="ilu">' + IC.gravacoes + '</div>' +
      '<b>Não consegui falar com o banco</b><p>' + esc(e.message || 'Erro desconhecido') + '</p>' +
      '<button class="b pri" onclick="B7.Dashboard.' + (acao || 'abrir') + '()">Tentar de novo</button></div></div>';
  }

  /* ===================================================== DASHBOARD */
  async function abrir() {
    marcarNav('#/');
    esqueleto();
    let resumo, recentes, clientes;
    try {
      [resumo, recentes, clientes] = await Promise.all([
        B7.DB.resumo(), B7.DB.gravacoesRecentes(7), B7.DB.listarClientes()
      ]);
    } catch (e) { return erro(e); }

    ultimaGravacao = recentes[0] || null;
    const destaque = recentes[0];
    const outras = recentes.slice(1, 7);
    const topClientes = [...clientes]
      .sort((a, b) => String(b.ultima_atividade).localeCompare(String(a.ultima_atividade)))
      .slice(0, 6);

    painel().innerHTML = '<div class="conteudo">' + hero() + metricas(resumo) +
      '<div class="colunas"><div>' +

        '<div class="secao"><div class="secao-topo"><h2>Continue de onde parou</h2>' +
          '<div class="espaco"></div>' +
          (recentes.length ? '<button class="b fina contorno" data-ir="#/gravacoes">Ver todas</button>' : '') +
        '</div>' +
        (destaque ? cardDestaque(destaque) : vazioGravacoes()) +
        (outras.length ? '<div class="grade">' + outras.map(cardGravacao).join('') + '</div>' : '') +
        '</div>' +

        '<div class="secao"><div class="secao-topo"><h2>Clientes</h2>' +
          '<span class="conta">' + clientes.length + '</span><div class="espaco"></div>' +
          (clientes.length ? '<button class="b fina contorno" data-ir="#/clientes">Ver todos</button>' : '') +
        '</div>' +
        (topClientes.length ? '<div class="grade-clientes">' + topClientes.map(cardCliente).join('') + '</div>'
                            : vazioClientes()) +
        '</div>' +

      '</div><div class="apoio">' + acoesRapidas(destaque) + institucional() + '</div></div></div>';

    ligar();
  }

  function hero() {
    return '<div class="hero">' +
      '<div class="malha"></div><div class="brilho"></div>' +
      '<img class="simbolo" src="assets/brand/symbol-color.png" alt="">' +
      '<div class="miolo">' +
        '<div class="olho"><i></i>BRANDING7 · PRODUÇÃO DE CONTEÚDO</div>' +
        '<h1>Central de Produção</h1>' +
        '<p>Organize clientes, gravações e roteiros de forma rápida e eficiente.</p>' +
        '<div class="acoes">' +
          '<button class="b pri" data-nova-gravacao>' + IC.mais + 'Nova gravação</button>' +
          '<button class="b clara" data-ir="#/gravacoes">Ver gravações</button>' +
        '</div>' +
      '</div></div>';
  }

  function metricas(r) {
    const cx = (ic, valor, rot, sub, destaque) =>
      '<div class="metrica' + (destaque ? ' destaque' : '') + '"><div class="ic">' + ic + '</div>' +
      '<b>' + valor + '</b><div class="rot">' + rot + '</div>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
    return '<div class="metricas">' +
      cx(IC.clientes, r.clientes, 'CLIENTES',
         r.clientes === 1 ? '1 cliente cadastrado' : r.clientes + ' clientes cadastrados') +
      cx(IC.gravacoes, r.gravacoes, 'GRAVAÇÕES',
         r.gravado + ' já gravada' + (r.gravado === 1 ? '' : 's')) +
      cx(IC.roteiros, r.roteiros, 'ROTEIROS',
         r.mes + ' criado' + (r.mes === 1 ? '' : 's') + ' neste mês') +
      cx(IC.andamento, r.andamento, 'EM ANDAMENTO',
         r.pronto + ' pronta' + (r.pronto === 1 ? '' : 's') + ' · ' +
         r.rascunho + ' rascunho' + (r.rascunho === 1 ? '' : 's'), true) +
      '</div>';
  }

  const metaGravacao = g =>
    (g.data_gravacao ? '<span>' + B7.UI.dataBR(g.data_gravacao) + '</span><span class="p"></span>' : '') +
    '<span>' + g.total_roteiros + ' roteiro' + (g.total_roteiros === 1 ? '' : 's') + '</span>' +
    '<span class="p"></span><span>editado ' + B7.UI.quando(g.updated_at) + '</span>';

  function cardDestaque(g) {
    return '<div class="destaque-grav" data-gravacao="' + esc(g.id) + '">' +
      B7.UI.avatarCliente(g.cliente_nome, g.cliente_logo_url, 'g') +
      '<div class="info"><div class="cli">' + esc(g.cliente_nome) + '</div>' +
        '<h3>' + esc(g.nome) + '</h3>' +
        '<div class="meta">' + metaGravacao(g) + '</div></div>' +
      '<div class="lado">' + B7.UI.chipStatus(g.status) +
        '<button class="b pri">' + IC.play + 'Continuar edição</button>' +
        '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button>' +
          '<div class="lista"><button data-dup="' + esc(g.id) + '">Duplicar gravação</button>' +
          '<button class="perigo" data-excluir="' + esc(g.id) + '">Excluir gravação</button></div></div>' +
      '</div></div>';
  }

  function cardGravacao(g) {
    return '<div class="card-gravacao" data-gravacao="' + esc(g.id) + '">' +
      '<div class="cli">' + esc(g.cliente_nome) + '</div>' +
      '<h3>' + esc(g.nome) + '</h3>' +
      '<div class="meta">' + metaGravacao(g) + '</div>' +
      '<div class="rodape">' + B7.UI.chipStatus(g.status) + '<span class="abrir">Abrir →</span></div></div>';
  }

  function cardCliente(c) {
    return '<div class="card-cliente" data-cliente="' + esc(c.id) + '">' +
      B7.UI.avatarCliente(c.nome, c.logo_url) +
      '<div class="nm"><b>' + esc(c.nome) + '</b><small>' +
        c.total_gravacoes + ' gravaç' + (c.total_gravacoes === 1 ? 'ão' : 'ões') + ' · ' +
        c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') +
        ' · ' + B7.UI.quando(c.ultima_atividade) + '</small></div>' +
      '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button><div class="lista">' +
        '<button data-abrir-cli="' + esc(c.id) + '">Abrir cliente</button>' +
        '<button data-nova-gravacao="' + esc(c.id) + '">Nova gravação</button>' +
        '<button data-editar-cli="' + esc(c.id) + '">Editar cliente</button><hr>' +
        '<button class="perigo" data-excluir-cli="' + esc(c.id) + '">Excluir cliente</button>' +
      '</div></div>' +
      '<div class="seta">›</div></div>';
  }

  function acoesRapidas(destaque) {
    const item = (ic, titulo, sub, attr, off) =>
      '<button class="acao-rapida" ' + attr + (off ? ' disabled' : '') + '>' +
      '<div class="ic">' + ic + '</div><div class="tx"><b>' + titulo + '</b><small>' + esc(sub) + '</small></div></button>';
    return '<div class="bloco"><h3>Ações rápidas</h3>' +
      item(IC.mais, 'Nova gravação', 'começar um grupo de roteiros', 'data-nova-gravacao') +
      item(IC.pessoa, 'Novo cliente', 'cadastrar um cliente', 'data-novo-cliente') +
      item(IC.play, 'Continuar última gravação',
           destaque ? destaque.cliente_nome + ' · ' + destaque.nome : 'nenhuma gravação ainda',
           destaque ? 'data-gravacao="' + esc(destaque.id) + '"' : '', !destaque) +
      item(IC.imprimir, 'Imprimir roteiro recente',
           destaque ? 'abre a impressão de ' + destaque.nome : 'nenhuma gravação ainda',
           destaque ? 'data-imprimir="' + esc(destaque.id) + '"' : '', !destaque) +
      '</div>';
  }

  function institucional() {
    return '<div class="institucional"><div class="brilho"></div>' +
      '<img src="assets/brand/logo-white.png" alt="Branding7">' +
      '<p>Conteúdo que move negócios.</p>' +
      '<small>Toda gravação começa numa ideia bem escrita. Este é o lugar dela.</small></div>';
  }

  function vazioGravacoes() {
    return '<div class="cartao vazio"><div class="ilu">' + IC.gravacoes + '</div>' +
      '<b>Nenhuma gravação ainda</b><p>Crie a primeira gravação e comece a escrever os roteiros.</p>' +
      '<button class="b pri" data-nova-gravacao>' + IC.mais + 'Nova gravação</button></div>';
  }
  function vazioClientes() {
    return '<div class="cartao vazio"><div class="ilu">' + IC.clientes + '</div>' +
      '<b>Nenhum cliente ainda</b><p>Crie seu primeiro cliente para organizar as gravações.</p>' +
      '<button class="b pri" data-novo-cliente>' + IC.mais + 'Criar cliente</button></div>';
  }

  /* ================================================ TODAS AS GRAVAÇÕES */
  async function abrirGravacoes() {
    marcarNav('#/gravacoes');
    esqueleto('lista');
    let gravacoes;
    try { gravacoes = await B7.DB.listarGravacoes(); } catch (e) { return erro(e, 'abrirGravacoes'); }
    gravacoes.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

    painel().innerHTML = '<div class="conteudo">' +
      '<div class="secao-topo"><h2 style="font-size:22px">Gravações</h2>' +
      '<span class="conta">' + gravacoes.length + '</span><div class="espaco"></div>' +
      '<div class="filtro" id="filtro-status">' +
        ['Todas', 'Rascunho', 'Pronto para gravar', 'Gravado'].map((f, i) =>
          '<button data-f="' + esc(f) + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(f) + '</button>').join('') +
      '</div>' +
      '<button class="b pri" data-nova-gravacao>' + IC.mais + 'Nova gravação</button></div>' +
      (gravacoes.length ? '<div class="grade" id="lista-gravacoes">' + gravacoes.map(cardGravacao).join('') + '</div>'
                        : vazioGravacoes()) + '</div>';

    ligar();
    const filtro = document.getElementById('filtro-status');
    if (filtro) filtro.querySelectorAll('button').forEach(b => b.onclick = () => {
      filtro.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      const f = b.dataset.f;
      const lista = f === 'Todas' ? gravacoes : gravacoes.filter(g => g.status === f);
      document.getElementById('lista-gravacoes').innerHTML =
        lista.length ? lista.map(cardGravacao).join('')
                     : '<div class="vazio" style="grid-column:1/-1"><b>Nada com esse status</b></div>';
      ligar();
    });
  }

  /* ================================================ ROTEIROS RECENTES */
  async function abrirRoteiros() {
    marcarNav('#/roteiros');
    esqueleto('lista');
    let roteiros;
    try { roteiros = await B7.DB.roteirosRecentes(20); } catch (e) { return erro(e, 'abrirRoteiros'); }

    painel().innerHTML = '<div class="conteudo">' +
      '<div class="secao-topo"><h2 style="font-size:22px">Roteiros recentes</h2>' +
      '<span class="conta">' + roteiros.length + '</span></div>' +
      (roteiros.length ? '<div class="lista-gravacoes">' + roteiros.map(r =>
        '<div class="linha-gravacao" data-gravacao="' + esc(r.recording_session_id) +
          '" data-roteiro="' + esc(r.id) + '">' +
          B7.UI.avatarCliente(r.gravacao ? r.gravacao.cliente_nome : '?',
                              r.gravacao ? r.gravacao.cliente_logo_url : null) +
          '<div class="nm"><b>' + esc(r.titulo || 'Sem título') + '</b><small>' +
          (r.gravacao ? esc(r.gravacao.cliente_nome) + ' · ' + esc(r.gravacao.nome) + ' · ' : '') +
          'editado ' + B7.UI.quando(r.updated_at) + '</small></div>' +
          '<div class="seta">›</div></div>').join('') + '</div>'
        : '<div class="cartao vazio"><div class="ilu">' + IC.roteiros + '</div>' +
          '<b>Nenhum roteiro ainda</b><p>Crie uma gravação e comece a escrever.</p>' +
          '<button class="b pri" data-nova-gravacao>' + IC.mais + 'Nova gravação</button></div>') +
      '</div>';
    ligar();
  }

  /* ========================================================= CLIENTES */
  async function abrirClientes() {
    marcarNav('#/clientes');
    esqueleto('lista');
    let clientes;
    try { clientes = await B7.DB.listarClientes(); } catch (e) { return erro(e, 'abrirClientes'); }

    painel().innerHTML = '<div class="conteudo">' +
      '<div class="secao-topo"><h2 style="font-size:22px">Clientes</h2>' +
      '<span class="conta">' + clientes.length + '</span><div class="espaco"></div>' +
      '<div class="filtro" id="filtro-cli">' +
        ['Todos', 'Mais recentes', 'Com gravações', 'Sem gravações'].map((f, i) =>
          '<button data-f="' + esc(f) + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(f) + '</button>').join('') +
      '</div>' +
      '<input class="campo" id="busca-cli" placeholder="Buscar clientes…" style="width:210px;padding:9px 12px">' +
      '<button class="b pri" data-novo-cliente>' + IC.mais + 'Novo cliente</button></div>' +
      (clientes.length ? '<div class="grade-clientes" id="lista-cli">' + clientes.map(cardCliente).join('') + '</div>'
                       : vazioClientes()) + '</div>';

    ligar();

    let filtroAtual = 'Todos', termo = '';
    const aplicar = () => {
      let lista = clientes.slice();
      if (filtroAtual === 'Mais recentes')
        lista.sort((a, b) => String(b.ultima_atividade).localeCompare(String(a.ultima_atividade)));
      if (filtroAtual === 'Com gravações') lista = lista.filter(c => c.total_gravacoes > 0);
      if (filtroAtual === 'Sem gravações') lista = lista.filter(c => c.total_gravacoes === 0);
      if (termo) lista = lista.filter(c => c.nome.toLowerCase().includes(termo));
      const cx = document.getElementById('lista-cli');
      if (!cx) return;
      cx.innerHTML = lista.length ? lista.map(cardCliente).join('')
        : '<div class="vazio" style="grid-column:1/-1"><b>Nenhum cliente aqui</b>' +
          '<p>Tente outro filtro ou outra busca.</p></div>';
      ligar();
    };
    const f = document.getElementById('filtro-cli');
    if (f) f.querySelectorAll('button').forEach(b => b.onclick = () => {
      f.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); filtroAtual = b.dataset.f; aplicar();
    });
    const busca = document.getElementById('busca-cli');
    if (busca) busca.oninput = () => { termo = busca.value.trim().toLowerCase(); aplicar(); };
  }

  /* ====================================================== UM CLIENTE */
  async function abrirCliente(id) {
    marcarNav('#/clientes');
    esqueleto('lista');
    let cliente, gravacoes;
    try {
      [cliente, gravacoes] = await Promise.all([B7.DB.cliente(id), B7.DB.listarGravacoes(id)]);
      gravacoes.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    } catch (e) { return erro(e, 'abrirClientes'); }

    painel().innerHTML = '<div class="conteudo">' +
      '<button class="voltar" data-ir="#/clientes">‹ Clientes</button>' +
      '<div class="cabeca-cliente">' + B7.UI.avatarCliente(cliente.nome, cliente.logo_url, 'g') +
      '<div style="flex:1;min-width:0"><h1>' + esc(cliente.nome) + '</h1><small>' +
      cliente.total_gravacoes + ' gravaç' + (cliente.total_gravacoes === 1 ? 'ão' : 'ões') + ' · ' +
      cliente.total_roteiros + ' roteiro' + (cliente.total_roteiros === 1 ? '' : 's') +
      ' · última atividade ' + B7.UI.quando(cliente.ultima_atividade) + '</small></div>' +
      '<button class="b pri" data-nova-gravacao="' + esc(cliente.id) + '">' + IC.mais + 'Nova gravação</button>' +
      '<button class="b contorno" data-editar-cli="' + esc(cliente.id) + '">Editar cliente</button>' +
      '<div class="menu"><button class="ico">⋯</button><div class="lista">' +
        '<button data-nova-gravacao="' + esc(cliente.id) + '">Nova gravação</button>' +
        '<button data-editar-cli="' + esc(cliente.id) + '">Editar cliente</button><hr>' +
        '<button class="perigo" data-excluir-cli="' + esc(cliente.id) + '">Excluir cliente</button>' +
      '</div></div></div>' +

      '<div class="secao-topo"><h2>Gravações</h2><span class="conta">' + gravacoes.length + '</span></div>' +
      (gravacoes.length ? '<div class="lista-gravacoes">' + gravacoes.map(g =>
        '<div class="linha-gravacao" data-gravacao="' + esc(g.id) + '">' +
          '<div class="nm"><b>' + esc(g.nome) + '</b><small>' +
          g.total_roteiros + ' roteiro' + (g.total_roteiros === 1 ? '' : 's') +
          (g.data_gravacao ? ' · ' + B7.UI.dataBR(g.data_gravacao) : '') +
          ' · editado ' + B7.UI.quando(g.updated_at) + '</small></div>' +
          B7.UI.chipStatus(g.status) +
          '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button>' +
          '<div class="lista"><button data-dup="' + esc(g.id) + '">Duplicar gravação</button>' +
          '<button class="perigo" data-excluir="' + esc(g.id) + '">Excluir gravação</button></div></div>' +
          '<div class="seta">›</div></div>').join('') + '</div>'
        : '<div class="cartao vazio"><div class="ilu">' + IC.gravacoes + '</div>' +
          '<b>Nenhuma gravação para este cliente</b><p>Crie a primeira e comece os roteiros.</p>' +
          '<button class="b pri" data-nova-gravacao="' + esc(cliente.id) + '">' + IC.mais + 'Nova gravação</button></div>') +
      '</div>';

    ligar();
  }

  /* ====================================================== interações */
  function marcarNav(rota) {
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.ir === rota));
  }

  function ligar() {
    const p = painel();
    p.querySelectorAll('[data-gravacao]').forEach(el => el.onclick = ev => {
      if (ev.target.closest('.menu')) return;
      const r = el.dataset.roteiro;
      location.hash = '#/gravacao/' + el.dataset.gravacao + (r ? '?roteiro=' + r : '');
    });
    p.querySelectorAll('[data-cliente]').forEach(el => el.onclick = ev => {
      if (ev.target.closest('button')) return;
      location.hash = '#/cliente/' + el.dataset.cliente;
    });
    p.querySelectorAll('[data-ir]').forEach(el => el.onclick = () => location.hash = el.dataset.ir);
    p.querySelectorAll('[data-nova-gravacao]').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      modalNovaGravacao(b.dataset.novaGravacao || undefined);
    });
    p.querySelectorAll('[data-novo-cliente]').forEach(b => b.onclick = ev => {
      ev.stopPropagation(); modalNovoCliente();
    });
    p.querySelectorAll('[data-dup]').forEach(b => b.onclick = ev => { ev.stopPropagation(); duplicarGravacao(b.dataset.dup); });
    p.querySelectorAll('[data-excluir]').forEach(b => b.onclick = ev => { ev.stopPropagation(); excluirGravacao(b.dataset.excluir); });
    p.querySelectorAll('[data-abrir-cli]').forEach(b => b.onclick = ev => {
      ev.stopPropagation(); location.hash = '#/cliente/' + b.dataset.abrirCli;
    });
    p.querySelectorAll('[data-editar-cli]').forEach(b => b.onclick = ev => {
      ev.stopPropagation(); modalEditarCliente(b.dataset.editarCli);
    });
    p.querySelectorAll('[data-excluir-cli]').forEach(b => b.onclick = ev => {
      ev.stopPropagation(); excluirCliente(b.dataset.excluirCli);
    });
    p.querySelectorAll('[data-imprimir]').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      location.hash = '#/gravacao/' + b.dataset.imprimir + '?imprimir=1';
    });
    B7.UI.ligarMenus(p);
  }


  /* ============================================ upload de logo (reuso)
     Monta a área de logo do modal e devolve um objeto com o estado atual.
     A imagem só sobe para o Storage na hora de salvar — assim, cancelar
     não deixa arquivo perdido no bucket. */
  const TIPOS_OK = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  const LIMITE_MB = 2;

  function campoLogo(logoAtual) {
    const semLogo = '<span class="vazia"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/>' +
      '<path d="M21 16l-5-5-4.5 5-2-2L3 19"/></svg></span>';
    return '<div class="mb"><label class="rot">LOGO DO CLIENTE <span class="leve">— opcional</span></label>' +
      '<div class="upload-logo" id="ul-area">' +
        '<div class="previa" id="ul-previa">' + (logoAtual ? '<img src="' + esc(logoAtual) + '" alt="">' : semLogo) + '</div>' +
        '<div class="txt"><b id="ul-titulo">' + (logoAtual ? 'Logo cadastrada' : 'Arraste uma imagem ou clique') + '</b>' +
        '<small>PNG, JPG, WEBP ou SVG · até ' + LIMITE_MB + ' MB</small></div>' +
        '<div class="bts">' +
          '<button type="button" class="b" id="ul-trocar">' + (logoAtual ? 'Alterar' : 'Selecionar') + '</button>' +
          '<button type="button" class="b perigo" id="ul-remover" style="' + (logoAtual ? '' : 'display:none') + '">Remover</button>' +
        '</div>' +
        '<input type="file" id="ul-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="display:none">' +
      '</div><div class="envio-estado" id="ul-estado"></div></div>';
  }

  function ligarCampoLogo(m, logoAtual) {
    const area = m.querySelector('#ul-area');
    const input = m.querySelector('#ul-input');
    const previa = m.querySelector('#ul-previa');
    const titulo = m.querySelector('#ul-titulo');
    const remover = m.querySelector('#ul-remover');
    const trocar = m.querySelector('#ul-trocar');
    const estado = m.querySelector('#ul-estado');

    /* arquivo escolhido (ainda não enviado) | remover a logo atual | nada */
    const st = { arquivo: null, removida: false, atual: logoAtual || null };

    const mostrarEstado = (texto, classe) => {
      estado.textContent = texto || '';
      estado.className = 'envio-estado' + (classe ? ' ' + classe : '');
    };

    function aceitar(arquivo) {
      if (!arquivo) return;
      if (!TIPOS_OK.includes(arquivo.type)) {
        B7.UI.toast('Formato de imagem não suportado. Use PNG, JPG, WEBP ou SVG.', { tipo: 'erro' });
        return;
      }
      if (arquivo.size > LIMITE_MB * 1024 * 1024) {
        B7.UI.toast('Essa imagem é muito grande. Escolha um arquivo menor que ' + LIMITE_MB + ' MB.', { tipo: 'erro' });
        return;
      }
      st.arquivo = arquivo; st.removida = false;
      const leitor = new FileReader();
      leitor.onload = () => {
        previa.innerHTML = '<img src="' + leitor.result + '" alt="">';
        titulo.textContent = arquivo.name;
        remover.style.display = '';
        trocar.textContent = 'Alterar';
      };
      leitor.readAsDataURL(arquivo);
      mostrarEstado('');
    }

    trocar.onclick = e => { e.stopPropagation(); input.click(); };
    area.onclick = () => input.click();
    input.onchange = () => { aceitar(input.files[0]); input.value = ''; };
    remover.onclick = e => {
      e.stopPropagation();
      st.arquivo = null; st.removida = !!st.atual; st.atual = null;
      previa.innerHTML = campoLogo(null).match(/<div class="previa"[^>]*>([\s\S]*?)<\/div>/)[1];
      titulo.textContent = 'Arraste uma imagem ou clique';
      remover.style.display = 'none';
      trocar.textContent = 'Selecionar';
      mostrarEstado('');
    };
    ['dragenter', 'dragover'].forEach(ev => area.addEventListener(ev, e => {
      e.preventDefault(); area.classList.add('sobre');
    }));
    ['dragleave', 'drop'].forEach(ev => area.addEventListener(ev, e => {
      e.preventDefault(); area.classList.remove('sobre');
    }));
    area.addEventListener('drop', e => { if (e.dataTransfer.files.length) aceitar(e.dataTransfer.files[0]); });

    /* devolve {logo_url, logo_path} já resolvidos, ou null se nada mudou */
    st.resolver = async function (clienteId, logoPathAntigo) {
      if (st.arquivo) {
        mostrarEstado('Enviando logo…', 'enviando');
        try {
          const enviado = await B7.DB.enviarLogo(st.arquivo, clienteId);
          mostrarEstado('Logo atualizada ✓', 'pronto');
          if (logoPathAntigo) B7.DB.apagarLogo(logoPathAntigo);   // só depois de dar certo
          return { logo_url: enviado.url, logo_path: enviado.path };
        } catch (e) {
          mostrarEstado('Não consegui enviar a imagem. A logo anterior foi mantida.', 'falhou');
          throw e;
        }
      }
      if (st.removida) {
        if (logoPathAntigo) B7.DB.apagarLogo(logoPathAntigo);
        return { logo_url: null, logo_path: null };
      }
      return null;
    };
    return st;
  }

  /* ==================================================== novo cliente */
  function modalNovoCliente(aoCriar) {
    const m = B7.UI.modal(
      '<h3>Novo cliente</h3><div class="sub">Só o nome é obrigatório. Logo e observações você pode ' +
      'adicionar agora ou depois.</div>' +
      '<div class="mb"><label class="rot">NOME DO CLIENTE</label>' +
      '<input class="campo" id="nc-nome" data-foco placeholder="Ex: Mercato Sadia"></div>' +
      campoLogo(null) +
      '<div class="mb"><label class="rot">OBSERVAÇÕES <span class="leve">— opcional</span></label>' +
      '<textarea class="campo" id="nc-obs" rows="2" placeholder="Tom de voz, contato, particularidades…"></textarea></div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok>Criar cliente</button></div>');

    const logo = ligarCampoLogo(m, null);
    const nome = m.querySelector('#nc-nome');
    const botao = m.querySelector('[data-ok]');

    const criar = async () => {
      if (!nome.value.trim()) { nome.classList.add('erro'); nome.focus(); return; }
      botao.disabled = true;
      try {
        /* o cliente entra primeiro; a logo sobe em seguida, numa pasta com
           o id dele — assim o arquivo nasce organizado */
        const c = await B7.Save.acao(
          () => B7.DB.criarCliente(nome.value, m.querySelector('#nc-obs').value), 'Cliente criado');
        let completo = c;
        try {
          const nova = await logo.resolver(c.id, null);
          if (nova) {
            await B7.DB.atualizarCliente(c.id, nova);
            completo = Object.assign({}, c, nova);
          }
        } catch (e) {
          B7.UI.toast('Cliente criado, mas a logo não subiu. Tente de novo em “Editar cliente”.', { tipo: 'erro' });
        }
        m.fechar();
        if (aoCriar) aoCriar(completo); else B7.Rota.recarregar();
      } catch (e) {
        botao.disabled = false;
        if (String(e.message || '').includes('duplicate') || e.code === '23505') {
          B7.UI.toast('Já existe um cliente com esse nome', { tipo: 'erro' });
        }
      }
    };
    m.querySelector('[data-ok]').onclick = criar;
    nome.onkeydown = e => { if (e.key === 'Enter') criar(); };
  }


  /* ================================================== editar cliente */
  async function modalEditarCliente(id) {
    let c;
    try { c = await B7.DB.cliente(id); }
    catch (e) { return B7.UI.toast('Não consegui carregar o cliente', { tipo: 'erro' }); }

    const m = B7.UI.modal(
      '<h3>Editar cliente</h3><div class="sub">Trocar o nome não afeta gravações, roteiros nem cenas — ' +
      'o sistema trabalha pelo identificador do cliente.</div>' +
      '<div class="mb"><label class="rot">NOME DO CLIENTE</label>' +
      '<input class="campo" id="ec-nome" data-foco value="' + esc(c.nome) + '"></div>' +
      campoLogo(c.logo_url) +
      '<div class="mb"><label class="rot">OBSERVAÇÕES <span class="leve">— opcional</span></label>' +
      '<textarea class="campo" id="ec-obs" rows="2">' + esc(c.observacoes || '') + '</textarea></div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok>Salvar alterações</button></div>');

    const logo = ligarCampoLogo(m, c.logo_url);
    const nome = m.querySelector('#ec-nome');
    const botao = m.querySelector('[data-ok]');

    botao.onclick = async () => {
      if (!nome.value.trim()) { nome.classList.add('erro'); nome.focus(); return; }
      botao.disabled = true;
      const patch = { nome: nome.value.trim(), observacoes: m.querySelector('#ec-obs').value };
      try {
        /* a logo resolve primeiro: se o envio falhar, nada é gravado e a
           logo antiga continua onde estava */
        const nova = await logo.resolver(c.id, c.logo_path);
        if (nova) Object.assign(patch, nova);
        await B7.Save.acao(() => B7.DB.atualizarCliente(c.id, patch), 'Cliente atualizado');
        m.fechar();
        B7.Rota.recarregar();
      } catch (e) {
        botao.disabled = false;
        if (String(e.message || '').includes('duplicate') || e.code === '23505') {
          B7.UI.toast('Já existe um cliente com esse nome', { tipo: 'erro' });
        }
      }
    };
  }

  /* ================================================= excluir cliente */
  async function excluirCliente(id) {
    let c;
    try { c = await B7.DB.cliente(id); }
    catch (e) { return B7.UI.toast('Não consegui carregar o cliente', { tipo: 'erro' }); }

    const temConteudo = c.total_gravacoes > 0 || c.total_roteiros > 0;
    const detalhe = temConteudo
      ? 'Este cliente tem <b>' + c.total_gravacoes + ' gravaç' + (c.total_gravacoes === 1 ? 'ão' : 'ões') +
        '</b> e <b>' + c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') +
        '</b>. Tudo isso será apagado junto, incluindo as cenas. Não dá para desfazer.'
      : 'Este cliente ainda não tem gravações. Nada além dele será removido.';

    const m = B7.UI.modal(
      '<h3>Excluir ' + esc(c.nome) + '?</h3>' +
      '<div class="sub">' + detalhe + '</div>' +
      (temConteudo ? '<div class="mb"><label class="rot">PARA CONFIRMAR, DIGITE O NOME DO CLIENTE</label>' +
        '<input class="campo" id="xc-nome" data-foco placeholder="' + esc(c.nome) + '"></div>' : '') +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok' + (temConteudo ? ' disabled' : '') + '>Excluir cliente</button></div>');

    const botao = m.querySelector('[data-ok]');
    if (temConteudo) {
      const campo = m.querySelector('#xc-nome');
      campo.oninput = () => {
        botao.disabled = campo.value.trim().toLowerCase() !== c.nome.trim().toLowerCase();
      };
    }
    botao.onclick = async () => {
      try {
        if (c.logo_path) B7.DB.apagarLogo(c.logo_path);
        await B7.Save.acao(() => B7.DB.excluirCliente(c.id), 'Cliente excluído');
        m.fechar();
        if (location.hash.startsWith('#/cliente/')) location.hash = '#/clientes';
        else B7.Rota.recarregar();
      } catch (e) {}
    };
  }

  /* =================================================== nova gravação */
  async function modalNovaGravacao(clienteId) {
    let clientes = [];
    try { clientes = await B7.DB.listarClientes(); }
    catch (e) { return B7.UI.toast('Erro ao carregar clientes', { tipo: 'erro' }); }

    const opcoes = clientes.map(c =>
      '<option value="' + esc(c.id) + '"' + (c.id === clienteId ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('');

    const m = B7.UI.modal(
      '<h3>Nova gravação</h3>' +
      '<div class="sub">Uma gravação é um grupo de roteiros de um cliente. Nomeie como quiser — ' +
      '“Conteúdos Setembro”, “Campanha Cashback”, “Institucionais”.</div>' +
      '<div class="mb"><label class="rot">CLIENTE</label>' +
        '<div class="linha"><select class="campo" id="ng-cliente">' +
        (clientes.length ? opcoes : '<option value="">— nenhum cliente ainda —</option>') +
        '</select><button class="b contorno" id="ng-novo-cliente" style="flex:none">+ Novo</button></div></div>' +
      '<div class="mb"><label class="rot">NOME DA GRAVAÇÃO</label>' +
        '<input class="campo" id="ng-nome" data-foco placeholder="Ex: Conteúdos Setembro"></div>' +
      '<div class="mb"><label class="rot">DATA DA GRAVAÇÃO <span class="leve">— opcional</span></label>' +
        '<input class="campo" id="ng-data" type="date">' +
        '<div style="font-size:11.5px;color:var(--ink-4);margin-top:7px">' +
        'Pode deixar em branco. Sem data, nada de data aparece na folha impressa.</div></div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok>Criar gravação</button></div>');

    m.querySelector('#ng-novo-cliente').onclick = () => {
      modalNovoCliente(c => {
        const sel = m.querySelector('#ng-cliente');
        sel.innerHTML += '<option value="' + esc(c.id) + '" selected>' + esc(c.nome) + '</option>';
        sel.value = c.id;
        m.querySelector('#ng-nome').focus();
      });
    };

    const criar = async () => {
      const sel = m.querySelector('#ng-cliente');
      const nome = m.querySelector('#ng-nome');
      if (!sel.value) { B7.UI.toast('Crie um cliente primeiro', { tipo: 'erro' }); return; }
      if (!nome.value.trim()) { nome.classList.add('erro'); nome.focus(); return; }
      try {
        const g = await B7.Save.acao(() => B7.DB.criarGravacao({
          client_id: sel.value,
          nome: nome.value.trim(),
          data_gravacao: m.querySelector('#ng-data').value || null,
          status: 'Rascunho'
        }), 'Gravação criada');
        m.fechar();
        location.hash = '#/gravacao/' + g.id;
      } catch (e) {}
    };
    m.querySelector('[data-ok]').onclick = criar;
    m.querySelector('#ng-nome').onkeydown = e => { if (e.key === 'Enter') criar(); };
  }

  /* ============================================ duplicar / excluir */
  async function duplicarGravacao(id) {
    let g;
    try { g = await B7.DB.gravacao(id); } catch (e) { return; }
    const clientes = await B7.DB.listarClientes();
    const m = B7.UI.modal(
      '<h3>Duplicar gravação</h3><div class="sub">Copia nome, observações, roteiros e cenas para uma ' +
      'gravação nova, com identificadores próprios. A data vem em branco de propósito, para não ' +
      'carregar sem querer a data antiga.</div>' +
      '<div class="mb"><label class="rot">CLIENTE</label><select class="campo" id="dg-cliente">' +
      clientes.map(c => '<option value="' + esc(c.id) + '"' + (c.id === g.client_id ? ' selected' : '') + '>' +
        esc(c.nome) + '</option>').join('') + '</select></div>' +
      '<div class="mb"><label class="rot">NOME</label>' +
      '<input class="campo" id="dg-nome" data-foco value="' + esc(g.nome + ' (cópia)') + '"></div>' +
      '<div class="mb"><label class="rot">DATA <span class="leve">— opcional</span></label>' +
      '<input class="campo" id="dg-data" type="date"></div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok>Duplicar</button></div>');

    m.querySelector('[data-ok]').onclick = async () => {
      try {
        const nova = await B7.Save.acao(() => B7.DB.duplicarGravacao(id, {
          client_id: m.querySelector('#dg-cliente').value,
          nome: m.querySelector('#dg-nome').value.trim() || g.nome,
          data_gravacao: m.querySelector('#dg-data').value || null,
          local: g.local, responsavel: g.responsavel, videomaker: g.videomaker,
          observacoes: g.observacoes, status: 'Rascunho'
        }), 'Gravação duplicada');
        m.fechar();
        location.hash = '#/gravacao/' + nova.id;
      } catch (e) {}
    };
  }

  function excluirGravacao(id) {
    B7.UI.confirmar({
      titulo: 'Excluir gravação?',
      texto: 'Isso apaga também todos os roteiros e cenas dela. Não dá para desfazer.',
      rotulo: 'Excluir', perigo: true,
      aoConfirmar: async () => {
        try {
          await B7.Save.acao(() => B7.DB.excluirGravacao(id), 'Gravação excluída');
          B7.Rota.recarregar();
        } catch (e) {}
      }
    });
  }

  /* ============================================== busca global */
  const buscar = B7.UI.debounce(async function (termo, caixa) {
    if (!termo.trim()) { caixa.classList.remove('aberto'); return; }
    try {
      const r = await B7.DB.buscar(termo);
      let html = '';
      if (r.clientes.length) {
        html += '<div class="grupo">CLIENTES</div>' + r.clientes.map(c =>
          '<div class="res" data-ir="#/cliente/' + esc(c.id) + '">' +
          B7.UI.avatarCliente(c.nome, c.logo_url, 'p') + '<div><b>' + esc(c.nome) + '</b><small>' +
          c.total_gravacoes + ' gravaç' + (c.total_gravacoes === 1 ? 'ão' : 'ões') + ' · ' +
          c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') + '</small></div></div>').join('');
      }
      if (r.gravacoes.length) {
        html += '<div class="grupo">GRAVAÇÕES</div>' + r.gravacoes.map(g =>
          '<div class="res" data-ir="#/gravacao/' + esc(g.id) + '"><div class="mini">' + IC.gravacoes +
          '</div><div><b>' + esc(g.nome) + '</b><small>' + esc(g.cliente_nome) +
          (g.data_gravacao ? ' · ' + B7.UI.dataBR(g.data_gravacao) : '') + '</small></div></div>').join('');
      }
      if (r.roteiros.length) {
        html += '<div class="grupo">ROTEIROS</div>' + r.roteiros.map(t =>
          '<div class="res" data-ir="#/gravacao/' + esc(t.recording_session_id) + '?roteiro=' + esc(t.id) +
          '"><div class="mini">' + IC.roteiros + '</div><div><b>' + esc(t.titulo || 'Sem título') +
          '</b><small>abrir na gravação</small></div></div>').join('');
      }
      caixa.innerHTML = html || '<div class="nada">Nada encontrado para “' + esc(termo) + '”</div>';
      caixa.classList.add('aberto');
      caixa.querySelectorAll('[data-ir]').forEach(el => el.onclick = () => {
        caixa.classList.remove('aberto');
        document.getElementById('campo-busca').value = '';
        location.hash = el.dataset.ir;
      });
    } catch (e) { console.error(e); }
  }, 240);

  return { abrir, abrirClientes, abrirCliente, abrirGravacoes, abrirRoteiros,
           modalNovaGravacao, modalNovoCliente, modalEditarCliente, excluirCliente,
           buscar, duplicarGravacao, excluirGravacao, IC,
           get ultima() { return ultimaGravacao; } };
})();
