# Documentação do projeto

Este diretório é a fonte de referência para decisões técnicas, padrões de desenvolvimento e validações do projeto.

## Organização

- [`ENGINEERING_GOVERNANCE.md`](ENGINEERING_GOVERNANCE.md): princípios obrigatórios para implementação e revisão.
- [`architecture/decisions`](architecture/decisions): registros curtos de decisões arquiteturais (ADRs).
- [`ATUALIZACAO_PRODUTOS.md`](ATUALIZACAO_PRODUTOS.md): histórico funcional do módulo de produtos.
- [`VALIDACAO_FINANCEIRO.md`](VALIDACAO_FINANCEIRO.md): roteiro de validação do módulo financeiro.

## Quando atualizar

- Nova convenção transversal: atualizar a governança.
- Decisão estrutural com alternativas relevantes: criar um ADR numerado.
- Mudança de contrato, operação ou validação: atualizar o documento do módulo afetado.
- Documento obsoleto: atualizar ou remover no mesmo pull request da mudança.

## Formato dos ADRs

Use nomes sequenciais, como `0002-titulo-da-decisao.md`, contendo: contexto, decisão, consequências e estado.

