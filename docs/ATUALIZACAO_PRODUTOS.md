# Atualização do catálogo de produtos

## O que mudou

A página `/admin/produtos` passou a trabalhar com o catálogo técnico e financeiro definido na planilha de referência:

- código, setor, nome da peça, referência e marca;
- função, aplicação, especificações e observações;
- estoque, custo, preço de venda e mão de obra;
- margem bruta, margem percentual e valor de produto mais mão de obra calculados na aplicação;
- foto individual;
- código obrigatório nos novos cadastros, normalizado em maiúsculas e protegido contra repetição;
- sugestão automática incremental `PL0826-N`, mantendo a possibilidade de códigos livres como `ZP-100`;
- visualização completa, edição, ajustes rápidos de estoque, impressão e exclusão pelo menu de três pontos;
- impressão térmica individual com 80 mm de largura.

## Organização da listagem

A tabela principal exibe somente código, setor, nome da peça, marca, estoque, custo, preço de venda, mão de obra, valor total, margem e ações. Referência, função, aplicação, especificações, observações e foto permanecem disponíveis em “Ver informações” e na edição.

Produtos e Financeiro usam o mesmo estilo compartilhado de tabela. Em telas menores, a rolagem horizontal fica restrita ao contêiner da tabela e não aumenta a largura da página.

O campo de banco `valor_unitario` continua sendo o preço de venda. Ele não foi renomeado para preservar a integração atual com as ordens de serviço.

## Migration obrigatória

Antes de publicar o código, execute no SQL Editor do Supabase, nesta ordem:

`script/migration_produtos_catalogo_completo.sql`

`script/migration_codigos_repasses_parceria.sql`

As migrations são aditivas: não apagam produtos nem removem colunas. Produtos atuais recebem custo e mão de obra iguais a zero, os novos campos textuais ficam vazios e `marca` é preenchida a partir de `marca_modelo` quando houver informação antiga.

A segunda migration cria a unicidade do código ignorando espaços externos e diferenças entre maiúsculas e minúsculas. Se já houver códigos duplicados no banco, ela interrompe a execução e informa os códigos que precisam ser corrigidos; nenhum identificador existente é alterado automaticamente.

Ela também registra código e custo como snapshot nos itens vendidos. As OS antigas são preenchidas com os dados atuais do respectivo produto, enquanto novas vendas preservam o custo vigente no momento da gravação.

O arquivo `script/produtos_supabase.sql` também foi atualizado para instalações novas. Ele não deve ser executado no lugar da migration em um banco já utilizado, pois contém carga inicial de produtos.

## Ordem de implantação

1. Faça backup do banco conforme o procedimento normal do projeto.
2. Execute `script/migration_produtos_catalogo_completo.sql` no Supabase.
3. Execute `script/migration_codigos_repasses_parceria.sql` no Supabase.
4. Confirme as novas colunas em `public.produtos` e o campo `valor_custo` em `public.ordem_produtos`.
5. Publique a aplicação.
6. Entre como administrador e abra `/admin/produtos`.
7. Edite um produto existente para completar código, setor, referência, custo e demais dados.

Os sete registros presentes na planilha de referência não são importados automaticamente, evitando duplicidade com os itens que já existem no banco.

## Impressora térmica

Ao usar “Imprimir etiqueta”, selecione no navegador:

- impressora térmica de 80 mm;
- escala de 100%;
- cabeçalhos e rodapés do navegador desativados;
- margens padrão da aplicação.

A ficha usa uma área útil de 75 mm dentro da bobina de 80 mm e não possui cabeçalho, logomarca, foto, caixas ou destaques financeiros. Todos os dados são apresentados em sequência, separados somente por linhas pontilhadas. A altura acompanha o conteúdo; descrições técnicas e observações extensas aumentam o comprimento impresso.

## Validação recomendada

- conferir um produto antigo após a migration;
- cadastrar um produto com todos os campos e foto;
- substituir e remover a foto;
- conferir custo, venda, margem e produto mais mão de obra;
- filtrar por setor e situação do estoque;
- ajustar o estoque pelo menu de três pontos;
- imprimir uma etiqueta em pré-visualização antes da primeira impressão física.

O módulo financeiro/relatórios não foi alterado nesta atualização.
