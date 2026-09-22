// Registro de vendas por consignação (recebimentos). Independente do financeiro:
// não gera lançamentos automaticamente, serve como controle para conciliação e emissão de NF.
const ViewVendas = (() => {
  let filtros = { mes: '', fornecedora: '', statusNf: '', busca: '' };

  function fornecedorasUnicas(state) {
    return Array.from(new Set(state.vendas.map(v => v.fornecedora).filter(Boolean))).sort();
  }

  function render(container) {
    const state = Store.getState();
    const filtradas = state.vendas
      .filter(v => !filtros.mes || Utils.monthKey(v.dataEntrada) === filtros.mes)
      .filter(v => !filtros.fornecedora || v.fornecedora === filtros.fornecedora)
      .filter(v => !filtros.statusNf || (filtros.statusNf === 'emitida' ? !!v.numeroNF : !v.numeroNF))
      .filter(v => !filtros.busca || `${v.cliente} ${v.pecaVendida}`.toLowerCase().includes(filtros.busca.toLowerCase()))
      .sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));

    const totalVenda = filtradas.reduce((s, v) => s + (Number(v.valorVenda) || 0), 0);
    const totalCusto = filtradas.reduce((s, v) => s + (Number(v.custo) || 0), 0);
    const totalComissao = filtradas.reduce((s, v) => s + (Number(v.valorNota) || 0), 0);
    const pendentesNF = filtradas.filter(v => !v.numeroNF).length;

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 class="font-heading font-bold text-2xl text-forest-800">Vendas por consignação</h2>
        <div class="flex gap-2">
          <button id="btn-export-vendas" class="btn-secondary">⬇️ Exportar CSV</button>
          <button id="btn-nova-venda" class="btn-primary">+ Nova venda</button>
        </div>
      </div>
      <p class="text-sm text-ink/60 mb-4">Registro separado do financeiro: aqui você controla o que foi vendido, quanto repassar a cada fornecedora e o valor da nota (comissão). Não entra automaticamente em Lançamentos nem nos relatórios — use isso para conferir os recebimentos e emitir as notas.</p>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Total vendido</p>
          <p class="text-lg font-bold text-ink">${Utils.formatCurrency(totalVenda)}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">A repassar (custo)</p>
          <p class="text-lg font-bold text-rose-600">${Utils.formatCurrency(totalCusto)}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Comissão (sua receita)</p>
          <p class="text-lg font-bold text-forest-700">${Utils.formatCurrency(totalComissao)}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Notas pendentes</p>
          <p class="text-lg font-bold ${pendentesNF > 0 ? 'text-amber-600' : 'text-forest-700'}">${pendentesNF}</p>
        </div>
      </div>

      <div class="card mb-4">
        <div class="grid sm:grid-cols-4 gap-3">
          <div>
            <label class="label">Mês</label>
            <input type="month" id="f-mes" class="input" value="${filtros.mes}">
          </div>
          <div>
            <label class="label">Fornecedora</label>
            <select id="f-fornecedora" class="input">
              <option value="">Todas</option>
              ${fornecedorasUnicas(state).map(f => `<option value="${Utils.escapeHtml(f)}" ${filtros.fornecedora === f ? 'selected' : ''}>${Utils.escapeHtml(f)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">Nota fiscal</label>
            <select id="f-status-nf" class="input">
              <option value="">Todas</option>
              <option value="emitida" ${filtros.statusNf === 'emitida' ? 'selected' : ''}>Emitida</option>
              <option value="pendente" ${filtros.statusNf === 'pendente' ? 'selected' : ''}>Pendente</option>
            </select>
          </div>
          <div>
            <label class="label">Buscar</label>
            <input type="text" id="f-busca" class="input" placeholder="Cliente ou peça..." value="${Utils.escapeHtml(filtros.busca)}">
          </div>
        </div>
      </div>

      <div class="card p-0 overflow-hidden">
        <div class="table-scroll">
        <table class="data-table px-4">
          <thead><tr>
            <th class="pl-4">Data</th><th>Cliente</th><th>Peça</th><th>Fornecedora</th>
            <th>Venda</th><th>Custo</th><th>Comissão</th><th>NF</th><th class="pr-4"></th>
          </tr></thead>
          <tbody>
            ${filtradas.length === 0 ? `<tr><td colspan="9" class="text-center text-ink/50 py-6">Nenhuma venda encontrada.</td></tr>` : filtradas.map(v => `
              <tr>
                <td class="pl-4">${Utils.formatDate(v.dataEntrada)}</td>
                <td>${Utils.escapeHtml(v.cliente || '—')}</td>
                <td>${Utils.escapeHtml(v.pecaVendida || '—')}</td>
                <td>${Utils.escapeHtml(v.fornecedora || '—')}</td>
                <td>${Utils.formatCurrency(v.valorVenda)}</td>
                <td class="text-rose-600">${Utils.formatCurrency(v.custo)}</td>
                <td class="font-semibold text-forest-700">${Utils.formatCurrency(v.valorNota)}</td>
                <td>${v.numeroNF ? `<span class="badge badge-green">Nº ${Utils.escapeHtml(v.numeroNF)}</span>` : '<span class="badge badge-amber">Pendente</span>'}</td>
                <td class="pr-4 text-right whitespace-nowrap">
                  <button class="btn-icon" data-edit="${v.id}" title="Editar">✏️</button>
                  <button class="btn-icon" data-del="${v.id}" title="Excluir">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>
    `;

    document.getElementById('btn-nova-venda').addEventListener('click', () => openForm());
    document.getElementById('btn-export-vendas').addEventListener('click', () => exportCsv(filtradas));
    document.getElementById('f-mes').addEventListener('change', e => { filtros.mes = e.target.value; render(container); });
    document.getElementById('f-fornecedora').addEventListener('change', e => { filtros.fornecedora = e.target.value; render(container); });
    document.getElementById('f-status-nf').addEventListener('change', e => { filtros.statusNf = e.target.value; render(container); });
    document.getElementById('f-busca').addEventListener('input', Utils.debounce(e => { filtros.busca = e.target.value; render(container); }, 300));

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openForm(state.vendas.find(v => v.id === btn.dataset.edit)));
    });
    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir este registro de venda?')) {
          Store.deleteVenda(btn.dataset.del);
          App.toast('Registro excluído.');
          render(container);
        }
      });
    });
  }

  function exportCsv(linhas) {
    const header = ['Data entrada', 'Cliente', 'Peça vendida', 'Fornecedora', 'CPF/CNPJ fornecedora', 'CEP', 'Valor venda', 'Custo', 'Valor nota (comissão)', 'Nº NF'];
    const rows = linhas.map(v => [
      Utils.formatDate(v.dataEntrada), v.cliente, v.pecaVendida, v.fornecedora, v.docFornecedora, v.cep,
      String(v.valorVenda || 0).replace('.', ','), String(v.custo || 0).replace('.', ','), String(v.valorNota || 0).replace('.', ','),
      v.numeroNF,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(';')).join('\n');
    Utils.downloadFile(`vendas-consignacao-${Utils.todayIso()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    App.toast('CSV exportado!');
  }

  function openForm(venda) {
    const editando = !!venda;
    const v = venda || {};
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">${editando ? 'Editar' : 'Nova'} venda</h3>
      <form id="form-venda" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Data de entrada</label>
            <input type="date" id="vf-data" class="input" value="${v.dataEntrada || Utils.todayIso()}" required>
          </div>
          <div>
            <label class="label">Cliente</label>
            <input type="text" id="vf-cliente" class="input" value="${v.cliente ? Utils.escapeHtml(v.cliente) : ''}" placeholder="Nome do cliente">
          </div>
        </div>
        <div>
          <label class="label">Peça vendida</label>
          <input type="text" id="vf-peca" class="input" value="${v.pecaVendida ? Utils.escapeHtml(v.pecaVendida) : ''}" placeholder="Ex: Bolsa LV Speedy">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Fornecedora</label>
            <input type="text" id="vf-fornecedora" class="input" value="${v.fornecedora ? Utils.escapeHtml(v.fornecedora) : ''}" placeholder="Nome de quem consignou">
          </div>
          <div>
            <label class="label">CPF/CNPJ da fornecedora</label>
            <input type="text" id="vf-doc" class="input" value="${v.docFornecedora ? Utils.escapeHtml(v.docFornecedora) : ''}" placeholder="Para emissão da NF">
          </div>
        </div>
        <div>
          <label class="label">CEP da fornecedora</label>
          <input type="text" id="vf-cep" class="input" value="${v.cep ? Utils.escapeHtml(v.cep) : ''}" placeholder="Opcional">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Valor da venda (R$)</label>
            <input type="text" inputmode="decimal" id="vf-venda" class="input" value="${v.valorVenda != null ? String(v.valorVenda).replace('.', ',') : ''}" required placeholder="0,00">
          </div>
          <div>
            <label class="label">Custo (repasse à fornecedora)</label>
            <input type="text" inputmode="decimal" id="vf-custo" class="input" value="${v.custo != null ? String(v.custo).replace('.', ',') : ''}" required placeholder="0,00">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Valor da nota (comissão)</label>
            <input type="text" inputmode="decimal" id="vf-nota" class="input" value="${v.valorNota != null ? String(v.valorNota).replace('.', ',') : ''}" placeholder="Calculado automaticamente">
          </div>
          <div>
            <label class="label">Nº da nota fiscal</label>
            <input type="text" id="vf-nf" class="input" value="${v.numeroNF ? Utils.escapeHtml(v.numeroNF) : ''}" placeholder="Preencher após emitir">
          </div>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">${editando ? 'Salvar alterações' : 'Adicionar venda'}</button>
          <button type="button" id="btn-cancel-venda" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);

    let notaEditadaManualmente = editando && v.valorNota != null;
    const inputNota = document.getElementById('vf-nota');
    inputNota.addEventListener('input', () => { notaEditadaManualmente = true; });
    function recalcularComissao() {
      if (notaEditadaManualmente) return;
      const venda = Utils.parseCurrency(document.getElementById('vf-venda').value);
      const custo = Utils.parseCurrency(document.getElementById('vf-custo').value);
      if (venda || custo) inputNota.value = String(Math.round((venda - custo) * 100) / 100).replace('.', ',');
    }
    document.getElementById('vf-venda').addEventListener('input', recalcularComissao);
    document.getElementById('vf-custo').addEventListener('input', recalcularComissao);

    document.getElementById('btn-cancel-venda').addEventListener('click', App.closeModal);
    document.getElementById('form-venda').addEventListener('submit', (e) => {
      e.preventDefault();
      const dados = {
        dataEntrada: document.getElementById('vf-data').value,
        cliente: document.getElementById('vf-cliente').value.trim(),
        pecaVendida: document.getElementById('vf-peca').value.trim(),
        fornecedora: document.getElementById('vf-fornecedora').value.trim(),
        docFornecedora: document.getElementById('vf-doc').value.trim(),
        cep: document.getElementById('vf-cep').value.trim(),
        valorVenda: Utils.parseCurrency(document.getElementById('vf-venda').value),
        custo: Utils.parseCurrency(document.getElementById('vf-custo').value),
        valorNota: Utils.parseCurrency(document.getElementById('vf-nota').value),
        numeroNF: document.getElementById('vf-nf').value.trim(),
      };
      if (editando) {
        Store.updateVenda(venda.id, dados);
        App.toast('Venda atualizada!');
      } else {
        Store.addVenda(dados);
        App.toast('Venda registrada!');
      }
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  return { render };
})();
