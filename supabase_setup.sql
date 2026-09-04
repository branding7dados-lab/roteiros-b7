-- =====================================================================
--  SISTEMA DE ROTEIROS B7 — criação do banco
--  Rode este arquivo inteiro no SQL Editor do Supabase (uma vez só).
--  Ele é idempotente: pode ser executado de novo sem quebrar nada.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. CLIENTES
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  observacoes text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint clientes_nome_nao_vazio check (length(btrim(nome)) > 0)
);

create unique index if not exists clientes_nome_unico
  on public.clientes (lower(btrim(nome)));

-- ---------------------------------------------------------------------
-- 2. DIÁRIAS
-- ---------------------------------------------------------------------
create table if not exists public.diarias (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clientes(id) on delete cascade,
  nome          text not null default 'Nova diária',
  data_gravacao date,
  local         text not null default '',
  responsavel   text not null default '',
  videomaker    text not null default '',
  observacoes   text not null default '',
  status        text not null default 'Rascunho',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint diarias_status_valido
    check (status in ('Rascunho', 'Pronto para gravar', 'Gravado'))
);

create index if not exists diarias_client_id_idx   on public.diarias (client_id);
create index if not exists diarias_updated_at_idx  on public.diarias (updated_at desc);
create index if not exists diarias_data_idx        on public.diarias (data_gravacao desc);

-- ---------------------------------------------------------------------
-- 3. ROTEIROS
-- ---------------------------------------------------------------------
create table if not exists public.roteiros (
  id                    uuid primary key default gen_random_uuid(),
  recording_session_id  uuid not null references public.diarias(id) on delete cascade,
  position              integer not null default 0,
  titulo                text not null default '',
  objetivo              text not null default '',
  observacao_gravacao   text not null default '',
  escala                numeric(4,2) not null default 1.00,
  escala_automatica     boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint roteiros_escala_valida check (escala >= 0.50 and escala <= 1.50)
);

create index if not exists roteiros_sessao_idx
  on public.roteiros (recording_session_id, position);
create index if not exists roteiros_titulo_idx
  on public.roteiros using gin (to_tsvector('portuguese', titulo));

-- ---------------------------------------------------------------------
-- 4. CENAS
-- ---------------------------------------------------------------------
create table if not exists public.cenas (
  id             uuid primary key default gen_random_uuid(),
  script_id      uuid not null references public.roteiros(id) on delete cascade,
  position       integer not null default 0,
  tipo           text not null default 'Narrativa',
  direcao        text not null default '',
  funcao         text not null default '',
  texto          text not null default '',
  sugestao_cenas text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cenas_tipo_valido
    check (tipo in ('Gancho', 'Narrativa', 'Narração', 'CTA'))
);

create index if not exists cenas_roteiro_idx on public.cenas (script_id, position);

-- ---------------------------------------------------------------------
-- 5. updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists clientes_updated_at on public.clientes;
create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.tocar_updated_at();

drop trigger if exists diarias_updated_at on public.diarias;
create trigger diarias_updated_at before update on public.diarias
  for each row execute function public.tocar_updated_at();

drop trigger if exists roteiros_updated_at on public.roteiros;
create trigger roteiros_updated_at before update on public.roteiros
  for each row execute function public.tocar_updated_at();

drop trigger if exists cenas_updated_at on public.cenas;
create trigger cenas_updated_at before update on public.cenas
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- 6. Propagação: mexeu no roteiro/cena, a diária conta como alterada
--    (é o que alimenta o "Continue de onde parou")
-- ---------------------------------------------------------------------
create or replace function public.tocar_diaria_do_roteiro()
returns trigger language plpgsql as $$
declare alvo uuid;
begin
  alvo := coalesce(new.recording_session_id, old.recording_session_id);
  update public.diarias set updated_at = now() where id = alvo;
  return coalesce(new, old);
end $$;

drop trigger if exists roteiros_tocam_diaria on public.roteiros;
create trigger roteiros_tocam_diaria after insert or update or delete on public.roteiros
  for each row execute function public.tocar_diaria_do_roteiro();

create or replace function public.tocar_diaria_da_cena()
returns trigger language plpgsql as $$
declare alvo uuid;
begin
  select recording_session_id into alvo from public.roteiros
   where id = coalesce(new.script_id, old.script_id);
  if alvo is not null then
    update public.diarias set updated_at = now() where id = alvo;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists cenas_tocam_diaria on public.cenas;
create trigger cenas_tocam_diaria after insert or update or delete on public.cenas
  for each row execute function public.tocar_diaria_da_cena();

-- ---------------------------------------------------------------------
-- 7. Visões de apoio (dashboard e lista de clientes)
-- ---------------------------------------------------------------------
drop view if exists public.diarias_resumo;
create view public.diarias_resumo
with (security_invoker = on) as
select
  d.id, d.client_id, d.nome, d.data_gravacao, d.status,
  d.local, d.responsavel, d.videomaker, d.observacoes,
  d.created_at, d.updated_at,
  c.nome as cliente_nome,
  (select count(*) from public.roteiros r where r.recording_session_id = d.id) as total_roteiros
from public.diarias d
join public.clientes c on c.id = d.client_id;

drop view if exists public.clientes_resumo;
create view public.clientes_resumo
with (security_invoker = on) as
select
  c.id, c.nome, c.observacoes, c.created_at, c.updated_at,
  (select count(*) from public.diarias d where d.client_id = c.id) as total_diarias,
  (select count(*) from public.roteiros r
     join public.diarias d2 on d2.id = r.recording_session_id
    where d2.client_id = c.id) as total_roteiros,
  greatest(c.updated_at,
           coalesce((select max(d3.updated_at) from public.diarias d3 where d3.client_id = c.id),
                    c.updated_at)) as ultima_atividade
from public.clientes c;

-- ---------------------------------------------------------------------
-- 8. ACESSO
--
--    Este sistema roda SEM login, por decisão do projeto. O frontend usa
--    a chave pública (anon / publishable), então o papel "anon" precisa
--    conseguir ler e escrever nestas tabelas.
--
--    Consequência, dita com todas as letras: quem tiver o endereço do
--    site e a chave pública consegue ler e alterar estes dados. Não há
--    isolamento por usuário. Isso é aceitável para uma ferramenta interna
--    de roteiros; não coloque aqui nada sigiloso.
--
--    Se um dia quiser fechar o acesso, o caminho é ativar o Auth do
--    Supabase e trocar o "using (true)" por uma regra baseada em
--    auth.uid(). A estrutura das tabelas não muda.
-- ---------------------------------------------------------------------
alter table public.clientes enable row level security;
alter table public.diarias  enable row level security;
alter table public.roteiros enable row level security;
alter table public.cenas    enable row level security;

drop policy if exists acesso_interno_clientes on public.clientes;
create policy acesso_interno_clientes on public.clientes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists acesso_interno_diarias on public.diarias;
create policy acesso_interno_diarias on public.diarias
  for all to anon, authenticated using (true) with check (true);

drop policy if exists acesso_interno_roteiros on public.roteiros;
create policy acesso_interno_roteiros on public.roteiros
  for all to anon, authenticated using (true) with check (true);

drop policy if exists acesso_interno_cenas on public.cenas;
create policy acesso_interno_cenas on public.cenas
  for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.clientes, public.diarias, public.roteiros, public.cenas
  to anon, authenticated;
grant select on public.diarias_resumo, public.clientes_resumo to anon, authenticated;

-- =====================================================================
--  Fim. Se rodou sem erro, o banco está pronto.
-- =====================================================================
