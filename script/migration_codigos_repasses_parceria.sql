-- Códigos únicos de produtos e snapshot financeiro das vendas da parceria
-- Projeto: Zequinha Pneus (aplicação específica)
-- Execute depois de migration_produtos_catalogo_completo.sql.

begin;

-- Segurança para bancos que ainda não receberam a primeira migration.
alter table public.produtos
  add column if not exists valor_custo numeric(12, 2) not null default 0;

-- A migration não altera códigos existentes automaticamente. Se houver duplicidade,
-- ela interrompe com uma mensagem clara para que o responsável escolha o código correto.
do $$
declare
  codigos_duplicados text;
begin
  select string_agg(codigo_normalizado, ', ' order by codigo_normalizado)
  into codigos_duplicados
  from (
    select upper(trim(codigo)) as codigo_normalizado
    from public.produtos
    where nullif(trim(codigo), '') is not null
    group by upper(trim(codigo))
    having count(*) > 1
    limit 20
  ) duplicados;

  if codigos_duplicados is not null then
    raise exception using
      errcode = '23505',
      message = 'Existem códigos de produto repetidos: ' || codigos_duplicados,
      hint = 'Corrija os códigos listados e execute novamente esta migration.';
  end if;
end $$;

-- Códigos vazios continuam permitidos apenas para compatibilidade com registros antigos.
-- Todo código informado passa a ser único, ignorando espaços externos e caixa.
create unique index if not exists produtos_codigo_normalizado_uidx
  on public.produtos (upper(trim(codigo)))
  where nullif(trim(codigo), '') is not null;

-- Sugestão incremental para a parceria. A restrição única acima continua sendo
-- a garantia final em caso de duas pessoas tentarem salvar o mesmo número.
create or replace function public.proximo_codigo_produto_parceiro()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select 'PL0826-' || (
    coalesce(max(substring(upper(trim(codigo)) from '^PL0826-([0-9]+)$')::bigint), 0) + 1
  )::text
  from public.produtos
  where upper(trim(codigo)) ~ '^PL0826-[0-9]+$';
$$;

create or replace function public.codigo_produto_disponivel(
  p_codigo text,
  p_produto_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select nullif(trim(p_codigo), '') is not null
    and not exists (
      select 1
      from public.produtos
      where upper(trim(codigo)) = upper(trim(p_codigo))
        and (p_produto_id is null or id <> p_produto_id)
    );
$$;

revoke all on function public.proximo_codigo_produto_parceiro() from public;
revoke all on function public.codigo_produto_disponivel(text, uuid) from public;
grant execute on function public.proximo_codigo_produto_parceiro() to authenticated;
grant execute on function public.codigo_produto_disponivel(text, uuid) to authenticated;

-- Snapshot do custo e do código no momento da venda. Assim, alterações futuras no
-- cadastro do produto não modificam retroativamente o repasse de uma OS antiga.
alter table public.ordem_produtos
  add column if not exists codigo_produto text null,
  add column if not exists valor_custo numeric(12, 2) null;

update public.ordem_produtos ordem_produto
set
  codigo_produto = coalesce(
    nullif(trim(ordem_produto.codigo_produto), ''),
    nullif(trim(produto.codigo), '')
  ),
  valor_custo = coalesce(ordem_produto.valor_custo, produto.valor_custo, 0)
from public.produtos produto
where produto.id = ordem_produto.produto_id
  and (
    nullif(trim(ordem_produto.codigo_produto), '') is null
    or ordem_produto.valor_custo is null
  );

alter table public.ordem_produtos
  drop constraint if exists ordem_produtos_valor_custo_check,
  add constraint ordem_produtos_valor_custo_check
    check (valor_custo is null or valor_custo >= 0);

create or replace function public.preencher_snapshot_produto_ordem()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  produto_codigo text;
  produto_custo numeric(12, 2);
begin
  select codigo, valor_custo
  into produto_codigo, produto_custo
  from public.produtos
  where id = new.produto_id;

  if nullif(trim(new.codigo_produto), '') is null then
    new.codigo_produto := nullif(trim(produto_codigo), '');
  end if;

  if new.valor_custo is null then
    new.valor_custo := coalesce(produto_custo, 0);
  end if;

  return new;
end;
$$;

drop trigger if exists ordem_produtos_snapshot_produto_trigger
  on public.ordem_produtos;

create trigger ordem_produtos_snapshot_produto_trigger
before insert or update of produto_id
on public.ordem_produtos
for each row
execute function public.preencher_snapshot_produto_ordem();

comment on index public.produtos_codigo_normalizado_uidx is
  'Impede códigos repetidos, ignorando espaços externos e diferenças entre maiúsculas e minúsculas.';

comment on column public.ordem_produtos.valor_custo is
  'Custo unitário do produto preservado no momento em que o item foi gravado na OS.';

commit;
