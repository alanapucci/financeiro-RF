const ViewContas = (() => {
  let filtroTipo = '';
  let filtroStatus = '';

  function statusParcela(parcela) {
    if (parcela.status === 'pago') return 'pago';
    return parcela.vencimento < Utils.todayIso() ? 'atrasada' : 'pendente';
  }

  function listarParcelas(state) {
    const linhas = [];
    state.parcelamentos.forEach(p => {
      p.parcelas.forEach(parc => {
        linhas.push({ parcelamento: p, parcela: parc, status: statusParcela(parc) });
      });
    });
    return linhas
      .filter(l => !filtroTipo || l.parcelamento.tipo === filtroTipo)
      .filter(l => !filtroStatus || l.status === filtroStatus)
      .sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento));
  }

  function render(container) {
    const state = Store.getState();
    const linhas = listarParcelas(state);
    const pendentesPagar = state.parcelamentos.flatMap(p => p.parcelas.filter(pc => pc.status === 'pendente' && p.tipo === 'pagar')).reduce((s, pc) => s + pc.valor, 0);
    const pendentesReceber = state.parcelamentos.flatMap(p => p.parcelas.filter(pc => pc.status === 'pendente' && p.tipo === 'receber')).reduce((s, pc) => s + pc.valor, 0);

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 class="font-heading font-bold text-2xl text-forest-800">Contas a pagar/receber</h2>
        <button id="btn-novo-parc" class="btn-primary">+ Novo (com parcelas)</button>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-5">
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Total a pagar (pendente)</p>
          <p class="text-lg font-bold text-rose-600">${Utils.formatCurrency(pendentesPagar)}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Total a receber (pendente)</p>
          <p class="text-lg font-bold text-forest-700">${Utils.formatCurrency(pendentesReceber)}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <select id="c-tipo" class="input w-auto">
          <option value="">Todos os tipos</option>
          <option value="pagar" ${filtroTipo === 'pagar' ? 'selected' : ''}>A pagar</option>
          <option value="receber" ${filtroTipo === 'receber' ? 'selected' : ''}>A receber</option>
        </select>
        <select id="c-status" class="input w-auto">
          <option value="">Todos os status</option>
          <option value="pendente" ${filtroStatus === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="atrasada" ${filtroStatus === 'atrasada' ? 'selected' : ''}>Atrasada</option>
          <option value="pago" ${filtroStatus === 'pago' ? 'selected' : ''}>Pago</option>
        </select>
      </div>

      <div class="card p-0 overflow-hidden mb-6">
        <div class="table-scroll">
        <table class="data-table px-4">
          <thead><tr>
            <th class="pl-4">Vencimento</th><th>Descrição</th><th>Pessoa</th><th>Tipo</th><th>Valor</th><th>Status</th><th class="pr-4"></th>
          </tr></thead>
          <tbody>
            ${linhas.length === 0 ? `<tr><td colspan="7" class="text-center text-ink/50 py-6">Nada encontrado.</td></tr>` : linhas.map(({ parcelamento: p, parcela, status }) => `
              <tr>
                <td class="pl-4">${Utils.formatDate(parcela.vencimento)}</td>
                <td>${Utils.escapeHtml(p.descricao)} <span class="text-ink/40">(${parcela.numero}/${p.numParcelas})</span></td>
                <td>${Utils.escapeHtml(p.pessoa || '—')}</td>
                <td><span class="badge ${p.tipo === 'pagar' ? 'badge-red' : 'badge-green'}">${p.tipo === 'pagar' ? 'A pagar' : 'A receber'}</span></td>
                <td class="font-semibold">${Utils.formatCurrency(parcela.valor)}</td>
                <td>${status === 'pago' ? '<span class="badge badge-green">✓ Pago</span>' : status === 'atrasada' ? '<span class="badge badge-amber">Atrasada</span>' : '<span class="badge badge-gray">Pendente</span>'}</td>
                <td class="pr-4 text-right whitespace-nowrap">
                  ${status === 'pago'
                    ? `<button class="btn-icon" data-estornar="${p.id}|${parcela.numero}" title="Estornar pagamento">↩️</button>`
                    : `<button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" data-pagar="${p.id}|${parcela.numero}">Marcar como pago</button>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>

      <h3 class="font-semibold text-ink mb-3">Parcelamentos cadastrados</h3>
      <div class="grid sm:grid-cols-2 gap-3">
        ${state.parcelamentos.length === 0 ? '<p class="text-sm text-ink/50">Nenhum cadastrado ainda.</p>' : state.parcelamentos.map(p => {
          const pagas = p.parcelas.filter(pc => pc.status === 'pago').length;
          return `
          <div class="card flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-sm">${Utils.escapeHtml(p.descricao)}</p>
              <p class="text-xs text-ink/50">${Utils.escapeHtml(p.pessoa || '—')} · ${pagas}/${p.numParcelas} parcelas pagas · ${Utils.formatCurrency(p.valorTotal)}</p>
            </div>
            <button class="btn-icon" data-del-parc="${p.id}" title="Excluir parcelamento inteiro">🗑️</button>
          </div>
        `;
        }).join('')}
      </div>
    `;

    document.getElementById('btn-novo-parc').addEventListener('click', () => openFormParcelamento());
    document.getElementById('c-tipo').addEventListener('change', e => { filtroTipo = e.target.value; render(container); });
    document.getElementById('c-status').addEventListener('change', e => { filtroStatus = e.target.value; render(container); });

    container.querySelectorAll('[data-pagar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [parcId, numero] = btn.dataset.pagar.split('|');
        openFormPagamento(parcId, Number(numero));
      });
    });
    container.querySelectorAll('[data-estornar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [parcId, numero] = btn.dataset.estornar.split('|');
        if (confirm('Estornar este pagamento? O lançamento vinculado será removido.')) {
          Store.estornarParcela(parcId, Number(numero));
          App.toast('Pagamento estornado.');
          render(container);
        }
      });
    });
    container.querySelectorAll('[data-del-parc]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir este parcelamento e todos os lançamentos gerados por ele?')) {
          Store.deleteParcelamento(btn.dataset.delParc);
          App.toast('Parcelamento excluído.');
          render(container);
        }
      });
    });
  }

  function openFormParcelamento() {
    const state = Store.getState();
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">Nova conta com parcelas</h3>
      <form id="form-parc" class="space-y-3">
        <div>
          <label class="label">Tipo</label>
          <select id="pf-tipo" class="input">
            <option value="pagar">A pagar (despesa)</option>
            <option value="receber">A receber (receita)</option>
          </select>
        </div>
        <div>
          <label class="label">Descrição</label>
          <input type="text" id="pf-descricao" class="input" required placeholder="Ex: Aluguel da loja, Compra de estoque...">
        </div>
        <div>
          <label class="label">Fornecedor / Cliente</label>
          <input type="text" id="pf-pessoa" class="input" placeholder="Opcional">
        </div>
        <div>
          <label class="label">Categoria</label>
          <select id="pf-categoria" class="input"></select>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="label">Valor total (R$)</label>
            <input type="text" inputmode="decimal" id="pf-valor" class="input" required placeholder="0,00">
          </div>
          <div>
            <label class="label">Nº parcelas</label>
            <input type="number" id="pf-parcelas" class="input" min="1" value="1" required>
          </div>
          <div>
            <label class="label">1ª parcela em</label>
            <input type="date" id="pf-data" class="input" value="${Utils.todayIso()}" required>
          </div>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">Criar</button>
          <button type="button" id="btn-cancel-parc" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);

    function atualizarCategorias() {
      const tipo = document.getElementById('pf-tipo').value === 'pagar' ? 'despesa' : 'receita';
      const cats = state.categorias.filter(c => c.tipo === tipo);
      document.getElementById('pf-categoria').innerHTML = cats.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.nome)}</option>`).join('');
    }
    atualizarCategorias();
    document.getElementById('pf-tipo').addEventListener('change', atualizarCategorias);
    document.getElementById('btn-cancel-parc').addEventListener('click', App.closeModal);

    document.getElementById('form-parc').addEventListener('submit', (e) => {
      e.preventDefault();
      const valorTotal = Utils.parseCurrency(document.getElementById('pf-valor').value);
      const numParcelas = parseInt(document.getElementById('pf-parcelas').value, 10);
      if (!valorTotal || valorTotal <= 0) { App.toast('Informe um valor válido.', 'error'); return; }
      if (!numParcelas || numParcelas < 1) { App.toast('Informe um número de parcelas válido.', 'error'); return; }
      Store.addParcelamento({
        descricao: document.getElementById('pf-descricao').value.trim(),
        tipo: document.getElementById('pf-tipo').value,
        pessoa: document.getElementById('pf-pessoa').value.trim(),
        categoriaId: document.getElementById('pf-categoria').value,
        contaId: state.contas[0] ? state.contas[0].id : null,
        valorTotal,
        numParcelas,
        dataPrimeiraParcela: document.getElementById('pf-data').value,
      });
      App.toast('Conta cadastrada!');
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  function openFormPagamento(parcelamentoId, numero) {
    const state = Store.getState();
    const parc = state.parcelamentos.find(p => p.id === parcelamentoId);
    const parcela = parc.parcelas.find(p => p.numero === numero);
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-2">Marcar como pago</h3>
      <p class="text-sm text-ink/60 mb-4">${Utils.escapeHtml(parc.descricao)} — parcela ${numero}/${parc.numParcelas} — ${Utils.formatCurrency(parcela.valor)}</p>
      <form id="form-pagto" class="space-y-3">
        <div>
          <label class="label">Data do pagamento</label>
          <input type="date" id="pg-data" class="input" value="${Utils.todayIso()}" required>
        </div>
        <div>
          <label class="label">Conta</label>
          <select id="pg-conta" class="input">
            ${state.contas.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.nome)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">Forma de pagamento</label>
          <select id="pg-forma" class="input">
            ${state.formasPagamento.map(f => `<option value="${f}">${f}</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">Confirmar pagamento</button>
          <button type="button" id="btn-cancel-pg" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);
    document.getElementById('btn-cancel-pg').addEventListener('click', App.closeModal);
    document.getElementById('form-pagto').addEventListener('submit', (e) => {
      e.preventDefault();
      Store.pagarParcela(parcelamentoId, numero, {
        dataPagamento: document.getElementById('pg-data').value,
        contaId: document.getElementById('pg-conta').value,
        formaPagamento: document.getElementById('pg-forma').value,
      });
      App.toast('Pagamento registrado e lançamento criado!');
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  return { render };
})();
