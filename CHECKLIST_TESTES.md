# Checklist de testes — Sistema de Roteiros B7

Os oito testes obrigatórios foram rodados de forma automatizada contra a
aplicação real (mesmo HTML/CSS/JS que está sendo entregue), com o banco
substituído por um Supabase simulado em memória — o mesmo contrato de chamadas,
sem depender de credenciais.

**Resultado da última execução: 8 de 8 passaram, sem erros de JavaScript.**

Isso valida a lógica da aplicação. O que só você pode validar, porque depende do
seu ambiente, está na seção final.

---

## Testes automatizados

| # | Teste | O que foi verificado | Resultado |
|---|---|---|---|
| 1 | **Autosave** | Digitar título e texto de cena → indicador mostra "Salvando…" e depois "Salvo ✓" → recarregar a página → o texto continua lá | ✅ |
| 2 | **Outro computador** | Criar cliente, gravação e roteiros num navegador; abrir o mesmo endereço em outro contexto → tudo aparece igual, sem login | ✅ |
| 3 | **Duplicação** | Duplicar roteiro → título, objetivo e as 3 cenas copiados, com ids novos e diferentes do original | ✅ |
| 4 | **Ordem** | Mover cena para baixo → recarregar → ordem mantida (`Narrativa, Gancho, CTA`) | ✅ |
| 5 | **Exclusão** | Excluir cena → some do banco → "Desfazer" restaura → excluir de novo e recarregar → não volta | ✅ |
| 6 | **Impressão** | Selecionar roteiros + página de abertura → gera 3 folhas A4 (abertura + 2 roteiros), interface não entra na impressão | ✅ |
| 7 | **Overflow** | Encher uma cena com 14 parágrafos → escala automática caiu para 74% e o conteúdo coube; sem alerta de estouro | ✅ |
| 8 | **Erro de internet** | Simular queda → indicador mostra "Sem conexão · 1 pendente" → digitar → fila local → voltar a conexão → fila esvazia e o texto chega ao banco | ✅ |

### Verificações extras que também passaram

- Sem credenciais no `config.js`, aparece a tela explicando o que configurar (não quebra).
- Dashboard vazio mostra empty state com botão de ação, não uma tela em branco.
- Nome da gravação é obrigatório; a data é opcional e nasce em branco.
- Sem data, a coluna de data some da folha A4 (`CLIENTE · GRAVAÇÃO · VÍDEO`); com data, ela aparece.
- Três clientes com gravações na mesma data convivem como registros independentes.
- Página do cliente lista as gravações sem agrupar por mês.
- Duplicar gravação copia roteiros e cenas e vem com a data em branco.
- `Ctrl+K` abre as ações rápidas, com filtro funcionando.
- Links antigos `#/diaria/<id>` redirecionam para `#/gravacao/<id>`.
- Criar gravação leva direto ao editor, já com um roteiro e três cenas.
- Erro de banco simulado → indicador mostra "Erro ao salvar"; clicar nele recupera e volta para "Salvo ✓".
- Busca global encontra cliente, gravação e roteiro.
- Exportar backup gera JSON com todas as tabelas.
- Prévia A4 renderiza gancho, narrativa, narração com sugestão de cenas, e CTA.

---

### Verificado depois do redesign visual (v2.0)

- Sidebar navega entre Dashboard, Clientes, Gravações e Roteiros recentes; recolher funciona e fica guardado.
- Dashboard monta hero, 4 métricas com dados reais, gravação em destaque, cards e clientes em grid.
- Filtros de clientes (Todos / Mais recentes / Com gravações / Sem gravações) e busca local funcionam.
- Ctrl+K abre a paleta, busca no banco e navega por teclado; Enter abre o resultado.
- Ficha A4 preservada, agora com o símbolo colorido no cabeçalho e o lockup branco na abertura.
- Data ausente continua sumindo por completo do dashboard, do cliente, do editor e da folha impressa.
- Autosave, duplicação, drag and drop, desfazer, impressão e backup seguem passando nos 8 testes.

### Verificado na entrega de logos de cliente

- Criar cliente com logo: prévia antes de salvar, arquivo no bucket, só a referência na tabela (nada de base64).
- Criar cliente sem logo: funciona normalmente e usa iniciais (ClimaPro → CP, Mercato Sadia → MS).
- Validação: arquivo acima de 2 MB e formato não suportado são recusados com toast, sem `alert()`.
- Editar cliente: renomear mantém o mesmo id, sem perder gravações; trocar logo apaga a antiga do bucket.
- Remover logo: volta para as iniciais e limpa a referência, sem excluir o cliente.
- Upload que falha: o modal não fecha, o aviso aparece e a logo anterior é preservada.
- Excluir cliente: a confirmação mostra quantas gravações e roteiros serão apagados e exige digitar o nome.
- Ficha A4: logo do cliente aparece discreta ao lado do nome; sem logo, o layout segue sem espaço vazio.

## O que testar você mesmo depois de publicar

Estes dependem do seu Supabase e da sua rede, então não dá para automatizar aqui.

1. **Banco real** — rodou o `supabase_setup.sql` sem erro? No Supabase, em
   **Table Editor**, aparecem as tabelas `clientes`, `gravacoes`, `roteiros` e
   `cenas`? Se você já tinha a tabela `gravacoes`, ela deve ter virado `gravacoes`
   com todos os registros preservados.

2. **Dois computadores de verdade** — crie no computador A: cliente
   `Mercato Sadia`, gravação `Conteúdos Setembro`, três roteiros. Feche. Abra no
   computador B pelo mesmo link. Tudo precisa estar lá. Se não estiver, o
   `config.js` dos dois provavelmente aponta para projetos diferentes.

3. **Impressão em papel** — imprima uma folha de verdade, com margens em
   "Nenhuma" e "Gráficos de plano de fundo" marcado. Confira se o gradiente do
   gancho saiu colorido e se nada encostou na borda.

4. **Celular** — abra no celular e confira as abas Editor / Prévia.

5. **Instalação como app** — no Chrome, instale pelo ícone na barra de endereços
   e veja se abre em janela própria com o ícone da B7.

6. **Logo de verdade** — suba a logo de um cliente real e confira no dashboard e
   numa folha impressa. Se a imagem não aparecer, quase sempre é o bucket
   `client-logos` que não foi criado: rode o `supabase_setup.sql` de novo.

7. **Queda de conexão real** — desligue o wi-fi, digite, ligue de novo. O
   indicador deve avisar e depois sincronizar sozinho.
