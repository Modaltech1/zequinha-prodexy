# Módulo financeiro — implantação e validação

## Escopo entregue

O módulo `/admin/financeiro` é uma área administrativa exclusivamente de leitura. Ele consolida as ordens de serviço com os mesmos filtros em todos os indicadores, tabelas e no documento impresso:

- período predefinido ou personalizado;
- status, cliente, responsável e forma de pagamento;
- busca por OS, cliente, veículo, item, responsável ou pagamento;
- total de OS, finalizadas, abertas, canceladas, clientes, valor final, tíquete médio e mão de obra;
- distribuição por status e composição financeira;
- mão de obra total por cliente;
- divisão da quantidade de OS, mão de obra, valor final e tíquete médio por responsável;
- quantidade, receita e preço médio de venda por produto;
- custo histórico, lucro e repasse das vendas de produtos parceiros;
- memória de cálculo por produto `PL0826-`: 80% do custo mais 10% do lucro;
- relação detalhada das ordens;
- impressão ou salvamento em PDF A4 paisagem.

As consultas são paginadas e o relatório avisa quando o limite operacional de 5.000 OS é atingido. A API confirma a sessão e exige um perfil ativo com papel `admin`, mesmo que a URL seja chamada diretamente.

## Banco de dados e migration

Execute, depois da migration principal de produtos:

`script/migration_codigos_repasses_parceria.sql`

O módulo usa:

- `ordens_de_servico` para datas, status, cliente, responsável, pagamento e totais;
- `ordem_servicos` e `servicos` para os serviços vinculados;
- `ordem_produtos` e `produtos` para produtos, quantidades, venda, código e custo histórico;
- `clientes` e `perfis` para os nomes exibidos e filtros.

A migration grava `codigo_produto` e `valor_custo` como snapshot em `ordem_produtos`. Isso impede que uma alteração futura no cadastro mude o resultado de vendas antigas. Para os itens já existentes, o backfill usa o código e o custo atuais do produto; essa é a melhor referência disponível para o histórico anterior à implantação.

O repasse considera somente OS com status `finalizada` dentro dos demais filtros aplicados. Produtos com outros prefixos aparecem normalmente em “Vendas por produto”, mas não entram no repasse.

## Execução local

1. Mantenha no `.env.local` as variáveis já usadas pelo projeto: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Execute `npm test`.
3. Execute `npm run typecheck` para validar o novo módulo isoladamente. O projeto já possuía erros de tipagem legados em outras telas e, por isso, esta checagem usa `tsconfig.financial.json` sem mascarar problemas do código entregue.
4. Execute `npm run lint`.
5. Execute `npm run build`.
6. Inicie com `npm run dev`, entre como administrador e abra `/admin/financeiro`.

## Roteiro de homologação

- Compare um período curto com as ordens da tela administrativa.
- Teste cada filtro isoladamente e depois em combinação.
- Confira uma OS com serviço, produto, mão de obra, acréscimo e desconto.
- Valide a soma de mão de obra de pelo menos dois clientes.
- Valide a divisão de OS e mão de obra entre dois responsáveis e o agrupamento “Não informado”.
- Confirme quantidade e receita de um produto presente em mais de uma OS.
- Confira um item `PL0826-` com custo 72, venda 158,40, lucro 86,40 e repasse 66,24.
- Confirme que uma OS aberta ou cancelada não entra no repasse até ser finalizada.
- Altere o custo do produto depois de uma venda e confirme que o relatório antigo mantém o custo gravado na OS.
- Use “Imprimir / salvar PDF”, escolha orientação paisagem e verifique cabeçalho, tabelas e repetição dos títulos de coluna entre páginas.
- Confirme que um colaborador não consegue acessar a página nem a API.
