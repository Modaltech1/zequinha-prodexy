create table public.clientes (
  id uuid not null default gen_random_uuid (),
  nome text not null,
  cpf_cnpj text null,
  telefone text null,
  email text null,
  criado_por uuid null,
  criado_em timestamp with time zone null default now(),
  constraint clientes_pkey primary key (id)
) TABLESPACE pg_default;

create table public.ordem_fotos (
  id uuid not null default gen_random_uuid (),
  os_id uuid not null,
  foto_url text not null,
  criado_em timestamp with time zone null default now(),
  constraint ordem_fotos_pkey primary key (id),
  constraint ordem_fotos_os_id_fkey foreign KEY (os_id) references ordens_de_servico (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_ordem_fotos_os on public.ordem_fotos using btree (os_id) TABLESPACE pg_default;

create table public.ordem_servicos (
  id uuid not null default gen_random_uuid (),
  os_id uuid not null,
  servico_id uuid not null,
  valor numeric(12, 2) not null default 0,
  constraint ordem_servicos_pkey primary key (id),
  constraint ordem_servicos_os_id_fkey foreign KEY (os_id) references ordens_de_servico (id) on delete CASCADE,
  constraint ordem_servicos_servico_id_fkey foreign KEY (servico_id) references servicos (id) on delete RESTRICT
) TABLESPACE pg_default;

create index IF not exists idx_ordem_servicos_os on public.ordem_servicos using btree (os_id) TABLESPACE pg_default;

create table public.ordens_de_servico (
  id uuid not null default gen_random_uuid (),
  numero text null,
  cliente_id uuid null,
  veiculo_placa text null,
  veiculo_marca text null,
  veiculo_modelo text null,
  veiculo_ano text null,
  veiculo_cor text null,
  valor_total numeric(12, 2) null default 0,
  valor_final numeric(12, 2) null default 0,
  status text null default 'em_andamento'::text,
  observacoes text null,
  criado_por uuid null,
  criado_em timestamp with time zone null default now(),
  atualizado_em timestamp with time zone null default now(),
  constraint ordens_de_servico_pkey primary key (id),
  constraint ordens_de_servico_cliente_id_fkey foreign KEY (cliente_id) references clientes (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_os_cliente on public.ordens_de_servico using btree (cliente_id) TABLESPACE pg_default;

create index IF not exists idx_os_status on public.ordens_de_servico using btree (status) TABLESPACE pg_default;

create index IF not exists idx_os_criado_em on public.ordens_de_servico using btree (criado_em) TABLESPACE pg_default;

create table public.perfis (
  id uuid not null,
  nome text not null,
  papel text not null,
  username text null,
  ativo boolean not null default true,
  criado_em timestamp with time zone not null default now(),
  email text null,
  constraint perfis_pkey primary key (id),
  constraint perfis_email_key unique (email),
  constraint perfis_username_key unique (username),
  constraint perfis_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint perfis_papel_check check (
    (
      papel = any (
        array[
          'admin'::text,
          'colaborador'::text,
          'professora'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create table public.servicos (
  id uuid not null default gen_random_uuid (),
  nome text not null,
  valor numeric(12, 2) not null default 0,
  constraint servicos_pkey primary key (id)
) TABLESPACE pg_default;

create table if not exists public.veiculos (
  id uuid not null default gen_random_uuid (),
  cliente_id uuid not null,
  placa text not null,
  marca text null,
  modelo text null,
  ano text null,
  cor text null,
  km_atual integer null,
  observacoes text null,
  criado_em timestamp with time zone not null default now(),
  atualizado_em timestamp with time zone not null default now(),
  constraint veiculos_pkey primary key (id),
  constraint veiculos_cliente_id_fkey foreign KEY (cliente_id) references clientes (id) on delete CASCADE,
  constraint veiculos_placa_unique unique (placa)
) TABLESPACE pg_default;

create index IF not exists idx_veiculos_cliente on public.veiculos using btree (cliente_id) TABLESPACE pg_default;

create index IF not exists idx_veiculos_placa on public.veiculos using btree (placa) TABLESPACE pg_default;

alter table public.ordens_de_servico
add column if not exists veiculo_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordens_de_servico_veiculo_id_fkey'
  ) then
    alter table public.ordens_de_servico
      add constraint ordens_de_servico_veiculo_id_fkey
      foreign key (veiculo_id) references public.veiculos (id) on delete set null;
  end if;
end $$;

create index IF not exists idx_os_veiculo on public.ordens_de_servico using btree (veiculo_id) TABLESPACE pg_default;

create table if not exists public.manutencoes_veiculo (
  id uuid not null default gen_random_uuid (),
  veiculo_id uuid not null,
  tipo text not null,
  descricao text null,
  periodicidade_meses integer null,
  periodicidade_km integer null,
  ultima_data date null,
  ultima_km integer null,
  proxima_data date null,
  proxima_km integer null,
  status text not null default 'pendente'::text,
  ultima_os_id uuid null,
  criado_em timestamp with time zone not null default now(),
  atualizado_em timestamp with time zone not null default now(),
  constraint manutencoes_veiculo_pkey primary key (id),
  constraint manutencoes_veiculo_veiculo_id_fkey foreign KEY (veiculo_id) references veiculos (id) on delete CASCADE,
  constraint manutencoes_veiculo_ultima_os_id_fkey foreign KEY (ultima_os_id) references ordens_de_servico (id) on delete set null,
  constraint manutencoes_veiculo_proxima_data_check check (
    (proxima_data is not null)
  )
) TABLESPACE pg_default;

create index IF not exists idx_manutencoes_veiculo_veiculo on public.manutencoes_veiculo using btree (veiculo_id) TABLESPACE pg_default;

create index IF not exists idx_manutencoes_veiculo_data_status on public.manutencoes_veiculo using btree (proxima_data, status) TABLESPACE pg_default;

create index IF not exists idx_manutencoes_veiculo_km_status on public.manutencoes_veiculo using btree (proxima_km, status) TABLESPACE pg_default;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'manutencoes_veiculo_periodicidade_check'
  ) then
    alter table public.manutencoes_veiculo
      drop constraint manutencoes_veiculo_periodicidade_check;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manutencoes_veiculo_proxima_data_check'
  ) then
    alter table public.manutencoes_veiculo
      add constraint manutencoes_veiculo_proxima_data_check
      check ((proxima_data is not null));
  end if;
end $$;

alter table public.veiculos enable row level security;
alter table public.manutencoes_veiculo enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'veiculos'
      and policyname = 'veiculos_select_authenticated'
  ) then
    create policy veiculos_select_authenticated
      on public.veiculos
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'veiculos'
      and policyname = 'veiculos_insert_authenticated'
  ) then
    create policy veiculos_insert_authenticated
      on public.veiculos
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'veiculos'
      and policyname = 'veiculos_update_authenticated'
  ) then
    create policy veiculos_update_authenticated
      on public.veiculos
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'veiculos'
      and policyname = 'veiculos_delete_authenticated'
  ) then
    create policy veiculos_delete_authenticated
      on public.veiculos
      for delete
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'manutencoes_veiculo'
      and policyname = 'manutencoes_veiculo_select_authenticated'
  ) then
    create policy manutencoes_veiculo_select_authenticated
      on public.manutencoes_veiculo
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'manutencoes_veiculo'
      and policyname = 'manutencoes_veiculo_insert_authenticated'
  ) then
    create policy manutencoes_veiculo_insert_authenticated
      on public.manutencoes_veiculo
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'manutencoes_veiculo'
      and policyname = 'manutencoes_veiculo_update_authenticated'
  ) then
    create policy manutencoes_veiculo_update_authenticated
      on public.manutencoes_veiculo
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'manutencoes_veiculo'
      and policyname = 'manutencoes_veiculo_delete_authenticated'
  ) then
    create policy manutencoes_veiculo_delete_authenticated
      on public.manutencoes_veiculo
      for delete
      to authenticated
      using (true);
  end if;
end $$;