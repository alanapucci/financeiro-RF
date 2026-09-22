const ViewCategorias = (() => {
  function render(container) {
    const state = Store.getState();
    const receitas = state.categorias.filter(c => c.tipo === 'receita');
    const despesas = state.categorias.filter(c => c.tipo === 'despesa');

    container.innerHTML = `
      <h2 class="font-heading font-bold text-2xl text-forest-800 mb-5">Categorias e contas</h2>

      <div class="grid lg:grid-cols-2 gap-4 mb-6">
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-ink">Categorias de receita</h3>
            <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" data-add-cat="receita">+ Adicionar</button>
          </div>
          <ul class="divide-y divide-sand/40">
            ${receitas.map(c => catRow(c)).join('') || '<li class="text-sm text-ink/50 py-2">Nenhuma cadastrada.</li>'}
          </ul>
        </div>
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-ink">Categorias de despesa</h3>
            <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" data-add-cat="despesa">+ Adicionar</button>
          </div>
          <ul class="divide-y divide-sand/40">
            ${despesas.map(c => catRow(c)).join('') || '<li class="text-sm text-ink/50 py-2">Nenhuma cadastrada.</li>'}
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-ink">Contas (caixa/banco)</h3>
          <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" id="btn-add-conta">+ Adicionar conta</button>
        </div>
        <ul class="divide-y divide-sand/40">
          ${state.contas.map(c => `
            <li class="flex items-center justify-between py-2 text-sm">
              <span>${Utils.escapeHtml(c.nome)} <span class="text-ink/40">— saldo inicial ${Utils.formatCurrency(c.saldoInicial)}</span></span>
              <button class="btn-icon" data-del-conta="${c.id}" title="Excluir">🗑️</button>
            </li>
          `).join('') || '<li class="text-sm text-ink/50 py-2">Nenhuma cadastrada.</li>'}
        </ul>
      </div>
    `;

    container.querySelectorAll('[data-add-cat]').forEach(btn => {
      btn.addEventListener('click', () => openFormCategoria(btn.dataset.addCat));
    });
    container.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir esta categoria? Lançamentos existentes que a usam não serão apagados, mas ficarão sem categoria.')) {
          Store.deleteCategoria(btn.dataset.delCat);
          App.toast('Categoria excluída.');
          render(container);
        }
      });
    });
    document.getElementById('btn-add-conta').addEventListener('click', openFormConta);
    container.querySelectorAll('[data-del-conta]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir esta conta?')) {
          Store.deleteConta(btn.dataset.delConta);
          App.toast('Conta excluída.');
          render(container);
        }
      });
    });
  }

  function catRow(c) {
    return `
      <li class="flex items-center justify-between py-2 text-sm">
        <span>${Utils.escapeHtml(c.nome)}</span>
        <button class="btn-icon" data-del-cat="${c.id}" title="Excluir">🗑️</button>
      </li>
    `;
  }

  function openFormCategoria(tipo) {
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">Nova categoria de ${tipo === 'receita' ? 'receita' : 'despesa'}</h3>
      <form id="form-cat" class="space-y-3">
        <div>
          <label class="label">Nome</label>
          <input type="text" id="cf-nome" class="input" required autofocus>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">Adicionar</button>
          <button type="button" id="btn-cancel-cat" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);
    document.getElementById('btn-cancel-cat').addEventListener('click', App.closeModal);
    document.getElementById('form-cat').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('cf-nome').value.trim();
      if (!nome) return;
      Store.addCategoria(nome, tipo);
      App.toast('Categoria adicionada!');
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  function openFormConta() {
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">Nova conta</h3>
      <form id="form-conta" class="space-y-3">
        <div>
          <label class="label">Nome</label>
          <input type="text" id="ctf-nome" class="input" required placeholder="Ex: Conta PJ - Banco X" autofocus>
        </div>
        <div>
          <label class="label">Saldo inicial (R$)</label>
          <input type="text" inputmode="decimal" id="ctf-saldo" class="input" placeholder="0,00">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">Adicionar</button>
          <button type="button" id="btn-cancel-conta" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);
    document.getElementById('btn-cancel-conta').addEventListener('click', App.closeModal);
    document.getElementById('form-conta').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('ctf-nome').value.trim();
      if (!nome) return;
      const saldo = Utils.parseCurrency(document.getElementById('ctf-saldo').value);
      Store.addConta(nome, saldo);
      App.toast('Conta adicionada!');
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  return { render };
})();
