# Governança de engenharia

As regras detalhadas e o mapa da documentação ficam em [`docs/README.md`](docs/README.md).

Ao alterar este projeto:

1. Reutilize componentes e regras de domínio existentes antes de criar variações locais.
2. Extraia comportamentos repetidos para módulos com responsabilidade única e API tipada.
3. Preserve acessibilidade, navegação por teclado, responsividade e estados vazios nas interfaces.
4. Mantenha componentes de página focados em composição e fluxo de negócio.
5. Registre decisões arquiteturais relevantes em `docs/architecture/decisions`.
6. Valide, conforme o risco da mudança, com `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.
7. Não misture refatorações não relacionadas com uma mudança funcional.

