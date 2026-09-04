/* =====================================================================
   FICHA A4 + IMPRESSÃO
   Este arquivo desenha a folha (usada tanto na prévia quanto na
   impressão), faz o ajuste automático de escala e monta a seleção de
   roteiros para imprimir.
   O texto do roteiro é impresso exatamente como foi digitado: aqui só se
   quebra em parágrafos nas quebras de linha que a pessoa escreveu.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.Folha = (function () {
  const esc = B7.UI.esc;
  const MARCA = 'assets/logo/b7-mark.png';
  const LOGO = 'assets/logo/b7-logo.png';

  const paragrafos = txt => {
    const ls = String(txt || '').split('\n').map(s => s.trim()).filter(Boolean);
    return (ls.length ? ls : ['']).map(p => '<p>' + esc(p) + '</p>').join('');
  };
  const vazio = t => !String(t || '').trim();

  const CLASSE = {
    'Gancho': 'bl-gancho', 'Narrativa': 'bl-narrativa',
    'Narração': 'bl-narracao', 'CTA': 'bl-cta'
  };

  function cenaHTML(cena, indice) {
    const tipo = cena.tipo || 'Narrativa';
    const etiqueta = (cena.funcao && cena.funcao.trim()) ? cena.funcao.trim().toUpperCase() : tipo.toUpperCase();
    let corpo;
    if (tipo === 'Gancho') {
      corpo = '<div class="bl-gancho"><div class="aspas">&ldquo;</div>' +
              '<div class="txt">' + paragrafos(cena.texto) + '</div></div>';
    } else if (tipo === 'CTA') {
      corpo = '<div class="bl-cta">' + paragrafos(cena.texto) + '</div>';
    } else if (tipo === 'Narração') {
      corpo = '<div class="bl-narracao">' + paragrafos(cena.texto) + '</div>' +
              '<div class="sug"><b>SUGESTÃO DE CENAS</b><div class="sug-txt">' +
              paragrafos(cena.sugestao_cenas) + '</div></div>';
    } else {
      corpo = '<div class="bl-narrativa">' + paragrafos(cena.texto) + '</div>';
    }
    return '<div class="cena-bloco"><div class="cena-cabeca">' +
      '<div class="cena-num">CENA ' + (indice + 1) + '</div>' +
      '<div class="cena-dir">' + esc(cena.direcao || '') + '</div>' +
      '<div class="cena-linha"></div>' +
      '<div class="etiqueta e-' + esc(tipo) + '">' + esc(etiqueta) + '</div>' +
      '</div>' + corpo + '</div>';
  }

  /* ctx = { cliente, dataGravacao, roteiro, cenas, indice, total } */
  function folhaHTML(ctx) {
    const r = ctx.roteiro;
    const cenas = ctx.cenas.map((c, i) => cenaHTML(c, i)).join('<div class="esp"></div>');
    const num = String(ctx.indice + 1).padStart(2, '0');
    return '<div class="folha" data-roteiro="' + esc(r.id) + '" style="--fs:' + (r.escala || 1) + '">' +
      '<div class="faixa-topo"></div>' +
      '<div class="folha-cabeca"><div class="esq"><img src="' + MARCA + '" alt="">' +
        '<span>B7 &nbsp;/&nbsp; BRANDING7</span></div>' +
        '<div class="dir">ROTEIROS DE GRAVAÇÃO</div></div>' +
      '<div class="proj">' +
        '<div class="cel"><b>CLIENTE / PROJETO</b><span class="' + (ctx.cliente ? '' : 'fraco') + '">' +
          esc(ctx.cliente || 'Cliente / projeto') + '</span></div>' +
        '<div class="cel"><b>DATA DA GRAVAÇÃO</b><span class="' + (ctx.dataGravacao ? '' : 'fraco') + '">' +
          esc(ctx.dataGravacao || '00/00/0000') + '</span></div>' +
        '<div class="cel fim"><b>VÍDEO</b><span>' + num + ' / ' + String(ctx.total).padStart(2, '0') + '</span></div>' +
      '</div>' +
      '<div class="titulo-bloco"><div class="numero">' + num + '</div><div class="titulo-dir">' +
        '<div class="kicker"><i></i>ROTEIRO ' + num + ' &nbsp;·&nbsp; ' + ctx.cenas.length +
          ' CENA' + (ctx.cenas.length === 1 ? '' : 'S') + '</div>' +
        '<h2 class="' + (vazio(r.titulo) ? 'fraco' : '') + '">' + esc(r.titulo || 'Título do roteiro') + '</h2>' +
        '<div class="risco-titulo"></div>' +
        (vazio(r.objetivo) ? '' : '<div class="obj"><b>OBJETIVO</b><div class="obj-txt">' + esc(r.objetivo) + '</div></div>') +
        (vazio(r.observacao_gravacao) ? '' : '<div class="nota-grav"><b>NA GRAVAÇÃO</b><div class="obj-txt">' +
          esc(r.observacao_gravacao) + '</div></div>') +
      '</div></div>' +
      '<div class="folha-corpo"><div class="esp"></div>' + cenas + '<div class="esp fim"></div></div>' +
      '<div class="takes"><div class="tk"><span class="bx"></span>TAKE 01</div>' +
        '<div class="tk"><span class="bx"></span>TAKE 02</div>' +
        '<div class="tk"><span class="bx"></span>TAKE 03</div><div class="sp"></div>' +
        '<div class="tk"><span class="bx"></span>APROVADO</div></div>' +
      '<div class="folha-pe"><div class="esq">B7 / BRANDING7 &nbsp;·&nbsp; ROTEIROS DE GRAVAÇÃO</div>' +
        '<div class="dir">' + num + '</div></div>' +
      '<div class="aviso-overflow">PASSOU DA PÁGINA — REDUZA A FONTE (A−) OU TIRE UMA CENA</div>' +
    '</div>';
  }

  function aberturaHTML(ctx) {
    const itens = ctx.roteiros.map((r, i) =>
      '<div class="it"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' +
      esc(r.titulo || 'Sem título') + '</span></div>').join('');
    return '<div class="folha abertura">' +
      '<div class="brilho"></div>' +
      '<img class="marca" src="' + LOGO + '" alt="B7">' +
      '<div class="miolo">' +
        '<div class="olho"><i></i>PRODUÇÃO DE CONTEÚDO</div>' +
        '<h1>Roteiros<br>de Gravação</h1>' +
        '<div class="dados">' +
          '<div class="cel"><b>CLIENTE</b><span>' + esc(ctx.cliente || '—') + '</span></div>' +
          '<div class="cel"><b>DATA</b><span>' + esc(ctx.dataGravacao || '—') + '</span></div>' +
          '<div class="cel"><b>DIÁRIA</b><span>' + esc(ctx.diaria || '—') + '</span></div>' +
        '</div>' +
        '<div class="indice"><div class="rot">ROTEIROS DESTA DIÁRIA</div>' + itens + '</div>' +
      '</div></div>';
  }

  /* ------------------------------------------------- ajuste de escala */
  function estourou(folha) {
    return folha.scrollHeight > folha.clientHeight + 2 || folha.scrollWidth > folha.clientWidth + 2;
  }
  /* Reduz só o necessário. No automático nunca passa de 100%. */
  function ajustar(folha) {
    let e = 1;
    folha.style.setProperty('--fs', e);
    while (estourou(folha) && e > 0.58) {
      e = +(e - 0.01).toFixed(2);
      folha.style.setProperty('--fs', e);
    }
    return e;
  }
  function marcarOverflow(folha) {
    folha.classList.toggle('estourou', estourou(folha));
  }

  return { folhaHTML, aberturaHTML, ajustar, estourou, marcarOverflow };
})();


