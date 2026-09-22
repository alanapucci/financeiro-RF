const ViewLancamentos = (() => {
  let filtros = { mes: Utils.monthKey(Utils.todayIso()), tipo: '', categoriaId: '', busca: '' };

  function render(container) {
    const state = Store.getState();
    const filtrados = state.lancamentos
      .filter(l => !filtros.mes || Utils.monthKey(l.data) === filtros.mes)
      .filter(l => !filtros.tipo || l.tipo === filtros.tipo)
      .filter(l => !filtros.categoriaId || l.categoriaId === filtros.categoriaId)
      .filter(l => !filtros.busca || l.descricao.toLowerCase().includes(filtros.busca.toLowerCase()))
      .sort((a, b) => b.data.localeCompare(a.data));

    const totalReceitas = filtrados.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const totalDespesas = filtrados.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 class="font-heading font-bold text-2xl text-forest-800">Lançamentos</h2>
        <button id="btn-novo-lanc" class="btn-primary">+ Novo lançamento</button>
      </div>

      <div class="card mb-4">
        <div class="grid sm:grid-cols-4 gap-3">
          <div>
            <label class="label">Mês</label>
            <input type="month" id="f-mes" class="input" value="${filtros.mes}">
          </div>
          <div>
            <label class="label">Tipo</label>
            <select id="f-tipo" class="input">
              <option value="">Todos</option>
              <option value="receita" ${filtros.tipo === 'receita' ? 'selected' : ''}>Receita</option>
              <option value="despesa" ${filtros.tipo === 'despesa' ? 'selected' : ''}>Despesa</option>
            </select>
          </div>
          <div>
            <label class="label">Categoria</label>
            <select id="f-categoria" class="input">
              <option value="">Todas</option>
              ${state.categorias.map(c => `<option value="${c.id}" ${filtros.categoriaId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">Buscar</label>
            <input type="text" id="f-busca" class="input" placeholder="Descrição..." value="${Utils.escapeHtml(filtros.busca)}">
          </div>
        </div>
      </div>

      <div class="flex gap-4 mb-4 text-sm">
        <span class="font-semibold text-forest-700">Receitas: ${Utils.formatCurrency(totalReceitas)}</span>
        <span class="font-semibold text-rose-600">Despesas: ${Utils.formatCurrency(totalDespesas)}</span>
        <span class="font-semibold text-ink/70">Saldo: ${Utils.formatCurrency(totalReceitas - totalDespesas)}</span>
      </div>

      <div class="card p-0 overflow-hidden">
        <div class="table-scroll">
        <table class="data-table px-4">
          <thead><tr>
            <th class="pl-4">Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th>
            <th>Forma pgto</th><th>Valor</th><th>Conciliado</th><th class="pr-4"></th>
          </tr></thead>
          <tbody>
            ${filtrados.length === 0 ? `<tr><td colspan="8" class="text-center text-ink/50 py-6">Nenhum lançamento encontrado.</td></tr>` : filtrados.map(l => `
              <tr>
                <td class="pl-4">${Utils.formatDate(l.data)}</td>
                <td>${Utils.escapeHtml(l.descricao)}</td>
                <td>${Utils.escapeHtml(Store.categoriaNome(l.categoriaId))}</td>
                <td>${Utils.escapeHtml(Store.contaNome(l.contaId))}</td>
                <td>${Utils.escapeHtml(l.formaPagamento || '—')}</td>
                <td class="font-semibold ${l.tipo === 'receita' ? 'text-forest-700' : 'text-rose-600'}">${l.tipo === 'receita' ? '+' : '−'} ${Utils.formatCurrency(l.valor)}</td>
                <td>${l.conciliado ? '<span class="badge badge-green">✓ Sim</span>' : '<span class="badge badge-gray">Não</span>'}</td>
                <td class="pr-4 text-right whitespace-nowrap">
                  <button class="btn-icon" data-edit="${l.id}" title="Editar">✏️</button>
                  <button class="btn-icon" data-del="${l.id}" title="Excluir">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>
    `;

    document.getElementById('btn-novo-lanc').addEventListener('click', () => openForm());
    document.getElementById('f-mes').addEventListener('change', e => { filtros.mes = e.target.value; render(container); });
    document.getElementById('f-tipo').addEventListener('change', e => { filtros.tipo = e.target.value; render(container); });
    document.getElementById('f-categoria').addEventListener('change', e => { filtros.categoriaId = e.target.value; render(container); });
    document.getElementById('f-busca').addEventListener('input', Utils.debounce(e => { filtros.busca = e.target.value; render(container); }, 300));

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openForm(state.lancamentos.find(l => l.id === btn.dataset.edit)));
    });
    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir este lançamento?')) {
          Store.deleteLancamento(btn.dataset.del);
          App.toast('Lançamento excluído.');
          render(container);
        }
      });
    });
  }

  function categoriasPorTipo(state, tipo) {
    return state.categorias.filter(c => c.tipo === tipo);
  }

  function openForm(lancamento, options) {
    options = options || {};
    const prefill = options.prefill || {};
    const base = lancamento || prefill;
    const state = Store.getState();
    const editando = !!lancamento;
    const tipoInicial = base.tipo || 'despesa';

    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">${editando ? 'Editar' : 'Novo'} lançamento</h3>
      <form id="form-lanc" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Tipo</label>
            <select id="lf-tipo" class="input">
              <option value="despesa" ${tipoInicial === 'despesa' ? 'selected' : ''}>Despesa</option>
              <option value="receita" ${tipoInicial === 'receita' ? 'selected' : ''}>Receita</option>
            </select>
          </div>
          <div>
            <label class="label">Data</label>
            <input type="date" id="lf-data" class="input" value="${base.data || Utils.todayIso()}" required>
          </div>
        </div>
        <div>
          <label class="label">Descrição</label>
          <input type="text" id="lf-descricao" class="input" value="${base.descricao ? Utils.escapeHtml(base.descricao) : ''}" required placeholder="Ex: Venda de peças na loja">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Categoria</label>
            <select id="lf-categoria" class="input"></select>
          </div>
          <div>
            <label class="label">Conta</label>
            <select id="lf-conta" class="input">
              ${state.contas.map(c => `<option value="${c.id}" ${base.contaId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.nome)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Valor (R$)</label>
            <input type="text" inputmode="decimal" id="lf-valor" class="input" value="${base.valor != null ? String(base.valor).replace('.', ',') : ''}" required placeholder="0,00">
          </div>
          <div>
            <label class="label">Forma de pagamento</label>
            <select id="lf-forma" class="input">
              ${state.formasPagamento.map(f => `<option value="${f}" ${base.formaPagamento === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink/70 mt-1">
          <input type="checkbox" id="lf-conciliado" ${base.conciliado ? 'checked' : ''}> Já conciliado com o extrato bancário
        </label>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">${editando ? 'Salvar alterações' : 'Adicionar lançamento'}</button>
          <button type="button" id="btn-cancel-lanc" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);

    function atualizarCategorias() {
      const tipo = document.getElementById('lf-tipo').value;
      const cats = categoriasPorTipo(state, tipo);
      document.getElementById('lf-categoria').innerHTML = cats.map(c =>
        `<option value="${c.id}" ${base.categoriaId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.nome)}</option>`
      ).join('');
    }
    atualizarCategorias();
    document.getElementById('lf-tipo').addEventListener('change', atualizarCategorias);
    document.getElementById('btn-cancel-lanc').addEventListener('click', App.closeModal);

    document.getElementById('form-lanc').addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = Utils.parseCurrency(document.getElementById('lf-valor').value);
      if (!valor || valor <= 0) { App.toast('Informe um valor válido.', 'error'); return; }
      const dados = {
        tipo: document.getElementById('lf-tipo').value,
        data: document.getElementById('lf-data').value,
        descricao: document.getElementById('lf-descricao').value.trim(),
        categoriaId: document.getElementById('lf-categoria').value,
        contaId: document.getElementById('lf-conta').value,
        valor,
        formaPagamento: document.getElementById('lf-forma').value,
        conciliado: document.getElementById('lf-conciliado').checked,
      };
      let salvo;
      if (editando) {
        salvo = Store.updateLancamento(lancamento.id, dados);
        App.toast('Lançamento atualizado!');
      } else {
        salvo = Store.addLancamento(dados);
        App.toast('Lançamento adicionado!');
      }
      App.closeModal();
      App.refreshCurrentView();
      if (options.onSaved) options.onSaved(salvo);
    });
  }

  return { render, openForm };
})();
