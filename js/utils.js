// Funções utilitárias compartilhadas pelo app.
const Utils = (() => {
  const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  function formatCurrency(value) {
    return currencyFmt.format(Number(value) || 0);
  }

  // Recebe string em formato brasileiro ("1.234,56" ou "1234,56" ou "1234.56") e devolve number.
  function parseCurrency(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    let s = String(str).trim().replace(/[R$\s]/g, '');
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // Espera "YYYY-MM-DD" (formato de <input type=date>) e devolve "DD/MM/YYYY".
  function formatDate(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
  }

  // Converte "DD/MM/YYYY" ou "DD-MM-YYYY" para "YYYY-MM-DD".
  function toIsoDate(brDate) {
    if (!brDate) return '';
    const s = brDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return '';
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  function todayIso() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }

  function monthLabel(isoDate) {
    const [y, m] = isoDate.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(m, 10) - 1]}/${y}`;
  }

  function monthKey(isoDate) {
    return isoDate ? isoDate.slice(0, 7) : '';
  }

  function addMonths(isoDate, n) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1 + n, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const day = Math.min(d, lastDay);
    date.setDate(day);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function diasEntre(isoA, isoB) {
    const a = new Date(isoA + 'T00:00:00');
    const b = new Date(isoB + 'T00:00:00');
    return Math.round(Math.abs(a - b) / 86400000);
  }

  function uid(prefix) {
    return `${prefix || 'id'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // Monta as <option>/<optgroup> de um <select> a partir do retorno de Store.categoriasAgrupadas().
  function optionsCategoriasAgrupadas(blocos, selectedId) {
    return blocos.map(b => {
      const opts = b.categorias.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('');
      return b.grupo ? `<optgroup label="${escapeHtml(b.grupo.nome)}">${opts}</optgroup>` : opts;
    }).join('');
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    formatCurrency, parseCurrency, formatDate, toIsoDate, todayIso,
    monthLabel, monthKey, addMonths, diasEntre, uid, escapeHtml, debounce, downloadFile,
    optionsCategoriasAgrupadas,
  };
})();
