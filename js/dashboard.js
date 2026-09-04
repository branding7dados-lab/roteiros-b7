/* =====================================================================
   DASHBOARD
   Tela inicial: resumo, gravações recentes, clientes e busca global.
   Estrutura do sistema: CLIENTE → GRAVAÇÕES → ROTEIROS → CENAS.
   Uma gravação é um grupo de roteiros de um cliente. A data é apenas um
   metadado opcional — dois clientes podem gravar no mesmo dia sem que
   isso vire uma coisa só.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.Dashboard = (function () {
  const esc = B7.UI.esc;
  const painel = () => document.getElementById('painel-dashboard');

  const ICO = '<svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h10"/></svg>';

  function esqueleto() {
    painel().innerHTML = '<div class="conteudo">' +
      '<div class="resumo">' + '<div class="esqueleto" style="height:86px"></div>'.repeat(4) + '</div>' +
      '<div class="grade">' + '<div class="esqueleto" style="height:150px"></div>'.repeat(3) + '</div></div>';
  }

  /* ------------------------------------------------------------ raiz */
  async function abrir() {
    esqueleto();
    let resumo, recentes, clientes;
    try {
      [resumo, recentes, clientes] = await Promise.all([
        B7.DB.resumo(), B7.DB.gravacoesRecentes(6), B7.DB.listarClientes()
      ]);
    } catch (e) { return erro(e); }

    painel().innerHTML = '<div class="conteudo">' +
      '<div class="resumo">' +
        metrica(resumo.clientes, 'CLIENTES') +
        metrica(resumo.gravacoes, 'GRAVAÇÕES') +
        metrica(resumo.roteiros, 'ROTEIROS') +
        metrica(resumo.mes, 'ROTEIROS ESTE MÊS', true) +
      '</div>' +

      '<div class="secao"><div class="secao-topo"><h2>Continue de onde parou</h2><div class="espaco"></div></div>' +
        (recentes.length ? '<div class="grade">' + recentes.map(cardGravacao).join('') + '</div>' : vazioGravacoes()) +
      '</div>' +

      '<div class="secao"><div class="secao-topo"><h2>Clientes</h2>' +
        '<span class="conta">' + clientes.length + '</span><div class="espaco"></div>' +
        '<button class="b fina" id="bt-novo-cliente">+ Novo cliente</button></div>' +
        (clientes.length
          ? '<div class="lista-clientes">' + clientes.slice(0, 8).map(cardCliente).join('') + '</div>' +
            (clientes.length > 8
              ? '<div style="text-align:center;margin-top:12px"><button class="b fina" id="bt-todos-clientes">Ver todos os ' +
                clientes.length + '</button></div>' : '')
          : vazioClientes()) +
      '</div></div>';

    ligarCliques();
  }

  const metrica = (valor, rotulo, destaque) =>
    '<div class="metrica' + (destaque ? ' destaque' : '') + '"><b>' + valor + '</b><small>' + rotulo + '</small></div>';

  function cardGravacao(g) {
    const data = g.data_gravacao ? '<span>' + B7.UI.dataBR(g.data_gravacao) + '</span><span class="p"></span>' : '';
    return '<div class="card-gravacao" data-gravacao="' + esc(g.id) + '">' +
      '<div class="cli">' + esc(g.cliente_nome) + '</div>' +
      '<h3>' + esc(g.nome) + '</h3>' +
      '<div class="meta">' + data +
      '<span>' + g.total_roteiros + ' roteiro' + (g.total_roteiros === 1 ? '' : 's') + '</span></div>' +
      '<div class="rodape">' + B7.UI.badgeStatus(g.status) +
      '<span class="quando">editado ' + B7.UI.quando(g.updated_at) + '</span></div></div>';
  }

  function cardCliente(c) {
    return '<div class="card-cliente" data-cliente="' + esc(c.id) + '">' +
      '<div class="avatar">' + esc(B7.UI.iniciais(c.nome)) + '</div>' +
      '<div class="nm"><b>' + esc(c.nome) + '</b><small>' +
      c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') + ' · ' +
      c.total_gravacoes + ' gravaç' + (c.total_gravacoes === 1 ? 'ão' : 'ões') + ' · ' +
      B7.UI.quando(c.ultima_atividade) + '</small></div><div class="seta">›</div></div>';
  }

  const vazioGravacoes = () =>
    '<div class="vazio"><div class="ilu">' + ICO + '</div>' +
    '<b>Nenhuma gravação ainda</b><p>Crie a primeira gravação para começar a escrever os roteiros.</p>' +
    '<button class="b pri" id="bt-nova-gravacao-vazio">+ Nova gravação</button></div>';

  const vazioClientes = () =>
    '<div class="vazio"><div class="ilu">' + ICO + '</div>' +
    '<b>Nenhum cliente ainda</b><p>Crie seu primeiro cliente para organizar as gravações.</p>' +
    '<button class="b pri" id="bt-novo-cliente-vazio">+ Criar cliente</button></div>';

  function erro(e) {
    console.error(e);
    painel().innerHTML = '<div class="conteudo"><div class="vazio">' +
      '<b>Não consegui falar com o banco</b><p>' + esc(e.message || 'Erro desconhecido') +
      '</p><button class="b pri" onclick="B7.Dashboard.abrir()">Tentar de novo</button></div></div>';
  }

  /* -------------------------------------------------- área do cliente */
  async function abrirCliente(id) {
    esqueleto();
    let cliente, gravacoes;
    try {
      [cliente, gravacoes] = await Promise.all([B7.DB.cliente(id), B7.DB.listarGravacoes(id)]);
      gravacoes.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    } catch (e) { return erro(e); }

    /* Lista simples, da mais recente para a mais antiga. Sem agrupar por
       mês: a organização do sistema é cliente → gravação, não calendário. */
    const linhas = gravacoes.map(g =>
      '<div class="linha-gravacao" data-gravacao="' + esc(g.id) + '">' +
      '<div class="nm"><b>' + esc(g.nome) + '</b><small>' +
      g.total_roteiros + ' roteiro' + (g.total_roteiros === 1 ? '' : 's') +
      (g.data_gravacao ? ' · ' + B7.UI.dataBR(g.data_gravacao) : '') +
      ' · editado ' + B7.UI.quando(g.updated_at) + '</small></div>' +
      B7.UI.badgeStatus(g.status) +
      '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button>' +
      '<div class="lista"><button data-dup="' + esc(g.id) + '">Duplicar gravação</button>' +
      '<button class="perigo" data-excluir="' + esc(g.id) + '">Excluir gravação</button></div></div></div>'
    ).join('');

    painel().innerHTML = '<div class="conteudo">' +
      '<button class="voltar" data-voltar>‹ Dashboard</button>' +
      '<div class="cabeca-cliente"><div class="avatar">' + esc(B7.UI.iniciais(cliente.nome)) + '</div>' +
      '<div style="flex:1"><h1>' + esc(cliente.nome) + '</h1>' +
      '<small>' + cliente.total_gravacoes + ' gravaç' + (cliente.total_gravacoes === 1 ? 'ão' : 'ões') +
      ' · ' + cliente.total_roteiros + ' roteiro' + (cliente.total_roteiros === 1 ? '' : 's') +
      ' · última atividade ' + B7.UI.quando(cliente.ultima_atividade) +
      '</small></div>' +
      '<button class="b pri" data-nova-gravacao="' + esc(cliente.id) + '">+ Nova gravação</button></div>' +
      '<div class="secao-topo"><h2>Gravações</h2><span class="conta">' + gravacoes.length + '</span></div>' +
      (gravacoes.length ? linhas :
        '<div class="vazio"><div class="ilu">' + ICO + '</div>' +
        '<b>Nenhuma gravação para este cliente</b><p>Crie a primeira e comece os roteiros.</p>' +
        '<button class="b pri" data-nova-gravacao="' + esc(cliente.id) + '">+ Nova gravação</button></div>') +
      '</div>';

    ligarCliques();
    B7.UI.ligarMenus(painel());
  }

  async function listarTodosClientes() {
    const clientes = await B7.DB.listarClientes();
    painel().innerHTML = '<div class="conteudo">' +
      '<button class="voltar" data-voltar>‹ Dashboard</button>' +
      '<div class="secao-topo"><h2>Todos os clientes</h2><span class="conta">' + clientes.length + '</span>' +
      '<div class="espaco"></div><button class="b fina" id="bt-novo-cliente">+ Novo cliente</button></div>' +
      '<div class="lista-clientes">' + clientes.map(cardCliente).join('') + '</div></div>';
    ligarCliques();
  }

  /* -------------------------------------------------------- interações */
  function ligarCliques() {
    const p = painel();
    p.querySelectorAll('[data-gravacao]').forEach(el => {
      el.onclick = ev => {
        if (ev.target.closest('.menu')) return;
        location.hash = '#/gravacao/' + el.dataset.gravacao;
      };
    });
    p.querySelectorAll('[data-cliente]').forEach(el => {
      el.onclick = () => location.hash = '#/cliente/' + el.dataset.cliente;
    });
    const v = p.querySelector('[data-voltar]'); if (v) v.onclick = () => location.hash = '#/';
    p.querySelectorAll('[data-nova-gravacao]').forEach(b =>
      b.onclick = () => modalNovaGravacao(b.dataset.novaGravacao));
    ['bt-novo-cliente', 'bt-novo-cliente-vazio'].forEach(id => {
      const b = document.getElementById(id); if (b) b.onclick = () => modalNovoCliente();
    });
    const ng = document.getElementById('bt-nova-gravacao-vazio');
    if (ng) ng.onclick = () => modalNovaGravacao();
    const tc = document.getElementById('bt-todos-clientes');
    if (tc) tc.onclick = () => listarTodosClientes();

    p.querySelectorAll('[data-dup]').forEach(b => b.onclick = e => {
      e.stopPropagation(); duplicarGravacao(b.dataset.dup);
    });
    p.querySelectorAll('[data-excluir]').forEach(b => b.onclick = e => {
      e.stopPropagation(); excluirGravacao(b.dataset.excluir);
    });
  }

  /* ---------------------------------------------------- novo cliente */
  function modalNovoCliente(aoCriar) {
    const m = B7.UI.modal(
      '<h3>Novo cliente</h3><div class="sub">Só o nome já basta. O resto você preenche depois.</div>' +
      '<div class="mb"><label class="rot">NOME</label>' +
      '<input class="campo" id="nc-nome" data-foco placeholder="Ex: Mercato Sadia"></div>' +
      '<div class="mb"><label class="rot">OBSERVAÇÕES (OPCIONAL)</label>' +
      '<textarea class="campo" id="nc-obs" rows="2" placeholder="Tom de voz, contato, particularidades…"></textarea></div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok>Criar cliente</button></div>');

    const nome = m.querySelector('#nc-nome');
    const criar = async () => {
      if (!nome.value.trim()) { nome.classList.add('erro'); nome.focus(); return; }
      try {
        const c = await B7.Save.acao(
          () => B7.DB.criarCliente(nome.value, m.querySelector('#nc-obs').value), 'Cliente criado');
        m.fechar();
        if (aoCriar) aoCriar(c); else abrir();
      } catch (e) {
        if (String(e.message || '').includes('duplicate') || e.code === '23505') {
          B7.UI.toast('Já existe um cliente com esse nome', { tipo: 'erro' });
        }
      }
    };
    m.querySelector('[data-ok]').onclick = criar;
    nome.onkeydown = e => { if (e.key === 'Enter') criar(); };
  }

  /* -------------------------------------------------- nova gravação */
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
        '</select><button class="b" id="ng-novo-cliente" style="flex:none">+ Novo</button></div></div>' +
      '<div class="mb"><label class="rot">NOME DA GRAVAÇÃO</label>' +
        '<input class="campo" id="ng-nome" data-foco placeholder="Ex: Conteúdos Setembro"></div>' +
      '<div class="mb"><label class="rot">DATA DA GRAVAÇÃO (OPCIONAL)</label>' +
        '<input class="campo" id="ng-data" type="date">' +
        '<div class="ajuda" style="font-size:11px;color:#9990B0;margin-top:6px">' +
        'Pode deixar em branco e definir depois. Sem data, a folha impressa não mostra campo de data.</div></div>' +
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

  /* ------------------------------------------ duplicar / excluir */
  async function duplicarGravacao(id) {
    let g;
    try { g = await B7.DB.gravacao(id); } catch (e) { return; }
    const clientes = await B7.DB.listarClientes();
    const m = B7.UI.modal(
      '<h3>Duplicar gravação</h3><div class="sub">Copia roteiros, cenas e observações para uma nova gravação. ' +
      'A data vem em branco de propósito, para não arrastar uma data antiga sem querer.</div>' +
      '<div class="mb"><label class="rot">CLIENTE</label><select class="campo" id="dg-cliente">' +
      clientes.map(c => '<option value="' + esc(c.id) + '"' + (c.id === g.client_id ? ' selected' : '') + '>' +
        esc(c.nome) + '</option>').join('') + '</select></div>' +
      '<div class="mb"><label class="rot">NOME DA GRAVAÇÃO</label>' +
      '<input class="campo" id="dg-nome" data-foco value="' + esc(g.nome + ' (cópia)') + '"></div>' +
      '<div class="mb"><label class="rot">DATA (OPCIONAL)</label>' +
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
      texto: 'Isso apaga também todos os roteiros e cenas dela. Não dá para desfazer depois de fechar o aviso.',
      rotulo: 'Excluir', perigo: true,
      aoConfirmar: async () => {
        try {
          await B7.Save.acao(() => B7.DB.excluirGravacao(id), 'Gravação excluída');
          B7.Rota.recarregar();
        } catch (e) {}
      }
    });
  }

  /* ------------------------------------------------------------ busca */
  const buscar = B7.UI.debounce(async function (termo, caixa) {
    if (!termo.trim()) { caixa.classList.remove('aberto'); return; }
    try {
      const r = await B7.DB.buscar(termo);
      let html = '';
      if (r.clientes.length) {
        html += '<div class="grupo">CLIENTES</div>' + r.clientes.map(c =>
          '<div class="res" data-ir="#/cliente/' + esc(c.id) + '"><div class="mini">' +
          esc(B7.UI.iniciais(c.nome)) + '</div><div><b>' + esc(c.nome) + '</b><small>' +
          c.total_gravacoes + ' gravaç' + (c.total_gravacoes === 1 ? 'ão' : 'ões') + ' · ' +
          c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') + '</small></div></div>').join('');
      }
      if (r.gravacoes.length) {
        html += '<div class="grupo">GRAVAÇÕES</div>' + r.gravacoes.map(g =>
          '<div class="res" data-ir="#/gravacao/' + esc(g.id) + '"><div class="mini">▣</div><div><b>' +
          esc(g.nome) + '</b><small>' + esc(g.cliente_nome) +
          (g.data_gravacao ? ' · ' + B7.UI.dataBR(g.data_gravacao) : '') + '</small></div></div>').join('');
      }
      if (r.roteiros.length) {
        html += '<div class="grupo">ROTEIROS</div>' + r.roteiros.map(t =>
          '<div class="res" data-ir="#/gravacao/' + esc(t.recording_session_id) + '?roteiro=' + esc(t.id) +
          '"><div class="mini">▸</div><div><b>' + esc(t.titulo || 'Sem título') +
          '</b><small>abrir na gravação</small></div></div>').join('');
      }
      caixa.innerHTML = html || '<div class="nada">Nada encontrado para “' + esc(termo) + '”</div>';
      caixa.classList.add('aberto');
      caixa.querySelectorAll('[data-ir]').forEach(el => el.onclick = () => {
        caixa.classList.remove('aberto');
        location.hash = el.dataset.ir;
      });
    } catch (e) { console.error(e); }
  }, 260);

  /* -------------------------------------------------- paleta (Ctrl+K) */
  async function paleta() {
    const m = B7.UI.modal(
      '<h3>O que você quer fazer?</h3>' +
      '<input class="campo mb" id="pl-busca" data-foco placeholder="Digite para filtrar…">' +
      '<div class="corpo" id="pl-lista"></div>' +
      '<div class="acoes"><button class="b" data-fecha>Fechar</button></div>', { larga: true });

    let recentes = [];
    try { recentes = await B7.DB.gravacoesRecentes(6); } catch (e) {}

    const acoes = [
      { rot: 'Nova gravação', dica: 'criar um grupo de roteiros', ico: '+', fn: () => modalNovaGravacao() },
      { rot: 'Novo cliente', dica: 'cadastrar cliente', ico: '+', fn: () => modalNovoCliente() },
      { rot: 'Buscar roteiro', dica: 'procurar por título', ico: '⌕',
        fn: () => { const c = document.getElementById('campo-busca'); if (c) c.focus(); } }
    ].concat(recentes.map(g => ({
      rot: g.nome, dica: 'abrir · ' + g.cliente_nome, ico: '▣',
      fn: () => { location.hash = '#/gravacao/' + g.id; }
    })));

    const lista = m.querySelector('#pl-lista');
    const desenhar = filtro => {
      const f = (filtro || '').toLowerCase();
      const itens = acoes.filter(a => (a.rot + ' ' + a.dica).toLowerCase().includes(f));
      lista.innerHTML = itens.length ? itens.map((a, i) =>
        '<div class="res" data-i="' + acoes.indexOf(a) + '"><div class="mini">' + a.ico + '</div>' +
        '<div><b>' + esc(a.rot) + '</b><small>' + esc(a.dica) + '</small></div></div>').join('')
        : '<div class="nada">Nada por aqui</div>';
      lista.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
        m.fechar(); acoes[+el.dataset.i].fn();
      });
    };
    desenhar('');
    const inp = m.querySelector('#pl-busca');
    inp.oninput = () => desenhar(inp.value);
    inp.onkeydown = e => {
      if (e.key === 'Enter') {
        const primeiro = lista.querySelector('[data-i]');
        if (primeiro) primeiro.click();
      }
    };
  }

  return { abrir, abrirCliente, modalNovaGravacao, modalNovoCliente, buscar,
           duplicarGravacao, excluirGravacao, paleta };
})();
