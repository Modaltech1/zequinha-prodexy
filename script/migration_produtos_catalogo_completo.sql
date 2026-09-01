-- Catálogo completo de produtos e impressão térmica
-- Projeto: Zequinha Pneus (aplicação específica)
-- Migration aditiva: preserva produtos e colunas existentes.

begin;

alter table public.produtos
  add column if not exists setor text null,
  add column if not exists referencia text null,
  add column if not exists marca text null,
  add column if not exists funcao text null,
  add column if not exists aplicacao text null,
  add column if not exists especificacoes text null,
  add column if not exists observacoes text null,
  add column if not exists valor_custo numeric(12, 2) not null default 0,
  add column if not exists mao_de_obra numeric(12, 2) not null default 0,
  add column if not exists foto_url text null,
  add column if not exists foto_chave text null;

-- O cadastro antigo armazenava a marca em marca_modelo. O backfill evita
-- deixar os produtos atuais sem marca e mantém a coluna antiga intacta.
update public.produtos
set marca = nullif(trim(marca_modelo), '')
where marca is null
  and nullif(trim(marca_modelo), '') is not null;

alter table public.produtos
  drop constraint if exists produtos_valor_custo_check,
  add constraint produtos_valor_custo_check check (valor_custo >= 0);

alter table public.produtos
  drop constraint if exists produtos_mao_de_obra_check,
  add constraint produtos_mao_de_obra_check check (mao_de_obra >= 0);

create index if not exists produtos_setor_idx
  on public.produtos (setor);

create index if not exists produtos_referencia_idx
  on public.produtos (referencia);

create index if not exists produtos_marca_idx
  on public.produtos (marca);

comment on column public.produtos.valor_unitario is
  'Preço unitário de venda do produto. Nome legado mantido por compatibilidade com as ordens de serviço.';

comment on column public.produtos.valor_custo is
  'Custo atual de aquisição do produto.';

comment on column public.produtos.mao_de_obra is
  'Valor sugerido de mão de obra associado à aplicação do produto.';

commit;
