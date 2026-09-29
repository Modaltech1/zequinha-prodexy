-- Adiciona à OS o relatório técnico produzido com base no reclame do cliente.
-- Migration incremental e idempotente para bancos já existentes.

alter table public.ordens_de_servico
  add column if not exists relatorio_tecnico text null;
