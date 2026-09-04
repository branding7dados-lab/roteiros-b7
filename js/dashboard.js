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

  /* ---------------------------------------------------- capa da gravação
     Montada em CSS a partir dos dados reais — nenhuma imagem gerada. */
  function capa(g, grande) {
    const selo = g.cliente_logo_url
      ? '<div class="selo"><img src="' + esc(g.cliente_logo_url) + '" alt=""></div>'
      : '<div class="selo">' + esc(B7.UI.iniciais(g.cliente_nome)) + '</div>';
    return '<div class="capa' + (grande ? ' grande' : '') + '">' +
      '<div class="malha"></div><div class="marca"></div>' + selo +
      '<div class="tit"><small>' + esc(g.cliente_nome) + '</small><b>' + esc(g.nome) + '</b></div>' +
    '</div>';
  }

  /* carregando de verdade: o símbolo oficial pulsando, curto */
  function carregando(texto) {
    return '<div class="b7-load"><div class="simbolo"></div>' +
      '<div class="txt">' + esc(texto || 'Carregando…') + '</div></div>';
  }

  /* prévia dos roteiros no hover — carrega uma vez por gravação e guarda */
  const cachePrevia = {};
  function ligarPrevia(raiz) {
    if (window.matchMedia('(pointer: coarse)').matches) return;   // nada disso no toque
    raiz.querySelectorAll('.card-gravacao[data-gravacao], .destaque-grav[data-gravacao]').forEach(card => {
      let caixa = null, timer = null;
      card.onmouseenter = () => {
        timer = setTimeout(async () => {
          const id = card.dataset.gravacao;
          if (!cachePrevia[id]) {
            try { cachePrevia[id] = await B7.DB.previaRoteiros(id, 3); } catch (e) { return; }
          }
          const roteiros = cachePrevia[id];
          if (!roteiros.length) return;
          const total = +(card.dataset.totalRoteiros || roteiros.length);
          caixa = document.createElement('div');
          caixa.className = 'previa-roteiros';
          caixa.innerHTML = '<div class="rot">ROTEIROS</div>' + roteiros.map((r, i) =>
            '<div class="it"><b>' + String((r.position || i) + 1).padStart(2, '0') + '</b>' +
            '<span>' + esc(r.titulo || 'Sem título') + '</span></div>').join('') +
            (total > roteiros.length ? '<div class="mais">+' + (total - roteiros.length) + ' roteiros</div>' : '');
          card.style.position = 'relative';
          card.appendChild(caixa);
          requestAnimationFrame(() => caixa && caixa.classList.add('aberta'));
        }, 380);
      };
      card.onmouseleave = () => {
        clearTimeout(timer);
        if (caixa) { caixa.remove(); caixa = null; }
      };
    });
  }

  /* spotlight: o brilho acompanha o cursor apenas nos cards principais */
  function ligarSpotlight(raiz) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    raiz.querySelectorAll('.spot').forEach(el => {
      el.onmousemove = e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      };
    });
  }


  /* ------------------------------------------------------- esqueleto */
  function esqueleto(tipo) {
    const cx = tipo === 'lista'
      ? '<div class="esqueleto" style="height:44px;width:300px;margin-bottom:22px"></div>' +
        '<div class="grade-clientes">' + '<div class="esqueleto" style="height:78px"></div>'.repeat(6) + '</div>'
      : '<div class="esqueleto" style="height:172px;border-radius:22px;margin-bottom:20px"></div>' +
        '<div class="metricas">' + '<div class="esqueleto" style="height:140px"></div>'.repeat(4) + '</div>' +
        '<div class="colunas"><div>' + carregando('Carregando sua produção…') + '</div>' +
        '<div class="apoio"><div class="esqueleto" style="height:262px"></div></div></div>';
    painel().innerHTML = '<div class="conteudo">' + cx + '</div>';
  }

  function erro(e, acao) {
    console.error(e);
    painel().innerHTML = '<div class="conteudo entra">' + estadoB7(IC.gravacoes,
      'Não foi possível carregar esta área.',
      navigator.onLine ? 'O banco não respondeu. Confira a conexão e tente de novo.'
                       : 'Você está sem conexão no momento.',
      '<button class="b pri" onclick="B7.Dashboard.' + (acao || 'abrir') + '()">Tentar novamente</button>' +
      '<button class="b contorno" onclick="location.hash=\'#/\'">Voltar para a Central B7</button>') + '</div>';
  }

  /* ===================================================== DASHBOARD */
  async function abrir() {
    marcarNav('#/');
    B7.Rota.titulo();
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
    const topClientes = ordenarClientes(clientes).slice(0, 5);

    painel().innerHTML = '<div class="conteudo entra">' + hero() + metricas(resumo) +
      '<div class="colunas"><div>' +

        '<div class="secao"><div class="secao-topo"><h2>Continue de onde parou</h2>' +
          '<div class="espaco"></div>' +
          (recentes.length ? '<button class="b fina contorno" data-ir="#/gravacoes">Ver todas</button>' : '') +
        '</div>' +
        (destaque ? cardDestaque(destaque) : vazioGravacoes()) + '</div>' +

        (outras.length ? '<div class="secao"><div class="secao-topo"><h2>Gravações recentes</h2>' +
          '<span class="conta">' + outras.length + '</span></div>' +
          '<div class="grade">' + outras.map(cardGravacao).join('') + '</div></div>' : '') +

        '<div class="secao"><div class="secao-topo"><h2>Clientes recentes</h2>' +
          '<span class="conta">' + clientes.length + '</span><div class="espaco"></div>' +
          (clientes.length ? '<button class="b fina contorno" data-ir="#/clientes">Ver todos os clientes</button>' : '') +
        '</div>' +
        (topClientes.length ? '<div class="grade-clientes">' + topClientes.map(cardCliente).join('') + '</div>'
                            : vazioClientes()) +
        '</div>' +

      '</div><div class="apoio">' + acoesRapidas(destaque) + institucional() + '</div></div></div>';

    ligar();
  }

  function hero() {
    return '<div class="hero spot">' +
      '<div class="malha"></div><div class="brilho"></div>' +
      '<img class="simbolo" src="assets/brand/symbol-color.png" alt="">' +
      '<div class="miolo">' +
        '<div class="olho"><i></i>PRODUÇÃO B7</div>' +
        '<h1>Central de Produção</h1>' +
        '<p>Da ideia ao take: clientes, gravações e roteiros em um só lugar.</p>' +
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
    return '<div class="destaque-grav spot b7-glow" data-gravacao="' + esc(g.id) + '" ' +
      'data-total-roteiros="' + g.total_roteiros + '">' +
      capa(g, true) +
      '<div class="info"><div class="cli">' + esc(g.cliente_nome) + '</div>' +
        '<h3>' + esc(g.nome) + '</h3>' +
        '<div class="meta">' + metaGravacao(g) + '</div></div>' +
      '<div class="lado">' + B7.UI.chipStatus(g.status) +
        '<button class="b pri">' + IC.play + 'Continuar edição</button>' +
        '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button>' +
          '<div class="lista"><button data-dup="' + esc(g.id) + '">Duplicar gravação</button>' +
          '<button data-imprimir="' + esc(g.id) + '">Imprimir</button>' +
          '<button class="perigo" data-excluir="' + esc(g.id) + '">Excluir gravação</button></div></div>' +
      '</div></div>';
  }

  function cardGravacao(g) {
    return '<div class="card-gravacao spot eleva" data-gravacao="' + esc(g.id) + '" ' +
      'data-total-roteiros="' + g.total_roteiros + '">' +
      capa(g) +
      '<div class="meta">' + metaGravacao(g) + '</div>' +
      '<div class="rodape">' + B7.UI.chipStatus(g.status) +
        '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button>' +
          '<div class="lista"><button data-dup="' + esc(g.id) + '">Duplicar</button>' +
          '<button data-imprimir="' + esc(g.id) + '">Imprimir</button>' +
          '<button class="perigo" data-excluir="' + esc(g.id) + '">Excluir</button></div></div>' +
        '<span class="abrir">Abrir →</span></div></div>';
  }

  const IC_PIN = '<svg viewBox="0 0 24 24"><path d="M9 4h6l-1 6 3.5 3v1.5h-11V13L10 10z"/><path d="M12 14.5V21"/></svg>';

  function cardCliente(c) {
    return '<div class="card-cliente spot eleva" data-cliente="' + esc(c.id) + '">' +
      B7.UI.avatarCliente(c.nome, c.logo_url) +
      '<div class="nm"><b>' + esc(c.nome) + '</b><small>' +
        c.total_gravacoes + ' gravaç' + (c.total_gravacoes === 1 ? 'ão' : 'ões') + ' · ' +
        c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') +
        ' · ' + B7.UI.quando(c.ultima_atividade) + '</small></div>' +
      '<button class="ico pin' + (c.is_pinned ? ' fixado' : '') + '" data-fixar="' + esc(c.id) + '" ' +
        'data-fixado="' + (c.is_pinned ? '1' : '0') + '" title="' +
        (c.is_pinned ? 'Desafixar cliente' : 'Fixar no topo') + '">' + IC_PIN + '</button>' +
      '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button><div class="lista">' +
        '<button data-abrir-cli="' + esc(c.id) + '">Abrir workspace</button>' +
        '<button data-nova-gravacao="' + esc(c.id) + '">Nova gravação</button>' +
        '<button data-editar-cli="' + esc(c.id) + '">Editar cliente</button>' +
        '<button data-fixar="' + esc(c.id) + '" data-fixado="' + (c.is_pinned ? '1' : '0') + '">' +
          (c.is_pinned ? 'Desafixar' : 'Fixar no topo') + '</button><hr>' +
        '<button class="perigo" data-excluir-cli="' + esc(c.id) + '">Excluir cliente</button>' +
      '</div></div><div class="seta">›</div></div>';
  }

  /* fixados primeiro, depois os mais recentes */
  function ordenarClientes(lista) {
    return lista.slice().sort((a, b) =>
      (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
      String(b.ultima_atividade).localeCompare(String(a.ultima_atividade)));
  }

  function acoesRapidas(destaque) {
    const item = (ic, titulo, sub, attr, off) =>
      '<button class="acao-rapida" ' + attr + (off ? ' disabled' : '') + '>' +
      '<div class="ic">' + ic + '</div><div class="tx"><b>' + titulo + '</b><small>' + esc(sub) + '</small></div></button>';
    return '<div class="bloco"><h3>Ações rápidas</h3>' +
      item(IC.mais, 'Nova gravação', 'começar um grupo de roteiros', 'data-nova-gravacao') +
      item(IC.pessoa, 'Novo cliente', 'cadastrar um cliente', 'data-novo-cliente') +
      item(IC.play, 'Continuar último projeto',
           destaque ? destaque.cliente_nome + ' · ' + destaque.nome : 'nenhuma gravação ainda',
           destaque ? 'data-gravacao="' + esc(destaque.id) + '"' : '', !destaque) +
      item(IC.clientes, 'Abrir clientes', 'ver todos os workspaces', 'data-ir="#/clientes"') +
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
    return estadoB7(IC.gravacoes, 'Sua próxima produção começa aqui.',
      'Crie uma gravação para começar a organizar os roteiros.',
      '<button class="b pri" data-nova-gravacao>' + IC.mais + 'Nova gravação</button>');
  }
  function vazioClientes() {
    return estadoB7(IC.clientes, 'Nenhum cliente por aqui ainda.',
      'Cadastre o primeiro cliente para abrir o workspace dele.',
      '<button class="b pri" data-novo-cliente>' + IC.mais + 'Criar cliente</button>');
  }

  /* bloco padrão de estado vazio/erro, com o símbolo B7 ao fundo */
  function estadoB7(icone, titulo, texto, acoes) {
    return '<div class="estado-b7"><div class="b7-marca fraca"></div>' +
      '<div class="ilu">' + icone + '</div><b>' + esc(titulo) + '</b><p>' + esc(texto) + '</p>' +
      (acoes ? '<div class="acoes">' + acoes + '</div>' : '') + '</div>';
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
    try { clientes = ordenarClientes(await B7.DB.listarClientes()); }
    catch (e) { return erro(e, 'abrirClientes'); }

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
      lista = ordenarClientes(lista);
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
  /* ===================================================================
     WORKSPACE DO CLIENTE
     Não é o dashboard geral filtrado: é a visão daquele cliente —
     capa, resumo próprio, atividade, gravações, roteiros e atalhos.
     A identidade continua sendo a B7; a marca do cliente entra pela
     logo e pelo conteúdo, nunca pelas cores da interface.
     =================================================================== */
  let abaCliente = 'geral';

  async function abrirCliente(id, aba) {
    marcarNav('#/clientes');
    abaCliente = aba || 'geral';
    painel().innerHTML = '<div class="conteudo">' + carregando('Abrindo o workspace…') + '</div>';

    let cliente, gravacoes, roteiros;
    try {
      [cliente, gravacoes, roteiros] = await Promise.all([
        B7.DB.cliente(id), B7.DB.listarGravacoes(id), B7.DB.roteirosDoCliente(id, aba === 'roteiros' ? 40 : 5)
      ]);
      gravacoes.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
      B7.Rota.titulo([cliente.nome]);
    } catch (e) { return erro(e, 'abrirClientes'); }

    /* métricas do cliente, tiradas dos dados reais dele */
    const conta = st => gravacoes.filter(g => g.status === st).length;
    const emAndamento = conta('Rascunho') + conta('Pronto para gravar');
    const ultima = gravacoes[0];

    painel().innerHTML = '<div class="conteudo entra">' +
      '<div class="trilha-nav"><button data-ir="#/">Dashboard</button><span>/</span>' +
        '<button data-ir="#/clientes">Clientes</button><span>/</span><b>' + esc(cliente.nome) + '</b></div>' +

      capaCliente(cliente, gravacoes.length, emAndamento) +

      '<div class="abas-cliente">' +
        [['geral', 'Visão geral'], ['gravacoes', 'Gravações'], ['roteiros', 'Roteiros']].map(([k, r]) =>
          '<button data-aba-cli="' + k + '"' + (abaCliente === k ? ' class="on"' : '') + '>' + r + '</button>').join('') +
      '</div>' +

      (abaCliente === 'geral' ? visaoGeralCliente(cliente, gravacoes, roteiros, emAndamento, conta, ultima)
       : abaCliente === 'gravacoes' ? abaGravacoesCliente(cliente, gravacoes)
       : abaRoteirosCliente(cliente, roteiros)) +
    '</div>';

    ligar();
    painel().querySelectorAll('[data-aba-cli]').forEach(b => b.onclick = () => abrirCliente(id, b.dataset.abaCli));
    if (abaCliente === 'gravacoes') ligarFiltrosGravacoes(gravacoes);
  }

  function capaCliente(c, totalGravacoes, emAndamento) {
    const selo = c.logo_url
      ? '<div class="selo"><img src="' + esc(c.logo_url) + '" alt=""></div>'
      : '<div class="selo">' + esc(B7.UI.iniciais(c.nome)) + '</div>';
    return '<div class="capa-cliente">' +
      '<div class="malha"></div><div class="brilho"></div><div class="b7-marca"></div>' +
      selo +
      '<div class="info"><div class="olho">WORKSPACE · BRANDING7</div>' +
        '<h1>' + esc(c.nome) + '</h1>' +
        '<div class="meta"><span>' + totalGravacoes + ' gravaç' + (totalGravacoes === 1 ? 'ão' : 'ões') + '</span>' +
        '<span class="p"></span><span>' + c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') + '</span>' +
        (emAndamento ? '<span class="p"></span><span>' + emAndamento + ' em andamento</span>' : '') +
        '<span class="p"></span><span>última atividade ' + B7.UI.quando(c.ultima_atividade) + '</span></div></div>' +
      '<div class="acoes">' +
        '<button class="b pri" data-nova-gravacao="' + esc(c.id) + '">' + IC.mais + 'Nova gravação</button>' +
        '<button class="b clara" data-editar-cli="' + esc(c.id) + '">Editar cliente</button>' +
        '<div class="menu"><button class="ico" style="color:rgba(255,255,255,.7)">⋯</button><div class="lista">' +
          '<button data-nova-gravacao="' + esc(c.id) + '">Nova gravação</button>' +
          '<button data-editar-cli="' + esc(c.id) + '">Editar cliente</button>' +
          (window.__ultimaDoCliente ? '' : '') +
          '<hr><button class="perigo" data-excluir-cli="' + esc(c.id) + '">Excluir cliente</button>' +
        '</div></div>' +
      '</div></div>';
  }

  function visaoGeralCliente(c, gravacoes, roteiros, emAndamento, conta, ultima) {
    const metricas =
      '<div class="mini-metricas">' +
        '<div class="mini-metrica"><b>' + gravacoes.length + '</b><span>GRAVAÇÕES</span></div>' +
        '<div class="mini-metrica"><b>' + c.total_roteiros + '</b><span>ROTEIROS</span></div>' +
        '<div class="mini-metrica"><b>' + emAndamento + '</b><span>EM ANDAMENTO</span></div>' +
        '<div class="mini-metrica"><b>' + conta('Gravado') + '</b><span>GRAVADAS</span></div>' +
      '</div>';

    if (!gravacoes.length) {
      return metricas + '<div class="cartao vazio" style="position:relative;overflow:hidden">' +
        '<div class="b7-marca fraca" style="right:24px;bottom:-10px;width:110px;height:110px"></div>' +
        '<div class="ilu">' + IC.gravacoes + '</div>' +
        '<b>Nenhuma gravação ainda</b><p>Crie a primeira gravação deste cliente para começar.</p>' +
        '<button class="b pri" data-nova-gravacao="' + esc(c.id) + '">' + IC.mais + 'Nova gravação</button></div>';
    }

    /* atividade recente: derivada de updated_at, sem inventar histórico */
    const atividade = gravacoes.slice(0, 5).map(g =>
      '<div class="item" data-gravacao="' + esc(g.id) + '"><div class="pt"></div>' +
      '<div class="tx"><b>' + esc(g.nome) + '</b><small>' +
      (g.status === 'Gravado' ? 'marcada como gravada' : 'atualizada') + ' ' + B7.UI.quando(g.updated_at) +
      ' · ' + g.total_roteiros + ' roteiro' + (g.total_roteiros === 1 ? '' : 's') + '</small></div></div>').join('');

    const listaRoteiros = roteiros.length ? roteiros.map(r =>
      '<div class="roteiro-linha" data-gravacao="' + esc(r.recording_session_id) +
        '" data-roteiro="' + esc(r.id) + '">' +
        '<div class="n">' + String((r.position || 0) + 1).padStart(2, '0') + '</div>' +
        '<div class="tx"><b>' + esc(r.titulo || 'Sem título') + '</b><small>' +
        (r.gravacao ? esc(r.gravacao.nome) + ' · ' : '') + 'editado ' + B7.UI.quando(r.updated_at) + '</small></div>' +
        (r.gravacao ? B7.UI.chipStatus(r.gravacao.status) : '') + '</div>').join('')
      : '<div class="vazio" style="padding:26px"><b>Nenhum roteiro ainda</b></div>';

    return metricas +
      '<div class="colunas"><div>' +
        '<div class="secao"><div class="secao-topo"><h2>Última gravação</h2></div>' +
          cardDestaque(ultima) + '</div>' +
        (gravacoes.length > 1 ? '<div class="secao"><div class="secao-topo"><h2>Gravações</h2>' +
          '<span class="conta">' + gravacoes.length + '</span><div class="espaco"></div>' +
          '<button class="b fina contorno" data-aba-cli="gravacoes">Ver todas</button></div>' +
          '<div class="grade">' + gravacoes.slice(1, 4).map(cardGravacao).join('') + '</div></div>' : '') +
        '<div class="secao"><div class="secao-topo"><h2>Roteiros recentes</h2>' +
          '<div class="espaco"></div><button class="b fina contorno" data-aba-cli="roteiros">Ver todos</button></div>' +
          listaRoteiros + '</div>' +
      '</div><div class="apoio">' +
        '<div class="bloco"><h3>Ações rápidas</h3>' +
          '<button class="acao-rapida" data-nova-gravacao="' + esc(c.id) + '"><div class="ic">' + IC.mais + '</div>' +
            '<div class="tx"><b>Nova gravação</b><small>para ' + esc(c.nome) + '</small></div></button>' +
          '<button class="acao-rapida" data-editar-cli="' + esc(c.id) + '"><div class="ic">' + IC.pessoa + '</div>' +
            '<div class="tx"><b>Editar cliente</b><small>nome, logo e observações</small></div></button>' +
          '<button class="acao-rapida" data-gravacao="' + esc(ultima.id) + '"><div class="ic">' + IC.play + '</div>' +
            '<div class="tx"><b>Continuar ' + esc(ultima.nome) + '</b><small>editado ' + B7.UI.quando(ultima.updated_at) + '</small></div></button>' +
          '<button class="acao-rapida" data-imprimir="' + esc(ultima.id) + '"><div class="ic">' + IC.imprimir + '</div>' +
            '<div class="tx"><b>Imprimir última gravação</b><small>' + esc(ultima.nome) + '</small></div></button>' +
          '<button class="acao-rapida" data-dup="' + esc(ultima.id) + '"><div class="ic">' + IC.gravacoes + '</div>' +
            '<div class="tx"><b>Duplicar última gravação</b><small>copia roteiros e cenas</small></div></button>' +
        '</div>' +
        '<div class="bloco"><h3>Atividade recente</h3><div class="atividade">' + atividade + '</div></div>' +
        (c.observacoes ? '<div class="bloco"><h3>Observações</h3>' +
          '<p style="font-size:13px;line-height:1.6;color:var(--ink-2)">' + esc(c.observacoes) + '</p></div>' : '') +
      '</div></div>';
  }

  function abaGravacoesCliente(c, gravacoes) {
    return '<div class="barra-filtros">' +
        '<div class="filtro" id="filtro-cli-grav">' +
          ['Todas', 'Em andamento', 'Prontas', 'Gravadas'].map((f, i) =>
            '<button data-f="' + esc(f) + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(f) + '</button>').join('') +
        '</div>' +
        '<input class="campo" id="busca-grav" placeholder="Buscar gravações…">' +
        '<div class="espaco" style="flex:1"></div>' +
        '<button class="b pri" data-nova-gravacao="' + esc(c.id) + '">' + IC.mais + 'Nova gravação</button>' +
      '</div>' +
      (gravacoes.length
        ? '<div class="grade" id="lista-grav-cli">' + gravacoes.map(cardGravacao).join('') + '</div>'
        : '<div class="cartao vazio"><div class="ilu">' + IC.gravacoes + '</div><b>Nenhuma gravação ainda</b>' +
          '<p>Crie a primeira gravação deste cliente para começar.</p>' +
          '<button class="b pri" data-nova-gravacao="' + esc(c.id) + '">' + IC.mais + 'Nova gravação</button></div>');
  }

  function ligarFiltrosGravacoes(gravacoes) {
    const mapa = { 'Todas': null, 'Em andamento': 'Rascunho', 'Prontas': 'Pronto para gravar', 'Gravadas': 'Gravado' };
    let filtro = 'Todas', termo = '';
    const aplicar = () => {
      let lista = gravacoes.slice();
      if (mapa[filtro]) lista = lista.filter(g => g.status === mapa[filtro]);
      if (termo) lista = lista.filter(g => g.nome.toLowerCase().includes(termo));
      const cx = document.getElementById('lista-grav-cli');
      if (!cx) return;
      cx.innerHTML = lista.length ? lista.map(cardGravacao).join('')
        : '<div class="vazio" style="grid-column:1/-1"><b>Nada por aqui</b><p>Tente outro filtro ou outra busca.</p></div>';
      ligar();
    };
    const f = document.getElementById('filtro-cli-grav');
    if (f) f.querySelectorAll('button').forEach(b => b.onclick = () => {
      f.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); filtro = b.dataset.f; aplicar();
    });
    const busca = document.getElementById('busca-grav');
    if (busca) busca.oninput = () => { termo = busca.value.trim().toLowerCase(); aplicar(); };
  }

  function abaRoteirosCliente(c, roteiros) {
    if (!roteiros.length) {
      return '<div class="cartao vazio"><div class="ilu">' + IC.roteiros + '</div>' +
        '<b>Nenhum roteiro ainda</b><p>Crie uma gravação e comece a escrever.</p>' +
        '<button class="b pri" data-nova-gravacao="' + esc(c.id) + '">' + IC.mais + 'Nova gravação</button></div>';
    }
    return roteiros.map(r =>
      '<div class="roteiro-linha" data-gravacao="' + esc(r.recording_session_id) +
        '" data-roteiro="' + esc(r.id) + '">' +
        '<div class="n">' + String((r.position || 0) + 1).padStart(2, '0') + '</div>' +
        '<div class="tx"><b>' + esc(r.titulo || 'Sem título') + '</b><small>' +
        (r.gravacao ? esc(r.gravacao.nome) + ' · ' : '') + 'editado ' + B7.UI.quando(r.updated_at) + '</small></div>' +
        (r.gravacao ? B7.UI.chipStatus(r.gravacao.status) : '') + '</div>').join('');
  }


  /* =================================================== CONFIGURAÇÕES */
  function abrirConfig() {
    marcarNav('#/config');
    B7.Rota.titulo(['Configurações']);
    const tema = document.documentElement.getAttribute('data-theme');
    const densidade = B7.pref.ler('densidade', 'confortavel');
    const abertura = B7.pref.ler('abertura', false);
    const recolhida = document.body.classList.contains('recolhida');
    const online = navigator.onLine;

    const opcao = (grupo, atual, itens) =>
      '<div class="opcoes" data-grupo="' + grupo + '">' + itens.map(([v, r]) =>
        '<button data-v="' + v + '"' + (atual === v ? ' class="on"' : '') + '>' + r + '</button>').join('') + '</div>';

    const linha = (titulo, desc, controle) =>
      '<div class="config-linha"><div class="tx"><b>' + titulo + '</b><small>' + desc + '</small></div>' +
      controle + '</div>';

    painel().innerHTML = '<div class="conteudo entra" style="max-width:860px">' +
      '<div class="trilha-nav"><button data-ir="#/">Central B7</button><span>/</span><b>Configurações</b></div>' +
      '<h1 style="font-family:Archivo;font-size:26px;font-weight:900;letter-spacing:-.03em;margin-bottom:20px">Configurações</h1>' +

      '<div class="config-secao"><h3>Aparência</h3>' +
        '<div class="desc">Vale só para este navegador — cada pessoa da equipe ajusta o seu.</div>' +
        linha('Tema', 'claro, escuro ou como está o seu computador',
              opcao('tema', tema, [['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Sistema']])) +
        linha('Densidade', 'quanto conteúdo cabe na tela',
              opcao('densidade', densidade, [['confortavel', 'Confortável'], ['compacta', 'Compacta']])) +
        linha('Animações', 'o sistema respeita a preferência do seu sistema operacional',
              '<span style="font-size:12.5px;color:var(--ink-3)">' +
              (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduzidas' : 'normais') + '</span>') +
      '</div>' +

      '<div class="config-secao"><h3>Interface</h3>' +
        '<div class="desc">Como a navegação se comporta.</div>' +
        linha('Barra lateral', 'começar recolhida, só com os ícones',
              opcao('sidebar', recolhida ? 'sim' : 'nao', [['nao', 'Expandida'], ['sim', 'Recolhida']])) +
        linha('Atalhos de teclado', 'ver a lista completa',
              '<button class="b contorno" data-atalhos>Ver atalhos</button>') +
      '</div>' +

      '<div class="config-secao"><h3>Impressão</h3>' +
        '<div class="desc">A ficha A4 não muda com o tema: ela é sempre clara.</div>' +
        linha('Folha de abertura', 'vir marcada por padrão na janela de impressão',
              opcao('abertura', abertura ? 'sim' : 'nao', [['nao', 'Desligada'], ['sim', 'Ligada']])) +
      '</div>' +

      '<div class="config-secao"><h3>Dados</h3>' +
        '<div class="desc">O banco é o Supabase. Isto aqui é segurança extra.</div>' +
        linha('Backup', 'baixa um arquivo com clientes, gravações, roteiros e cenas',
              '<button class="b contorno" data-exportar>Exportar</button>') +
        linha('Restaurar', 'devolve os registros de um arquivo de backup',
              '<button class="b contorno" data-importar>Importar</button>') +
      '</div>' +

      '<div class="config-secao"><h3>Sistema</h3>' +
        linha('Conexão com o banco', online ? 'tudo certo por aqui' : 'reconecte para voltar a salvar',
              '<span class="chip-status ' + (online ? 'gravado' : 'pronto') + '">' +
              (online ? 'Conectado' : 'Sem conexão') + '</span>') +
        linha('Versão', 'Roteiros B7', '<span style="font-size:12.5px;color:var(--ink-3)">v2.1</span>') +
      '</div></div>';

    ligar();
    painel().querySelectorAll('.opcoes').forEach(cx => {
      cx.querySelectorAll('button').forEach(b => b.onclick = () => {
        cx.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        const grupo = cx.dataset.grupo, v = b.dataset.v;
        if (grupo === 'tema') {
          if (v === 'auto') {
            try { localStorage.removeItem('b7_tema'); } catch (e) {}
            const escuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', escuro ? 'dark' : 'light');
          } else if (document.documentElement.getAttribute('data-theme') !== v) {
            B7.alternarTema();
          }
          B7.UI.toast('Tema atualizado');
        }
        if (grupo === 'densidade') { B7.aplicarDensidade(v); B7.UI.toast('Densidade: ' + b.textContent.toLowerCase()); }
        if (grupo === 'sidebar') {
          document.body.classList.toggle('recolhida', v === 'sim');
          B7.pref.gravar('sidebar_recolhida', v === 'sim');
        }
        if (grupo === 'abertura') B7.pref.gravar('abertura', v === 'sim');
      });
    });
    const at = painel().querySelector('[data-atalhos]'); if (at) at.onclick = () => B7.UI.atalhos();
    const ex = painel().querySelector('[data-exportar]'); if (ex) ex.onclick = () => B7.Backup.exportar();
    const im = painel().querySelector('[data-importar]'); if (im) im.onclick = () => B7.Backup.importar();
  }

  /* ====================================================== interações */
  function marcarNav(rota) {
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.ir === rota));
    if (B7.moverTrilha) B7.moverTrilha();
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
    p.querySelectorAll('[data-aba-cli]').forEach(b => b.onclick = () => {
      const cli = location.hash.split('/')[2];
      if (cli) abrirCliente(cli, b.dataset.abaCli);
    });
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
    p.querySelectorAll('[data-fixar]').forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      const fixado = b.dataset.fixado === '1';
      try {
        await B7.Save.acao(() => B7.DB.fixarCliente(b.dataset.fixar, !fixado),
          fixado ? 'Cliente desafixado' : 'Cliente fixado no topo');
        B7.Rota.recarregar();
      } catch (e) {}
    });
    ligarPrevia(p);
    B7.UI.ligarMenus(p);
    ligarSpotlight(p);
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

  return { abrir, abrirClientes, abrirCliente, abrirGravacoes, abrirRoteiros, abrirConfig,
           modalNovaGravacao, modalNovoCliente, modalEditarCliente, excluirCliente,
           buscar, duplicarGravacao, excluirGravacao, IC,
           get ultima() { return ultimaGravacao; } };
})();
