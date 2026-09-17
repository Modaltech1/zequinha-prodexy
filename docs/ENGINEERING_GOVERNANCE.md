# Governança de engenharia

## Objetivo

Manter o código reutilizável, legível, modular, escalável e seguro para evolução. Estes critérios fazem parte da definição de pronto das mudanças.

## Princípios

### Reutilização antes de duplicação

- Procure componentes, funções e regras existentes antes de implementar algo novo.
- Quando duas experiências compartilham comportamento, extraia uma abstração configurável.
- Evite abstrações prematuras: a API compartilhada deve representar uma necessidade real e manter os casos de uso legíveis.

### Responsabilidade única

- Componentes de página coordenam dados e fluxo de negócio.
- Componentes reutilizáveis encapsulam interação e apresentação.
- Funções de domínio concentram normalização, cálculo e validação testáveis.
- Integrações externas ficam isoladas da camada visual.

### APIs claras e tipadas

- Prefira propriedades explícitas, tipos genéricos com limites claros e nomes baseados no domínio.
- Um componente reutilizável não deve conhecer detalhes específicos de produto, serviço ou outro catálogo.
- Estados controlados devem possuir uma única fonte de verdade e comportamento previsível ao limpar ou substituir valores.

### UX e acessibilidade

- Toda ação deve comunicar estados vazio, indisponível e selecionado.
- Controles compostos devem funcionar com mouse e teclado.
- Use semântica e atributos ARIA apropriados, foco visível e alvos adequados em telas pequenas.
- Listas extensas devem ter limite visual, rolagem e busca tolerante a acentos e caixa.

### Manutenabilidade

- Evite lógica duplicada, componentes monolíticos e dependências ocultas.
- Prefira mudanças pequenas e coesas.
- Comentários explicam decisões não óbvias; o código deve explicar o fluxo normal.
- Registre decisões arquiteturais que afetem mais de um módulo.

## Checklist de revisão

- Existe implementação equivalente que pode ser reutilizada?
- A responsabilidade está no módulo correto?
- Nomes e tipos tornam o contrato evidente?
- Há duplicação que aumentará o custo de manutenção?
- Fluxos de teclado, responsividade, erros e estados vazios foram considerados?
- A mudança exige atualização de documentação ou um ADR?
- Lint, typecheck, testes e build relevantes foram executados?

