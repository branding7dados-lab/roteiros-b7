/* =====================================================================
   ACESSO AO BANCO
   Todo SQL/consulta do sistema passa por aqui. Nenhum outro arquivo fala
   direto com o Supabase — assim, mudar o banco significa mexer só neste.
   Toda função devolve dados ou lança erro; quem chama decide o que fazer.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.DB = (function () {
  const sb = () => {
    if (!B7.sb) throw new Error('Supabase não configurado');
    return B7.sb;
  };
  const ok = ({ data, error }) => { if (error) throw error; return data; };

  /* Se o banco não responder, é melhor falhar com aviso do que deixar a
     tela girando para sempre (URL errada, rede da empresa bloqueando etc). */
  const LIMITE = 20000;
  function comLimite(promessa) {
    return Promise.race([
      promessa,
      new Promise((_, rej) => setTimeout(
        () => rej(new Error('O banco não respondeu. Confira a conexão e os dados em js/config.js.')), LIMITE))
    ]);
  }

  const api = {
    /* ---------------------------------------------------- CLIENTES */
    async listarClientes() {
      return ok(await sb().from('clientes_resumo').select('*').order('nome'));
    },
    async cliente(id) {
      return ok(await sb().from('clientes_resumo').select('*').eq('id', id).single());
    },
    async criarCliente(nome, observacoes = '') {
      const linhas = ok(await sb().from('clientes')
        .insert([{ nome: nome.trim(), observacoes }]).select());
      return linhas[0];
    },
    async atualizarCliente(id, patch) {
      return ok(await sb().from('clientes').update(patch).eq('id', id).select());
    },
    async excluirCliente(id) {
      return ok(await sb().from('clientes').delete().eq('id', id));
    },

    /* --------------------------------------------------- GRAVAÇÕES */
    async listarGravacoes(clienteId) {
      let q = sb().from('gravacoes_resumo').select('*');
      if (clienteId) q = q.eq('client_id', clienteId);
      return ok(await q.order('updated_at', { ascending: false }));
    },
    async gravacoesRecentes(limite = 6) {
      return ok(await sb().from('gravacoes_resumo').select('*')
        .order('updated_at', { ascending: false }).limit(limite));
    },
    async gravacao(id) {
      return ok(await sb().from('gravacoes_resumo').select('*').eq('id', id).single());
    },
    async criarGravacao(dados) {
      const linhas = ok(await sb().from('gravacoes').insert([dados]).select());
      return linhas[0];
    },
    async atualizarGravacao(id, patch) {
      return ok(await sb().from('gravacoes').update(patch).eq('id', id).select());
    },
    async excluirGravacao(id) {
      return ok(await sb().from('gravacoes').delete().eq('id', id));
    },

    /* ---------------------------------------------------- ROTEIROS */
    async listarRoteiros(gravacaoId) {
      return ok(await sb().from('roteiros').select('*')
        .eq('recording_session_id', gravacaoId).order('position'));
    },
    async criarRoteiro(dados) {
      const linhas = ok(await sb().from('roteiros').insert([dados]).select());
      return linhas[0];
    },
    async atualizarRoteiro(id, patch) {
      return ok(await sb().from('roteiros').update(patch).eq('id', id).select());
    },
    async excluirRoteiro(id) {
      return ok(await sb().from('roteiros').delete().eq('id', id));
    },
    async reordenarRoteiros(lista) {   // [{id, position}, ...]
      for (const r of lista) {
        ok(await sb().from('roteiros').update({ position: r.position }).eq('id', r.id));
      }
    },

    /* ------------------------------------------------------- CENAS */
    async listarCenasDaGravacao(roteiroIds) {
      if (!roteiroIds.length) return [];
      return ok(await sb().from('cenas').select('*').in('script_id', roteiroIds).order('position'));
    },
    async listarCenas(roteiroId) {
      return ok(await sb().from('cenas').select('*').eq('script_id', roteiroId).order('position'));
    },
    async criarCena(dados) {
      const linhas = ok(await sb().from('cenas').insert([dados]).select());
      return linhas[0];
    },
    async criarCenas(lista) {
      if (!lista.length) return [];
      return ok(await sb().from('cenas').insert(lista).select());
    },
    async atualizarCena(id, patch) {
      return ok(await sb().from('cenas').update(patch).eq('id', id).select());
    },
    async excluirCena(id) {
      return ok(await sb().from('cenas').delete().eq('id', id));
    },
    async reordenarCenas(lista) {
      for (const c of lista) {
        ok(await sb().from('cenas').update({ position: c.position }).eq('id', c.id));
      }
    },

    /* Restaura um registro apagado mantendo o mesmo id (usado no Desfazer) */
    async restaurar(tabela, registro) {
      const linhas = ok(await sb().from(tabela).insert([registro]).select());
      return linhas[0];
    },

    /* ---------------------------------------------------- DUPLICAR */
    async duplicarRoteiro(roteiro, novaPosicao) {
      const cenas = await this.listarCenas(roteiro.id);
      const copia = await this.criarRoteiro({
        recording_session_id: roteiro.recording_session_id,
        position: novaPosicao,
        titulo: roteiro.titulo,
        objetivo: roteiro.objetivo,
        observacao_gravacao: roteiro.observacao_gravacao,
        escala: roteiro.escala,
        escala_automatica: roteiro.escala_automatica
      });
      if (cenas.length) {
        await this.criarCenas(cenas.map((c, i) => ({
          script_id: copia.id, position: i, tipo: c.tipo, direcao: c.direcao,
          funcao: c.funcao, texto: c.texto, sugestao_cenas: c.sugestao_cenas
        })));
      }
      return copia;
    },

    async duplicarGravacao(gravacaoId, dados) {
      const nova = await this.criarGravacao(dados);
      const roteiros = await this.listarRoteiros(gravacaoId);
      for (let i = 0; i < roteiros.length; i++) {
        const r = roteiros[i];
        const copia = await this.criarRoteiro({
          recording_session_id: nova.id, position: i,
          titulo: r.titulo, objetivo: r.objetivo,
          observacao_gravacao: r.observacao_gravacao,
          escala: r.escala, escala_automatica: r.escala_automatica
        });
        const cenas = await this.listarCenas(r.id);
        if (cenas.length) {
          await this.criarCenas(cenas.map((c, j) => ({
            script_id: copia.id, position: j, tipo: c.tipo, direcao: c.direcao,
            funcao: c.funcao, texto: c.texto, sugestao_cenas: c.sugestao_cenas
          })));
        }
      }
      return nova;
    },

    /* ------------------------------------------------------- BUSCA */
    async buscar(termo) {
      const t = `%${termo.trim()}%`;
      const [clientes, gravacoes, roteiros] = await Promise.all([
        sb().from('clientes_resumo').select('*').ilike('nome', t).limit(6),
        sb().from('gravacoes_resumo').select('*').ilike('nome', t).limit(8),
        sb().from('roteiros').select('id,titulo,recording_session_id').ilike('titulo', t).limit(8)
      ]);
      return {
        clientes: clientes.data || [],
        gravacoes: gravacoes.data || [],
        roteiros: roteiros.data || []
      };
    },

    /* ------------------------------------------------------ RESUMO */
    async resumo() {
      const conta = async (tabela, filtro) => {
        let q = sb().from(tabela).select('id', { count: 'exact', head: true });
        if (filtro) q = filtro(q);
        const { count, error } = await q;
        if (error) throw error;
        return count || 0;
      };
      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const [clientes, gravacoes, roteiros, mes] = await Promise.all([
        conta('clientes'), conta('gravacoes'), conta('roteiros'),
        conta('roteiros', q => q.gte('created_at', inicioMes.toISOString()))
      ]);
      return { clientes, gravacoes, roteiros, mes };
    },

    /* ------------------------------------------------------ BACKUP */
    async exportarTudo() {
      const [clientes, gravacoes, roteiros, cenas] = await Promise.all([
        sb().from('clientes').select('*'),
        sb().from('gravacoes').select('*'),
        sb().from('roteiros').select('*'),
        sb().from('cenas').select('*')
      ]);
      for (const r of [clientes, gravacoes, roteiros, cenas]) if (r.error) throw r.error;
      return {
        formato: 'roteiros-b7-backup', versao: 1, gerado_em: new Date().toISOString(),
        clientes: clientes.data, gravacoes: gravacoes.data,
        roteiros: roteiros.data, cenas: cenas.data
      };
    },

    /* Importa sem apagar nada: mantém os ids do arquivo e ignora o que
       já existir (upsert por id). Serve para restaurar um backup. */
    async importarTudo(pacote) {
      const passo = async (tabela, linhas) => {
        if (!linhas || !linhas.length) return 0;
        const { error } = await sb().from(tabela).upsert(linhas, { onConflict: 'id' });
        if (error) throw error;
        return linhas.length;
      };
      const c = await passo('clientes', pacote.clientes);
      const d = await passo('gravacoes', pacote.gravacoes || pacote.diarias);  // aceita backup da versão anterior
      const r = await passo('roteiros', pacote.roteiros);
      const e = await passo('cenas', pacote.cenas);
      return { clientes: c, gravacoes: d, roteiros: r, cenas: e };
    }
  };

  /* Todo método ganha o limite de tempo, sem precisar lembrar disso em
     cada chamada. */
  const envolvido = {};
  Object.keys(api).forEach(nome => {
    envolvido[nome] = function (...args) {
      const r = api[nome].apply(envolvido, args);
      return (r && typeof r.then === 'function') ? comLimite(r) : r;
    };
  });
  return envolvido;
})();
