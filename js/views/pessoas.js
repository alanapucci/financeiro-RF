// Cadastro de fornecedores e clientes: nome + CPF/CNPJ para consulta rápida na emissão de nota fiscal.
const ViewPessoas = (() => {
  let busca = '';

  function render(container) {
    const state = Store.getState();
    const filtro = p => !busca || `${p.nome} ${p.docNumero || ''}`.toLowerCase().includes(busca.toLowerCase());
    const fornecedores = state.pessoas.filter(p => p.tipo === 'fornecedor').filter(filtro).sort((a, b) => a.nome.localeCompare(b.nome));
    const clientes = state.pessoas.filter(p => p.tipo === 'cliente').filter(filtro).sort((a, b) => a.nome.localeCompare(b.nome));

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 class="font-heading font-bold text-2xl text-forest-800">Fornecedores e clientes</h2>
      </div>
      <p class="text-sm text-ink/60 mb-4">Cadastro de nome e CPF/CNPJ para consultar rápido na hora de emitir nota fiscal ou fechar repasse com uma consignante.</p>

      <div class="card mb-4">
        <label class="label">Buscar</label>
        <input type="text" id="p-busca" class="input" placeholder="Nome ou CPF/CNPJ..." value="${Utils.escapeHtml(busca)}">
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <div class="card p-0 overflow-hidden">
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 class="font-semibold text-ink">🏷️ Fornecedoras/Consignantes (${fornecedores.length})</h3>
            <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" data-add="fornecedor">+ Adicionar</button>
          </div>
          <ul class="divide-y divide-sand/40 px-4 pb-2">
            ${fornecedores.map(p => pessoaRow(p)).join('') || '<li class="text-sm text-ink/50 py-3">Nenhuma cadastrada ainda.</li>'}
          </ul>
        </div>

        <div class="card p-0 overflow-hidden">
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 class="font-semibold text-ink">🙋 Clientes (${clientes.length})</h3>
            <button class="btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.75rem" data-add="cliente">+ Adicionar</button>
          </div>
          <ul class="divide-y divide-sand/40 px-4 pb-2">
            ${clientes.map(p => pessoaRow(p)).join('') || '<li class="text-sm text-ink/50 py-3">Nenhum cadastrado ainda.</li>'}
          </ul>
        </div>
      </div>
    `;

    document.getElementById('p-busca').addEventListener('input', Utils.debounce(e => {
      busca = e.target.value;
      render(container);
      Utils.refocus('p-busca');
    }, 300));

    container.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => openForm(btn.dataset.add, null, container));
    });
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pessoa = state.pessoas.find(p => p.id === btn.dataset.edit);
        openForm(pessoa.tipo, pessoa, container);
      });
    });
    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir este cadastro?')) {
          Store.deletePessoa(btn.dataset.del);
          App.toast('Excluído.');
          render(container);
        }
      });
    });
  }

  function pessoaRow(p) {
    const linha2 = [p.docNumero, p.telefone].filter(Boolean).join(' · ');
    return `
      <li class="flex items-center justify-between gap-2 py-2.5 text-sm">
        <div class="min-w-0">
          <p class="font-medium truncate">${Utils.escapeHtml(p.nome)}</p>
          ${linha2 ? `<p class="text-xs text-ink/50">${Utils.escapeHtml(linha2)}</p>` : ''}
        </div>
        <span class="flex gap-1 shrink-0">
          <button class="btn-icon" style="width:1.75rem;height:1.75rem" data-edit="${p.id}" title="Editar">✏️</button>
          <button class="btn-icon" style="width:1.75rem;height:1.75rem" data-del="${p.id}" title="Excluir">🗑️</button>
        </span>
      </li>
    `;
  }

  function openForm(tipo, pessoaExistente, container) {
    const editando = !!pessoaExistente;
    const p = pessoaExistente || {};
    const rotulo = tipo === 'fornecedor' ? 'fornecedora/consignante' : 'cliente';
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">${editando ? 'Editar' : 'Novo(a)'} ${rotulo}</h3>
      <form id="form-pessoa" class="space-y-3">
        <div>
          <label class="label">Nome completo / Razão social</label>
          <input type="text" id="pf-nome" class="input" required autofocus value="${p.nome ? Utils.escapeHtml(p.nome) : ''}">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">CPF/CNPJ</label>
            <input type="text" id="pf-doc" class="input" placeholder="000.000.000-00" value="${p.docNumero ? Utils.escapeHtml(p.docNumero) : ''}">
          </div>
          <div>
            <label class="label">Telefone</label>
            <input type="text" id="pf-telefone" class="input" placeholder="(00) 00000-0000" value="${p.telefone ? Utils.escapeHtml(p.telefone) : ''}">
          </div>
        </div>
        <div>
          <label class="label">E-mail</label>
          <input type="email" id="pf-email" class="input" value="${p.email ? Utils.escapeHtml(p.email) : ''}">
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="label">CEP</label>
            <input type="text" id="pf-cep" class="input" placeholder="00000-000" value="${p.cep ? Utils.escapeHtml(p.cep) : ''}">
          </div>
          <div class="col-span-2">
            <label class="label">Endereço</label>
            <input type="text" id="pf-endereco" class="input" placeholder="Rua, número, bairro, cidade" value="${p.endereco ? Utils.escapeHtml(p.endereco) : ''}">
          </div>
        </div>
        <div>
          <label class="label">Observações</label>
          <input type="text" id="pf-obs" class="input" placeholder="Opcional" value="${p.observacao ? Utils.escapeHtml(p.observacao) : ''}">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">${editando ? 'Salvar alterações' : 'Adicionar'}</button>
          <button type="button" id="btn-cancel-pessoa" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);
    document.getElementById('btn-cancel-pessoa').addEventListener('click', App.closeModal);
    document.getElementById('form-pessoa').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('pf-nome').value.trim();
      if (!nome) return;
      const dados = {
        tipo,
        nome,
        docNumero: document.getElementById('pf-doc').value.trim(),
        telefone: document.getElementById('pf-telefone').value.trim(),
        email: document.getElementById('pf-email').value.trim(),
        cep: document.getElementById('pf-cep').value.trim(),
        endereco: document.getElementById('pf-endereco').value.trim(),
        observacao: document.getElementById('pf-obs').value.trim(),
      };
      if (editando) {
        Store.updatePessoa(pessoaExistente.id, dados);
        App.toast('Cadastro atualizado!');
      } else {
        Store.addPessoa(dados);
        App.toast('Cadastro adicionado!');
      }
      App.closeModal();
      render(container);
    });
  }

  return { render };
})();
