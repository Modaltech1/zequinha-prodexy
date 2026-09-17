# ADR 0001: Combobox de busca reutilizável

- Estado: aceito
- Data: 2026-09-17

## Contexto

Os catálogos de produtos e serviços da ordem de serviço eram apresentados em selects extensos. Isso dificultava encontrar itens e duplicaria lógica caso cada domínio recebesse uma busca própria.

## Decisão

Centralizar o comportamento em `components/search-combobox.tsx`, um componente genérico controlado por `id`.

O consumidor configura:

- texto exibido após a seleção;
- conteúdo usado pela busca;
- apresentação de cada resultado;
- mensagens e nomenclatura acessíveis.

O componente compartilhado é responsável por normalização de busca, limite e rolagem dos resultados, estados aberto/fechado, limpeza, seleção e navegação por teclado.

## Consequências

- Produtos e serviços mantêm a mesma experiência e correções futuras são centralizadas.
- Novos catálogos podem reutilizar o controle sem incorporar regras de um domínio específico.
- A camada consumidora continua responsável pela apresentação e pelos dados próprios de cada item.
