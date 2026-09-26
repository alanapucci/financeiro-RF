const ViewCategorias = (() => {
  function render(container) {
    const state = Store.getState();
    const receitas = state.categorias.filter(c => c.tipo === 'receita');
    const categoriasDespesa = state.categorias.filter(c => c.tipo === 'despesa');
    const blocosDespesa = state.grupos
      .filter(g => g.tipo === 'despesa')
      .map(g => ({ grupo: g, categorias: categoriasDespesa.filter(c => c.grupoId === g.id) }));
    const semGrupo = categoriasDespesa.filter(c => !c.grupoId || !state.grupos.some(g => g.id === c.grupoId));
    if (semGrupo.length > 0) blocosDespesa.push({ grupo: null, categorias: semGrupo });

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
            <div class="flex gap-2">
              <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" id="btn-novo-grupo">+ Grupo</button>
              <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" data-add-cat="despesa">+ Categoria</button>
            </div>
          </div>
          <p class="text-xs text-ink/50 mb-3">Organize as despesas em grupos (ex: Custos operacionais, Despesas pessoais) com categorias dentro de cada um.</p>
          <div class="space-y-4">
            ${blocosDespesa.map(bloco => `
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <h4 class="text-xs font-bold uppercase tracking-wide ${bloco.grupo ? 'text-forest-700' : 'text-ink/40'}">
                    ${bloco.grupo ? Utils.escapeHtml(bloco.grupo.nome) : 'Sem grupo'}
                  </h4>
                  ${bloco.grupo ? `<button class="btn-icon" style="width:1.5rem;height:1.5rem" data-del-grupo="${bloco.grupo.id}" title="Excluir grupo (categorias ficam sem grupo)">🗑️</button>` : ''}
                </div>
                <ul class="divide-y divide-sand/40 pl-1">
                  ${bloco.categorias.map(c => catRow(c)).join('') || '<li class="text-xs text-ink/40 py-1.5">Nenhuma categoria ainda.</li>'}
                </ul>
              </div>
            `).join('') || '<p class="text-sm text-ink/50 py-2">Nenhuma cadastrada.</p>'}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-ink">Contas (caixa/banco)</h3>
          <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" id="btn-add-conta">+ Adicionar conta</button>
        </div>
        <ul class="divide-y divide-sand/40">
          ${state.contas.map(c => `
            <li class="flex items-center justify-between py-2 text-sm gap-2">
              <span>${Utils.escapeHtml(c.nome)} <span class="text-ink/40">— saldo inicial ${Utils.formatCurrency(c.saldoInicial)}</span></span>
              <span class="flex gap-1 shrink-0">
                <button class="btn-icon" style="width:1.75rem;height:1.75rem" data-edit-conta="${c.id}" title="Editar">✏️</button>
                <button class="btn-icon" style="width:1.75rem;height:1.75rem" data-del-conta="${c.id}" title="Excluir">🗑️</button>
              </span>
            </li>
          `).join('') || '<li class="text-sm text-ink/50 py-2">Nenhuma cadastrada.</li>'}
        </ul>
      </div>
    `;

    container.querySelectorAll('[data-add-cat]').forEach(btn => {
      btn.addEventListener('click', () => openFormCategoria(btn.dataset.addCat));
    });
    container.querySelectorAll('[data-edit-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = state.categorias.find(c => c.id === btn.dataset.editCat);
        openFormCategoria(cat.tipo, cat);
      });
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
    document.getElementById('btn-novo-grupo').addEventListener('click', () => openFormGrupo());
    container.querySelectorAll('[data-del-grupo]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir este grupo? As categorias dele continuam existindo, só ficam sem grupo.')) {
          Store.deleteGrupo(btn.dataset.delGrupo);
          App.toast('Grupo excluído.');
          render(container);
        }
      });
    });
    document.getElementById('btn-add-conta').addEventListener('click', () => openFormConta());
    container.querySelectorAll('[data-edit-conta]').forEach(btn => {
      btn.addEventListener('click', () => {
        const conta = state.contas.find(c => c.id === btn.dataset.editConta);
        openFormConta(conta);
      });
    });
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
      <li class="flex items-center justify-between py-2 text-sm gap-2">
        <span>${Utils.escapeHtml(c.nome)}</span>
        <span class="flex gap-1 shrink-0">
          <button class="btn-icon" style="width:1.75rem;height:1.75rem" data-edit-cat="${c.id}" title="Editar">✏️</button>
          <button class="btn-icon" style="width:1.75rem;height:1.75rem" data-del-cat="${c.id}" title="Excluir">🗑️</button>
        </span>
      </li>
    `;
  }

  function openFormGrupo() {
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">Novo grupo de despesas</h3>
      <form id="form-grupo" class="space-y-3">
        <div>
          <label class="label">Nome do grupo</label>
          <input type="text" id="gf-nome" class="input" required autofocus placeholder="Ex: Despesas pessoais">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">Criar grupo</button>
          <button type="button" id="btn-cancel-grupo" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);
    document.getElementById('btn-cancel-grupo').addEventListener('click', App.closeModal);
    document.getElementById('form-grupo').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('gf-nome').value.trim();
      if (!nome) return;
      Store.addGrupo(nome, 'despesa');
      App.toast('Grupo criado!');
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  function openFormCategoria(tipo, categoriaExistente) {
    const state = Store.getState();
    const editando = !!categoriaExistente;
    const grupos = state.grupos.filter(g => g.tipo === tipo);
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">${editando ? 'Editar' : 'Nova'} categoria de ${tipo === 'receita' ? 'receita' : 'despesa'}</h3>
      <form id="form-cat" class="space-y-3">
        <div>
          <label class="label">Nome</label>
          <input type="text" id="cf-nome" class="input" required autofocus value="${editando ? Utils.escapeHtml(categoriaExistente.nome) : ''}">
        </div>
        ${grupos.length > 0 ? `
        <div>
          <label class="label">Grupo (opcional)</label>
          <select id="cf-grupo" class="input">
            <option value="">Sem grupo</option>
            ${grupos.map(g => `<option value="${g.id}" ${editando && categoriaExistente.grupoId === g.id ? 'selected' : ''}>${Utils.escapeHtml(g.nome)}</option>`).join('')}
          </select>
        </div>
        ` : ''}
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">${editando ? 'Salvar alterações' : 'Adicionar'}</button>
          <button type="button" id="btn-cancel-cat" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);
    document.getElementById('btn-cancel-cat').addEventListener('click', App.closeModal);
    document.getElementById('form-cat').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('cf-nome').value.trim();
      if (!nome) return;
      const grupoId = grupos.length > 0 ? (document.getElementById('cf-grupo').value || null) : null;
      if (editando) {
        Store.updateCategoria(categoriaExistente.id, { nome, grupoId });
        App.toast('Categoria atualizada!');
      } else {
        Store.addCategoria(nome, tipo, grupoId);
        App.toast('Categoria adicionada!');
      }
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  function openFormConta(contaExistente) {
    const editando = !!contaExistente;
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">${editando ? 'Editar' : 'Nova'} conta</h3>
      ${editando ? '<p class="text-sm text-ink/60 mb-4">Ajuste o saldo inicial se o valor com que a conta começou não estava certo — isso corrige o "Saldo atual" sem mexer nos lançamentos já lançados.</p>' : ''}
      <form id="form-conta" class="space-y-3">
        <div>
          <label class="label">Nome</label>
          <input type="text" id="ctf-nome" class="input" required placeholder="Ex: Conta PJ - Banco X" autofocus value="${editando ? Utils.escapeHtml(contaExistente.nome) : ''}">
        </div>
        <div>
          <label class="label">Saldo inicial (R$)</label>
          <input type="text" inputmode="decimal" id="ctf-saldo" class="input" placeholder="0,00" value="${editando ? String(contaExistente.saldoInicial).replace('.', ',') : ''}">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">${editando ? 'Salvar alterações' : 'Adicionar'}</button>
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
      if (editando) {
        Store.updateConta(contaExistente.id, { nome, saldoInicial: saldo });
        App.toast('Conta atualizada!');
      } else {
        Store.addConta(nome, saldo);
        App.toast('Conta adicionada!');
      }
      App.closeModal();
      App.refreshCurrentView();
    });
  }

  return { render };
})();
