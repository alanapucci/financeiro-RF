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

  // Retorna { linhas: [{data, descricao, valor}], erros: [] }
  function parse(text) {
    const rawLines = text.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
    if (rawLines.length === 0) return { linhas: [], erros: ['Arquivo vazio.'] };
    const delim = detectDelimiter(rawLines[0]);
    let rows = rawLines.map(l => splitCsvLine(l, delim));

    // Detecta e remove cabeçalho: primeira linha sem valores de data/valor plausíveis.
    const header = rows[0];
    const headerHasDate = header.some(looksLikeDate);
    if (!headerHasDate) rows = rows.slice(1);

    const linhas = [];
    const erros = [];
    rows.forEach((cols, idx) => {
      if (cols.length < 2) { erros.push(`Linha ${idx + 1}: colunas insuficientes.`); return; }
      const dateCol = cols.find(looksLikeDate);
      const valueCols = cols.filter(c => looksLikeValue(c) && !looksLikeDate(c));
      const valueCol = valueCols.length ? valueCols[valueCols.length - 1] : null;
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
