-- Atualização CRM / Serviços / OS / Fidelização / Eventos
-- Execute no SQL Editor do Supabase antes de testar o front atualizado.

-- 1) Serviços sem valor operacional.
-- Mantém a coluna valor para compatibilidade com o schema atual, mas o front passa a gravar sempre 0.
alter table public.servicos
  alter column valor set default 0;

update public.servicos
set valor = 0
where valor is distinct from 0;

-- 2) Cliente: data de nascimento usada em eventos/aniversários.
alter table public.clientes
  add column if not exists nascimento date null;

-- 3) Veículo: informação de seguro.
alter table public.veiculos
  add column if not exists tem_seguro boolean not null default false;

-- Snapshot da informação de seguro dentro da OS para impressão/histórico.
alter table public.ordens_de_servico
  add column if not exists veiculo_tem_seguro boolean not null default false;

-- 4) Diagnósticos da OS: itens encontrados e não autorizados pelo cliente.
create table if not exists public.ordem_diagnosticos (
  id uuid not null default gen_random_uuid(),
  os_id uuid not null,
  descricao text not null,
  criado_em timestamp with time zone not null default now(),
  constraint ordem_diagnosticos_pkey primary key (id),
  constraint ordem_diagnosticos_os_id_fkey foreign key (os_id) references public.ordens_de_servico (id) on delete cascade
) tablespace pg_default;

create index if not exists idx_ordem_diagnosticos_os
  on public.ordem_diagnosticos using btree (os_id) tablespace pg_default;

-- 5) Eventos e participantes.
create table if not exists public.eventos (
  id uuid not null default gen_random_uuid(),
  titulo text not null,
  descricao text null,
  data_evento date not null,
  filtro_tipo text not null default 'todos',
  filtro_inicio date null,
  filtro_fim date null,
  ganhador_cliente_id uuid null,
  criado_em timestamp with time zone not null default now(),
  atualizado_em timestamp with time zone not null default now(),
  constraint eventos_pkey primary key (id),
  constraint eventos_ganhador_cliente_id_fkey foreign key (ganhador_cliente_id) references public.clientes (id) on delete set null,
  constraint eventos_filtro_tipo_check check (filtro_tipo in ('todos', 'aniversario', 'manutencao_periodo'))
) tablespace pg_default;

create index if not exists idx_eventos_data
  on public.eventos using btree (data_evento) tablespace pg_default;

create table if not exists public.evento_clientes (
  id uuid not null default gen_random_uuid(),
  evento_id uuid not null,
  cliente_id uuid not null,
  criado_em timestamp with time zone not null default now(),
  constraint evento_clientes_pkey primary key (id),
  constraint evento_clientes_evento_id_fkey foreign key (evento_id) references public.eventos (id) on delete cascade,
  constraint evento_clientes_cliente_id_fkey foreign key (cliente_id) references public.clientes (id) on delete cascade,
  constraint evento_clientes_unique unique (evento_id, cliente_id)
) tablespace pg_default;

create index if not exists idx_evento_clientes_evento
  on public.evento_clientes using btree (evento_id) tablespace pg_default;

create index if not exists idx_evento_clientes_cliente
  on public.evento_clientes using btree (cliente_id) tablespace pg_default;

-- 6) RLS permissiva para usuário autenticado, alinhada ao padrão simples do projeto atual.
-- Se futuramente houver multiempresa/tenant, substitua estas policies por policies com id_account/id_user.
alter table public.ordem_diagnosticos enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_clientes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ordem_diagnosticos' and policyname = 'ordem_diagnosticos_all_authenticated') then
    create policy ordem_diagnosticos_all_authenticated
      on public.ordem_diagnosticos
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'eventos' and policyname = 'eventos_all_authenticated') then
    create policy eventos_all_authenticated
      on public.eventos
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'evento_clientes' and policyname = 'evento_clientes_all_authenticated') then
    create policy evento_clientes_all_authenticated
      on public.evento_clientes
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
