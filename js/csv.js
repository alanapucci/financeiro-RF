// Parser simples de CSV de extrato bancário para a conciliação.
const CsvImport = (() => {
  function detectDelimiter(line) {
    const commas = (line.match(/,/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    return semis > commas ? ';' : ',';
  }

  function splitCsvLine(line, delim) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delim && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  function looksLikeDate(s) {
    return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
  }
  function looksLikeValue(s) {
    return /^-?[\d.,]+$/.test(s.replace(/[R$\s]/g, '')) && /\d/.test(s);
  }
  // Remove acentos e caixa para comparar nomes de coluna com segurança.
  function normalizar(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // Procura, nas primeiras linhas do arquivo, a linha de cabeçalho real da tabela
  // (bancos costumam colocar linhas de identificação da conta antes da tabela).
  // Retorna { headerIndex, idxData, idxValor, idxDescricao, idxIgnorar } ou null se não achar.
  function localizarCabecalho(rows) {
    const limite = Math.min(rows.length, 15);
    for (let i = 0; i < limite; i++) {
      const cols = rows[i].map(normalizar);
      const idxData = cols.findIndex(c => c === 'data' || c.startsWith('data '));
      const idxValor = cols.findIndex(c => c.includes('valor') && !c.includes('saldo'));
      if (idxData === -1 || idxValor === -1) continue;
      const idxDescricao = cols.findIndex(c => c.includes('descri') || c.includes('historic'));
      const idxIgnorar = cols
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.includes('saldo') || c.includes('documento'))
        .map(({ i }) => i);
      return { headerIndex: i, idxData, idxValor, idxDescricao, idxIgnorar };
    }
    return null;
  }

  // Retorna { linhas: [{data, descricao, valor}], erros: [] }
  function parse(text) {
    const rawLines = text.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
    if (rawLines.length === 0) return { linhas: [], erros: ['Arquivo vazio.'] };
    const delim = detectDelimiter(rawLines[0]);
    const rows = rawLines.map(l => splitCsvLine(l, delim));

    const linhas = [];
    const erros = [];
    const cab = localizarCabecalho(rows);

    if (cab) {
      // Caminho preferido: colunas identificadas pelo nome do cabeçalho (Data, Descrição, Valor —
      // nunca confunde com Saldo). Linhas sem data válida (ex: "Saldo Anterior") são só puladas.
      rows.slice(cab.headerIndex + 1).forEach((cols) => {
        const dateCol = cols[cab.idxData];
        const valueCol = cols[cab.idxValor];
        if (!dateCol || !looksLikeDate(dateCol) || valueCol == null || valueCol === '') return;
        let descricao;
        if (cab.idxDescricao !== -1) {
          descricao = cols[cab.idxDescricao] || '';
        } else {
          descricao = cols
            .filter((c, i) => i !== cab.idxData && i !== cab.idxValor && !cab.idxIgnorar.includes(i))
            .join(' ').trim();
        }
        linhas.push({
          data: Utils.toIsoDate(dateCol),
          descricao: descricao || '(sem descrição)',
          valor: Utils.parseCurrency(valueCol),
        });
      });
      return { linhas, erros };
    }

    // Sem cabeçalho reconhecível: heurística antiga, mas priorizando a PRIMEIRA coluna que parece
    // valor (convenção mais comum é Valor vir antes de Saldo, quando as duas colunas existem).
    let dataRows = rows;
    const primeiraLinhaTemData = rows[0] && rows[0].some(looksLikeDate);
    if (!primeiraLinhaTemData) dataRows = rows.slice(1);

    dataRows.forEach((cols, idx) => {
      if (cols.length < 2) { erros.push(`Linha ${idx + 1}: colunas insuficientes.`); return; }
      const dateCol = cols.find(looksLikeDate);
      const valueCols = cols.filter(c => looksLikeValue(c) && !looksLikeDate(c));
      const valueCol = valueCols.length ? valueCols[0] : null;
      if (!dateCol || !valueCol) { erros.push(`Linha ${idx + 1}: não foi possível identificar data/valor ("${cols.join(delim)}").`); return; }
      const descCols = cols.filter(c => c !== dateCol && c !== valueCol);
      linhas.push({
        data: Utils.toIsoDate(dateCol),
        descricao: descCols.join(' ').trim() || '(sem descrição)',
        valor: Utils.parseCurrency(valueCol),
      });
    });
    return { linhas, erros };
  }

  return { parse };
})();