B7.Impressao = (function () {
  const esc = B7.UI.esc;

  /* ctx = { cliente, dataGravacao, diaria, roteiros:[], cenasPorRoteiro:{} } */
  function abrirSelecao(ctx) {
    const incluirAbertura = B7.pref.ler('abertura', false);
    const linhas = ctx.roteiros.map((r, i) =>
      '<label class="opc-roteiro"><input type="checkbox" checked data-id="' + esc(r.id) + '">' +
      '<b>' + String(i + 1).padStart(2, '0') + '</b><span>' + esc(r.titulo || 'Sem título') + '</span></label>'
    ).join('');

    const m = B7.UI.modal(
      '<h3>Imprimir roteiros</h3>' +
      '<div class="sub">Cada roteiro sai em uma folha A4. Nas opções da impressão do Chrome, ' +
      'deixe as margens em <b>Nenhuma</b> e marque <b>Gráficos de plano de fundo</b>.</div>' +
      '<div class="corpo"><div class="lista-opc">' + linhas + '</div>' +
      '<label class="opc-linha"><input type="checkbox" id="op-abertura"' + (incluirAbertura ? ' checked' : '') + '>' +
      '<span>Incluir página de abertura <small>(cliente, data, diária e lista de roteiros)</small></span></label></div>' +
      '<div class="acoes"><button class="b" data-todos>Marcar todos</button>' +
      '<button class="b" data-fecha>Cancelar</button>' +
      '<button class="b pri" data-ok data-foco>Gerar impressão</button></div>', { larga: true });

    m.querySelector('[data-todos]').onclick = () => {
      const caixas = [...m.querySelectorAll('.lista-opc input')];
      const marcar = caixas.some(c => !c.checked);
      caixas.forEach(c => c.checked = marcar);
    };
    m.querySelector('[data-ok]').onclick = () => {
      const ids = [...m.querySelectorAll('.lista-opc input:checked')].map(c => c.dataset.id);
      if (!ids.length) { B7.UI.toast('Selecione pelo menos um roteiro', { tipo: 'erro' }); return; }
      const abertura = m.querySelector('#op-abertura').checked;
      B7.pref.gravar('abertura', abertura);
      m.fechar();
      imprimir(ctx, ids, abertura);
    };
  }

  function imprimir(ctx, ids, comAbertura) {
    const area = document.getElementById('area-impressao');
    const selecionados = ctx.roteiros.filter(r => ids.includes(r.id));
    let html = '';
    if (comAbertura) {
      html += B7.Folha.aberturaHTML({
        cliente: ctx.cliente, dataGravacao: ctx.dataGravacao,
        diaria: ctx.diaria, roteiros: selecionados
      });
    }
    selecionados.forEach((r, i) => {
      html += B7.Folha.folhaHTML({
        cliente: ctx.cliente, dataGravacao: ctx.dataGravacao,
        roteiro: r, cenas: ctx.cenasPorRoteiro[r.id] || [],
        indice: ctx.roteiros.indexOf(r), total: ctx.roteiros.length
      });
    });
    area.innerHTML = html;

    /* mede com a área visível para o ajuste automático funcionar */
    area.style.display = 'block';
    area.querySelectorAll('.folha:not(.abertura)').forEach(f => {
      const id = f.dataset.roteiro;
      const r = selecionados.find(x => x.id === id);
      if (r && r.escala_automatica !== false) B7.Folha.ajustar(f);
      else f.style.setProperty('--fs', r ? (r.escala || 1) : 1);
    });
    area.style.display = '';

    setTimeout(() => {
      window.print();
      setTimeout(() => { area.innerHTML = ''; }, 800);
    }, 120);
  }

  return { abrirSelecao, imprimir };
})();
