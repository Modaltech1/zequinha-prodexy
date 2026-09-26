-- Adiciona à OS o relato do cliente sobre o veículo no momento da chegada.
-- Migration incremental e idempotente para bancos já existentes.

alter table public.ordens_de_servico
  add column if not exists reclame text null;
