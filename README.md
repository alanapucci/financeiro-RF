# Financeiro do Brechó

App simples de controle financeiro para o dia a dia do brechó: lançamentos, conciliação bancária, contas a pagar/receber com parcelas e relatórios. Feito para substituir o Nibo sem mensalidade — roda direto no navegador, sem precisar instalar nada.

## Como usar

1. Baixe/clone este repositório.
2. Abra o arquivo `index.html` no navegador (duplo clique, ou "Abrir com" → navegador).
   - Também pode ser hospedado gratuitamente no **GitHub Pages**: em *Settings → Pages* deste repositório, escolha a branch `main` e a pasta raiz. O app fica disponível numa URL pública (só você saberá o link, mas trate como algo semipúblico).
3. Pronto — comece a lançar suas receitas e despesas.

Não é necessário internet para usar o app depois de carregado uma vez (exceto para carregar as fontes/ícones visuais). Não há servidor, banco de dados externo ou login: tudo roda localmente no seu navegador.

## Onde ficam os dados

Os dados (lançamentos, categorias, contas, parcelas, extrato importado) ficam salvos no **localStorage do navegador**, isto é, dentro do próprio navegador que você está usando, neste computador/dispositivo.

Isso significa:
- Os dados **não são compartilhados** entre navegadores ou dispositivos diferentes automaticamente.
- Se você limpar o cache/dados do navegador, os dados do app somem.
- **Faça backup regularmente** (veja abaixo) — principalmente antes de trocar de computador ou limpar o navegador.

## Backup e restauração

No topo do app, clique em **⚙️ Backup**:
- **Exportar backup (.json)**: baixa um arquivo com todos os seus dados. Guarde esse arquivo num lugar seguro (Google Drive, e-mail para você mesma, etc). Recomendado fazer isso toda semana.
- **Importar backup (.json)**: restaura os dados a partir de um arquivo exportado anteriormente. Útil para trocar de computador ou recuperar dados.
- **Apagar todos os dados**: reseta o app para o estado inicial (com as categorias sugeridas para brechó). Ação irreversível — use com cuidado.

## Funcionalidades

### 📊 Resumo
Painel com saldo atual, receitas/despesas do mês, gráfico de fluxo de caixa dos últimos 6 meses, gráfico de despesas por categoria e lista dos próximos vencimentos (30 dias).

### 📈 Visão anual
Painel mês a mês por categoria (Jan a Dez + total do ano), no mesmo formato do painel de acompanhamento do Nibo: receitas por categoria, despesas por categoria e resultado do período.

### 💰 Vendas por consignação
Registro de cada venda/recebimento — cliente, peça vendida, fornecedora (com CPF/CNPJ e CEP para emissão de nota), valor da venda, custo (repasse à fornecedora) e valor da nota/comissão. **Esse registro é separado do financeiro**: não gera lançamentos nem entra nos relatórios de Resumo/Visão anual automaticamente — serve para você controlar o que precisa repassar a cada fornecedora, o que já foi faturado (nº da nota) e conferir os recebimentos na conciliação. Dá pra exportar tudo em CSV a qualquer momento.

### 🧾 Lançamentos
Cadastro de entradas e saídas (data, descrição, categoria, conta, valor, forma de pagamento). Filtros por mês, tipo e categoria, além de busca por descrição.

### 🔗 Conciliação bancária
1. Exporte o extrato do seu banco em **CSV** (a maioria dos bancos e apps de pagamento permite isso).
2. Importe o arquivo em **Conciliação → Importar extrato (CSV)**. O app tenta identificar automaticamente as colunas de data, descrição e valor.
3. Use **Conciliar automaticamente** para casar linhas do extrato com lançamentos que tenham a mesma data e valor, ou selecione manualmente uma linha do extrato + um lançamento e clique em **Vincular selecionados**.
4. Se uma linha do extrato não tiver lançamento correspondente, clique em ➕ para criar o lançamento diretamente a partir dela (já conciliado).

### 📅 Contas a pagar/receber
Cadastre compromissos parcelados (ex: um fornecedor em 3x, um empréstimo, uma cliente pagando em 2x). O app gera as parcelas automaticamente com vencimento mensal. Ao marcar uma parcela como paga, um lançamento é criado automaticamente e vinculado a ela (pode ser estornado se necessário).

### 🏷️ Categorias e contas
Gerencie categorias de receita/despesa (já vem com sugestões para brechó: venda de peças, repasse a consignantes, aluguel, taxas de maquininha, etc.) e as contas/caixas usadas (dinheiro, banco).

## Formato do CSV de extrato bancário

O importador aceita CSV com vírgula ou ponto e vírgula como separador, e tenta identificar automaticamente qual coluna é data, qual é valor e qual é descrição. Formatos de data aceitos: `DD/MM/AAAA` ou `AAAA-MM-DD`. Valores podem usar vírgula ou ponto como separador decimal (ex: `1.234,56` ou `1234.56`). Valores negativos são tratados como saída/despesa.

Exemplo de linha aceita:
```
22/09/2026;Pagamento fornecedor XYZ;-350,00
```

## Tecnologia

HTML, CSS e JavaScript puros (sem build, sem dependências de servidor). Usa Tailwind CSS e Chart.js via CDN. Todo o código está em `js/` (lógica) e `css/` (estilos).
