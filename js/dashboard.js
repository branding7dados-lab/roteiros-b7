/* =====================================================================
   DASHBOARD
   Tela inicial: resumo, "continue de onde parou", clientes e busca.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.Dashboard = (function () {
  const esc = B7.UI.esc;
  const painel = () => document.getElementById('painel-dashboard');

  const ICO_VAZIO = '<svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h10"/></svg>';

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
        B7.DB.resumo(), B7.DB.diariasRecentes(6), B7.DB.listarClientes()
      ]);
    } catch (e) {
      return erro(e);
    }

    const cards = recentes.map(cardDiaria).join('');
    const listaClientes = clientes.slice(0, 8).map(cardCliente).join('');

    painel().innerHTML = '<div class="conteudo">' +
      '<div class="resumo">' +
        metrica(resumo.clientes, 'CLIENTES') +
        metrica(resumo.diarias, 'DIÁRIAS') +
        metrica(resumo.roteiros, 'ROTEIROS') +
        metrica(resumo.mes, 'ROTEIROS ESTE MÊS', true) +
      '</div>' +

      '<div class="secao"><div class="secao-topo"><h2>Continue de onde parou</h2><div class="espaco"></div></div>' +
        (recentes.length ? '<div class="grade">' + cards + '</div>' : vazioDiarias()) +
      '</div>' +

      '<div class="secao"><div class="secao-topo"><h2>Clientes</h2>' +
        '<span class="conta">' + clientes.length + '</span><div class="espaco"></div>' +
        '<button class="b fina" id="bt-novo-cliente">+ Novo cliente</button></div>' +
        (clientes.length ? '<div class="lista-clientes">' + listaClientes + '</div>' + 
          (clientes.length > 8 ? '<div style="text-align:center;margin-top:12px"><button class="b fina" id="bt-todos-clientes">Ver todos os ' + clientes.length + '</button></div>' : '')
          : vazioClientes()) +
      '</div></div>';

    ligarCliques();
  }

  function metrica(valor, rotulo, destaque) {
    return '<div class="metrica' + (destaque ? ' destaque' : '') + '"><b>' + valor + '</b><small>' + rotulo + '</small></div>';
  }

  function cardDiaria(d) {
    return '<div class="card-diaria" data-diaria="' + esc(d.id) + '">' +
      '<div class="cli">' + esc(d.cliente_nome) + '</div>' +
      '<h3>' + esc(d.nome) + '</h3>' +
      '<div class="meta"><span>' + (d.data_gravacao ? B7.UI.dataBR(d.data_gravacao) : 'sem data') + '</span>' +
      '<span class="p"></span><span>' + d.total_roteiros + ' roteiro' + (d.total_roteiros === 1 ? '' : 's') + '</span></div>' +
      '<div class="rodape">' + B7.UI.badgeStatus(d.status) +
      '<span class="quando">' + B7.UI.quando(d.updated_at) + '</span></div></div>';
  }

  function cardCliente(c) {
    return '<div class="card-cliente" data-cliente="' + esc(c.id) + '">' +
      '<div class="avatar">' + esc(B7.UI.iniciais(c.nome)) + '</div>' +
      '<div class="nm"><b>' + esc(c.nome) + '</b><small>' + c.total_roteiros + ' roteiro' +
      (c.total_roteiros === 1 ? '' : 's') + ' · ' +
      c.total_diarias + ' diária' + (c.total_diarias === 1 ? '' : 's') + ' · ' +
      B7.UI.quando(c.ultima_atividade) + '</small></div><div class="seta">›</div></div>';
  }

  function vazioDiarias() {
    return '<div class="vazio"><div class="ilu">' + ICO_VAZIO + '</div>' +
      '<b>Nenhuma diária ainda</b><p>Crie a primeira diária para começar a escrever os roteiros.</p>' +
      '<button class="b pri" id="bt-nova-diaria-vazio">+ Nova diária</button></div>';
  }
  function vazioClientes() {
    return '<div class="vazio"><div class="ilu">' + ICO_VAZIO + '</div>' +
      '<b>Nenhum cliente ainda</b><p>Crie seu primeiro cliente para organizar as diárias.</p>' +
      '<button class="b pri" id="bt-novo-cliente-vazio">+ Criar cliente</button></div>';
  }

  function erro(e) {
    console.error(e);
    painel().innerHTML = '<div class="conteudo"><div class="vazio">' +
      '<b>Não consegui falar com o banco</b><p>' + esc(e.message || 'Erro desconhecido') +
      '</p><button class="b pri" onclick="B7.Dashboard.abrir()">Tentar de novo</button></div></div>';
  }

  /* -------------------------------------------------- área do cliente */
  async function abrirCliente(id) {
    esqueleto();
    let cliente, diarias;
    try {
      [cliente, diarias] = await Promise.all([B7.DB.cliente(id), B7.DB.listarDiarias(id)]);
    } catch (e) { return erro(e); }

    let html = '';
    let mesAtual = null;
    diarias.forEach(d => {
      const mes = d.data_gravacao ? d.data_gravacao.slice(0, 7) : 'sem-data';
      if (mes !== mesAtual) {
        mesAtual = mes;
        html += '<div class="mes-rot">' + (d.data_gravacao ? B7.UI.mesRotulo(d.data_gravacao) : 'SEM DATA') + '</div>';
      }
      const dia = d.data_gravacao ? B7.UI.dataBR(d.data_gravacao).slice(0, 5) : '--/--';
      html += '<div class="linha-diaria" data-diaria="' + esc(d.id) + '">' +
        '<div class="dia">' + dia + '</div>' +
        '<div class="nm"><b>' + esc(d.nome) + '</b><small>' + d.total_roteiros + ' roteiro' +
        (d.total_roteiros === 1 ? '' : 's') + ' · alterada ' + B7.UI.quando(d.updated_at) + '</small></div>' +
        B7.UI.badgeStatus(d.status) +
        '<div class="menu"><button class="ico" onclick="event.stopPropagation()">⋯</button>' +
        '<div class="lista"><button data-dup="' + esc(d.id) + '">Duplicar diária</button>' +
        '<button class="perigo" data-excluir="' + esc(d.id) + '">Excluir diária</button></div></div></div>';
    });

    painel().innerHTML = '<div class="conteudo">' +
      '<button class="voltar" data-voltar>‹ Dashboard</button>' +
      '<div class="cabeca-cliente"><div class="avatar">' + esc(B7.UI.iniciais(cliente.nome)) + '</div>' +
      '<div style="flex:1"><h1>' + esc(cliente.nome) + '</h1>' +
      '<small>' + cliente.total_roteiros + ' roteiros · ' + cliente.total_diarias + ' diárias · última atividade ' +
      B7.UI.quando(cliente.ultima_atividade) + '</small></div>' +
      '<button class="b pri" data-nova-diaria="' + esc(cliente.id) + '">+ Nova diária</button></div>' +
      (diarias.length ? html : '<div class="vazio"><div class="ilu">' + ICO_VAZIO + '</div>' +
        '<b>Nenhuma diária para este cliente</b><p>Crie a primeira diária e comece os roteiros.</p>' +
        '<button class="b pri" data-nova-diaria="' + esc(cliente.id) + '">+ Nova diária</button></div>') +
      '</div>';

    ligarCliques();
    B7.UI.ligarMenus(painel());
  }

  /* ------------------------------------------------------- interações */
  function ligarCliques() {
    const p = painel();
    p.querySelectorAll('[data-diaria]').forEach(el => {
      el.onclick = ev => {
        if (ev.target.closest('.menu')) return;
        location.hash = '#/diaria/' + el.dataset.diaria;
      };
    });
    p.querySelectorAll('[data-cliente]').forEach(el => {
      el.onclick = () => location.hash = '#/cliente/' + el.dataset.cliente;
    });
    const v = p.querySelector('[data-voltar]'); if (v) v.onclick = () => location.hash = '#/';
    p.querySelectorAll('[data-nova-diaria]').forEach(b => b.onclick = () => modalNovaDiaria(b.dataset.novaDiaria));
    ['bt-novo-cliente', 'bt-novo-cliente-vazio'].forEach(id => {
      const b = document.getElementById(id); if (b) b.onclick = () => modalNovoCliente();
    });
    const nd = document.getElementById('bt-nova-diaria-vazio');
    if (nd) nd.onclick = () => modalNovaDiaria();
    const tc = document.getElementById('bt-todos-clientes');
    if (tc) tc.onclick = () => listarTodosClientes();

    p.querySelectorAll('[data-dup]').forEach(b => b.onclick = e => {
      e.stopPropagation(); duplicarDiaria(b.dataset.dup);
    });
    p.querySelectorAll('[data-excluir]').forEach(b => b.onclick = e => {
      e.stopPropagation(); excluirDiaria(b.dataset.excluir);
    });
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

  /* --------------------------------------------------- novo cliente */
  function modalNovoCliente(aoCriar) {
    const m = B7.UI.modal(
      '<h3>Novo cliente</h3><div class="sub">Só o nome já basta. O resto você preenche depois.</div>' +
      '<div class="mb"><label class="rot">NOME</label>' +
      '<input class="campo" id="nc-nome" data-foco placeholder="Ex: Mercato Sadia"></div>' +
      '<div class="mb"><label class="rot">OBSERVAÇÕES (opcional)</label>' +
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

  /* ---------------------------------------------------- nova diária */
  async function modalNovaDiaria(clienteId) {
    let clientes = [];
    try { clientes = await B7.DB.listarClientes(); } catch (e) { return B7.UI.toast('Erro ao carregar clientes', { tipo: 'erro' }); }

    const opcoes = clientes.map(c =>
      '<option value="' + esc(c.id) + '"' + (c.id === clienteId ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('');

    const m = B7.UI.modal(
      '<h3>Nova diária</h3><div class="sub">Três campos e já entramos no editor.</div>' +
      '<div class="mb"><label class="rot">CLIENTE</label>' +
        '<div class="linha"><select class="campo" id="nd-cliente">' +
        (clientes.length ? opcoes : '<option value="">— nenhum cliente ainda —</option>') +
        '</select><button class="b" id="nd-novo-cliente" style="flex:none">+ Novo</button></div></div>' +
      '<div class="linha mb"><div><label class="rot">DATA DA GRAVAÇÃO</label>' +
        '<input class="campo" id="nd-data" type="date" value="' + B7.UI.hojeISO() + '"></div>' +
        '<div><label class="rot">NOME DA DIÁRIA</label>' +
        '<input class="campo" id="nd-nome" data-foco placeholder="Ex: Produção Setembro"></div></div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok>Criar diária</button></div>');

    m.querySelector('#nd-novo-cliente').onclick = () => {
      modalNovoCliente(c => {
        const sel = m.querySelector('#nd-cliente');
        sel.innerHTML += '<option value="' + esc(c.id) + '" selected>' + esc(c.nome) + '</option>';
        sel.value = c.id;
      });
    };

    const criar = async () => {
      const sel = m.querySelector('#nd-cliente');
      if (!sel.value) { B7.UI.toast('Crie um cliente primeiro', { tipo: 'erro' }); return; }
      const nome = m.querySelector('#nd-nome').value.trim();
      const data = m.querySelector('#nd-data').value;
      try {
        const d = await B7.Save.acao(() => B7.DB.criarDiaria({
          client_id: sel.value,
          nome: nome || ('Diária de ' + B7.UI.dataBR(data)),
          data_gravacao: data || null,
          status: 'Rascunho'
        }), 'Diária criada');
        m.fechar();
        location.hash = '#/diaria/' + d.id;
      } catch (e) { /* toast já mostrado */ }
    };
    m.querySelector('[data-ok]').onclick = criar;
    m.querySelector('#nd-nome').onkeydown = e => { if (e.key === 'Enter') criar(); };
  }

  /* ------------------------------------------- duplicar / excluir diária */
  async function duplicarDiaria(id) {
    let d;
    try { d = await B7.DB.diaria(id); } catch (e) { return; }
    const clientes = await B7.DB.listarClientes();
    const m = B7.UI.modal(
      '<h3>Duplicar diária</h3><div class="sub">Copia roteiros e cenas para uma nova diária. ' +
      'Ajuste o que mudar:</div>' +
      '<div class="mb"><label class="rot">CLIENTE</label><select class="campo" id="dd-cliente">' +
      clientes.map(c => '<option value="' + esc(c.id) + '"' + (c.id === d.client_id ? ' selected' : '') + '>' +
        esc(c.nome) + '</option>').join('') + '</select></div>' +
      '<div class="linha mb"><div><label class="rot">DATA</label>' +
      '<input class="campo" id="dd-data" type="date" value="' + (d.data_gravacao || B7.UI.hojeISO()) + '"></div>' +
      '<div><label class="rot">NOME</label><input class="campo" id="dd-nome" data-foco value="' +
      esc(d.nome + ' (cópia)') + '"></div></div>' +
      '<div class="acoes"><button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok>Duplicar</button></div>');

    m.querySelector('[data-ok]').onclick = async () => {
      try {
        const nova = await B7.Save.acao(() => B7.DB.duplicarDiaria(id, {
          client_id: m.querySelector('#dd-cliente').value,
          nome: m.querySelector('#dd-nome').value.trim() || d.nome,
          data_gravacao: m.querySelector('#dd-data').value || null,
          local: d.local, responsavel: d.responsavel, videomaker: d.videomaker,
          observacoes: d.observacoes, status: 'Rascunho'
        }), 'Diária duplicada');
        m.fechar();
        location.hash = '#/diaria/' + nova.id;
      } catch (e) {}
    };
  }

  function excluirDiaria(id) {
    B7.UI.confirmar({
      titulo: 'Excluir diária?',
      texto: 'Isso apaga também todos os roteiros e cenas desta diária. Não dá para desfazer depois de fechar o aviso.',
      rotulo: 'Excluir', perigo: true,
      aoConfirmar: async () => {
        try {
          await B7.Save.acao(() => B7.DB.excluirDiaria(id), 'Diária excluída');
          B7.Rota.recarregar();
        } catch (e) {}
      }
    });
  }

  /* -------------------------------------------------------- busca */
  const buscar = B7.UI.debounce(async function (termo, caixa) {
    if (!termo.trim()) { caixa.classList.remove('aberto'); return; }
    try {
      const r = await B7.DB.buscar(termo);
      let html = '';
      if (r.clientes.length) {
        html += '<div class="grupo">CLIENTES</div>' + r.clientes.map(c =>
          '<div class="res" data-ir="#/cliente/' + esc(c.id) + '"><div class="mini">' +
          esc(B7.UI.iniciais(c.nome)) + '</div><div><b>' + esc(c.nome) + '</b><small>' +
          c.total_diarias + ' diária' + (c.total_diarias === 1 ? '' : 's') + ' · ' +
          c.total_roteiros + ' roteiro' + (c.total_roteiros === 1 ? '' : 's') + '</small></div></div>').join('');
      }
      if (r.diarias.length) {
        html += '<div class="grupo">DIÁRIAS</div>' + r.diarias.map(d =>
          '<div class="res" data-ir="#/diaria/' + esc(d.id) + '"><div class="mini">📅</div><div><b>' +
          esc(d.nome) + '</b><small>' + esc(d.cliente_nome) + ' · ' +
          (d.data_gravacao ? B7.UI.dataBR(d.data_gravacao) : 'sem data') + '</small></div></div>').join('');
      }
      if (r.roteiros.length) {
        html += '<div class="grupo">ROTEIROS</div>' + r.roteiros.map(t =>
          '<div class="res" data-ir="#/diaria/' + esc(t.recording_session_id) + '?roteiro=' + esc(t.id) +
          '"><div class="mini">▸</div><div><b>' + esc(t.titulo || 'Sem título') +
          '</b><small>abrir na diária</small></div></div>').join('');
      }
      caixa.innerHTML = html || '<div class="nada">Nada encontrado para “' + esc(termo) + '”</div>';
      caixa.classList.add('aberto');
      caixa.querySelectorAll('[data-ir]').forEach(el => el.onclick = () => {
        caixa.classList.remove('aberto');
        location.hash = el.dataset.ir;
      });
    } catch (e) { console.error(e); }
  }, 260);

  return { abrir, abrirCliente, modalNovaDiaria, modalNovoCliente, buscar, duplicarDiaria, excluirDiaria };
})();
