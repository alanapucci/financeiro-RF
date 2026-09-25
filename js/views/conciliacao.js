const ViewConciliacao = (() => {
  let selExtrato = null;
  let selLancamento = null;

  function render(container) {
    const state = Store.getState();
    const extratoPendente = state.extratoImportado.filter(e => !e.conciliadoComLancamentoId)
      .sort((a, b) => b.data.localeCompare(a.data));
    const lancPendentes = state.lancamentos.filter(l => !l.conciliado)
      .sort((a, b) => b.data.localeCompare(a.data));

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 class="font-heading font-bold text-2xl text-forest-800">Conciliação bancária</h2>
        <div class="flex flex-wrap gap-2">
          <label class="btn-secondary cursor-pointer">
            ⬆️ Importar extrato (CSV)
            <input type="file" id="input-csv" accept=".csv,text/csv" class="hidden">
          </label>
          <button id="btn-regras" class="btn-secondary">🏷️ Regras (${state.regras.length})</button>
          <button id="btn-auto" class="btn-primary">🔗 Conciliar automaticamente</button>
        </div>
      </div>

      <p class="text-sm text-ink/60 mb-4">Exporte o extrato do seu banco em CSV (data, descrição e valor) e importe aqui. Depois, vincule cada linha do extrato ao lançamento correspondente, ou deixe o app tentar casar automaticamente pela data (até 3 dias de diferença) e valor. Clique em 🏷️ numa linha do extrato para ensinar o app a categorizar sozinho sempre que aquele texto aparecer de novo.</p>

      <div id="conc-actions" class="hidden card mb-4 flex flex-wrap items-center gap-3 bg-forest/5 border-forest/30">
        <span class="text-sm font-semibold text-forest-800">1 item do extrato + 1 lançamento selecionados</span>
        <button id="btn-vincular" class="btn-primary">Vincular selecionados</button>
        <button id="btn-limpar-sel" class="btn-secondary">Limpar seleção</button>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <div class="card p-0 overflow-hidden">
          <h3 class="font-semibold text-ink px-4 pt-4 pb-2">Extrato importado (${extratoPendente.length} pendente${extratoPendente.length === 1 ? '' : 's'})</h3>
          <div class="table-scroll max-h-[480px] overflow-y-auto">
          <table class="data-table px-4">
            <thead><tr><th class="pl-4">Data</th><th>Descrição</th><th>Valor</th><th class="pr-4"></th></tr></thead>
            <tbody>
              ${extratoPendente.length === 0 ? `<tr><td colspan="4" class="text-center text-ink/50 py-6">Nada pendente.</td></tr>` : extratoPendente.map(e => `
                <tr class="cursor-pointer ${selExtrato === e.id ? 'bg-forest/10' : ''}" data-sel-extrato="${e.id}">
                  <td class="pl-4">${Utils.formatDate(e.data)}</td>
                  <td>${Utils.escapeHtml(e.descricao)}</td>
                  <td class="font-semibold ${e.valor >= 0 ? 'text-forest-700' : 'text-rose-600'}">${Utils.formatCurrency(e.valor)}</td>
                  <td class="pr-4 text-right whitespace-nowrap">
                    <button class="btn-icon" data-nova-regra="${e.id}" title="Criar regra de categorização a partir deste texto">🏷️</button>
                    <button class="btn-icon" data-quick-add="${e.id}" title="Criar lançamento a partir desta linha">➕</button>
                    <button class="btn-icon" data-del-extrato="${e.id}" title="Remover linha">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          </div>
        </div>

        <div class="card p-0 overflow-hidden">
          <h3 class="font-semibold text-ink px-4 pt-4 pb-2">Lançamentos não conciliados (${lancPendentes.length})</h3>
          <div class="table-scroll max-h-[480px] overflow-y-auto">
          <table class="data-table px-4">
            <thead><tr><th class="pl-4">Data</th><th>Descrição</th><th>Valor</th></tr></thead>
            <tbody>
              ${lancPendentes.length === 0 ? `<tr><td colspan="3" class="text-center text-ink/50 py-6">Nada pendente.</td></tr>` : lancPendentes.map(l => `
                <tr class="cursor-pointer ${selLancamento === l.id ? 'bg-forest/10' : ''}" data-sel-lanc="${l.id}">
                  <td class="pl-4">${Utils.formatDate(l.data)}</td>
                  <td>${Utils.escapeHtml(l.descricao)}</td>
                  <td class="font-semibold ${l.tipo === 'receita' ? 'text-forest-700' : 'text-rose-600'}">${l.tipo === 'receita' ? '+' : '−'} ${Utils.formatCurrency(l.valor)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('input-csv').addEventListener('change', handleCsvImport);
    document.getElementById('btn-auto').addEventListener('click', () => conciliarAutomatico(container));
    document.getElementById('btn-regras').addEventListener('click', () => abrirListaRegras(container));

    container.querySelectorAll('[data-sel-extrato]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selExtrato = selExtrato === row.dataset.selExtrato ? null : row.dataset.selExtrato;
        render(container);
      });
    });
    container.querySelectorAll('[data-sel-lanc]').forEach(row => {
      row.addEventListener('click', () => {
        selLancamento = selLancamento === row.dataset.selLanc ? null : row.dataset.selLanc;
        render(container);
      });
    });
    container.querySelectorAll('[data-del-extrato]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.deleteExtratoLinha(btn.dataset.delExtrato);
        App.toast('Linha removida.');
        render(container);
      });
    });
    container.querySelectorAll('[data-nova-regra]').forEach(btn => {
      btn.addEventListener('click', () => {
        const linha = state.extratoImportado.find(e => e.id === btn.dataset.novaRegra);
        abrirFormRegra(linha, container);
      });
    });
    container.querySelectorAll('[data-quick-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const linha = state.extratoImportado.find(e => e.id === btn.dataset.quickAdd);
        ViewLancamentos.openForm(null, {
          prefill: {
            data: linha.data,
            descricao: linha.descricao,
            valor: Math.abs(linha.valor),
            tipo: linha.valor < 0 ? 'despesa' : 'receita',
          },
          onSaved: (lanc) => {
            Store.conciliar(linha.id, lanc.id);
            App.toast('Lançamento criado e conciliado!');
            App.renderView('conciliacao');
          },
        });
      });
    });

    if (selExtrato && selLancamento) {
      document.getElementById('conc-actions').classList.remove('hidden');
      document.getElementById('conc-actions').classList.add('flex');
      document.getElementById('btn-vincular').addEventListener('click', () => {
        Store.conciliar(selExtrato, selLancamento);
        App.toast('Conciliado com sucesso!');
        selExtrato = null; selLancamento = null;
        render(container);
      });
      document.getElementById('btn-limpar-sel').addEventListener('click', () => {
        selExtrato = null; selLancamento = null;
        render(container);
      });
    }
  }

  // Extratos de banco/cooperativa às vezes vêm em ISO-8859-1 (Latin-1), não UTF-8 — decodifica como
  // UTF-8 e, se aparecer caractere de substituição (sinal de bytes inválidos), tenta de novo em Latin-1.
  // Extratos vêm em codificações variadas (Sicredi em ISO-8859-1, Mercado Pago às vezes em
  // MacRoman...). Tenta UTF-8; se inválido, tenta Windows-1252 e, se essa ainda sobrar bytes que
  // caem em posições não definidas nela (sinal de que era outra coisa), tenta MacRoman.
  function decodificarArquivo(bytes) {
    const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (!utf8.includes('�')) return utf8;

    const win1252 = new TextDecoder('windows-1252').decode(bytes);
    // eslint-disable-next-line no-control-regex
    const temControleInvalido = /[\x80-\x9f]/.test(win1252);
    if (!temControleInvalido) return win1252;

    return new TextDecoder('macintosh').decode(bytes);
  }

  function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const texto = decodificarArquivo(new Uint8Array(reader.result));
      const { linhas, erros } = CsvImport.parse(texto);
      if (linhas.length > 0) {
        Store.addExtratoLinhas(linhas);
        const aplicadas = Store.aplicarRegrasAutomaticas();
        App.toast(`${linhas.length} linha(s) importada(s)!` + (aplicadas > 0 ? ` ${aplicadas} já categorizada(s) por regra.` : ''));
        App.renderView('conciliacao');
      }
      if (erros.length > 0) {
        App.toast(`${erros.length} linha(s) não puderam ser lidas. Verifique o arquivo.`, 'error');
      }
      if (linhas.length === 0 && erros.length === 0) {
        App.toast('Nenhum dado encontrado no arquivo.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  const TOLERANCIA_DIAS = 3;

  function conciliarAutomatico(container) {
    const state = Store.getState();
    // Passo 1: aplica regras de categorização já cadastradas nas linhas ainda sem lançamento.
    const aplicadasPorRegra = Store.aplicarRegrasAutomaticas();

    // Passo 2: casa o que sobrou pelo valor igual e data mais próxima (até TOLERANCIA_DIAS).
    const extratoPendente = state.extratoImportado.filter(e => !e.conciliadoComLancamentoId);
    let countData = 0;
    extratoPendente.forEach(e => {
      const candidatos = state.lancamentos
        .filter(l => !l.conciliado && Math.abs(Math.abs(l.valor) - Math.abs(e.valor)) < 0.01)
        .map(l => ({ l, dist: Utils.diasEntre(l.data, e.data) }))
        .filter(x => x.dist <= TOLERANCIA_DIAS)
        .sort((a, b) => a.dist - b.dist);
      if (candidatos.length > 0) {
        Store.conciliar(e.id, candidatos[0].l.id);
        countData++;
      }
    });

    const total = aplicadasPorRegra + countData;
    App.toast(total > 0
      ? `${total} conciliação(ões) feita(s) automaticamente! (${aplicadasPorRegra} por regra, ${countData} por data/valor)`
      : 'Nada para conciliar automaticamente — tente vincular manualmente ou criar uma regra.', total > 0 ? undefined : 'error');
    render(container);
  }

  // linha: linha de extrato (criação, a partir de 🏷️) — regraExistente: regra já salva (edição)
  function abrirFormRegra(linha, container, regraExistente) {
    const state = Store.getState();
    const editando = !!regraExistente;
    const base = regraExistente || {
      padrao: linha.descricao,
      tipo: linha.valor < 0 ? 'despesa' : 'receita',
      contaId: null,
      descricaoModelo: '',
    };
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-2">${editando ? 'Editar' : 'Criar'} regra de categorização</h3>
      <p class="text-sm text-ink/60 mb-4">Sempre que o texto abaixo aparecer no extrato, o app já cria e concilia o lançamento sozinho, na conta escolhida.</p>
      <form id="form-regra" class="space-y-3">
        <div>
          <label class="label">Texto a reconhecer no extrato</label>
          <input type="text" id="rf-padrao" class="input" required value="${Utils.escapeHtml(base.padrao)}">
          <p class="text-xs text-ink/40 mt-1">Pode encurtar (ex: só "LITHIUM SOFTWARE") para pegar variações do mesmo texto.</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Tipo</label>
            <select id="rf-tipo" class="input">
              <option value="despesa" ${base.tipo === 'despesa' ? 'selected' : ''}>Despesa</option>
              <option value="receita" ${base.tipo === 'receita' ? 'selected' : ''}>Receita</option>
            </select>
          </div>
          <div>
            <label class="label">Categoria</label>
            <select id="rf-categoria" class="input"></select>
          </div>
        </div>
        <div>
          <label class="label">Conta (onde esse pagamento/recebimento cai)</label>
          <select id="rf-conta" class="input">
            ${state.contas.map(c => `<option value="${c.id}" ${base.contaId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.nome)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">Descrição do lançamento (opcional)</label>
          <input type="text" id="rf-descricao" class="input" value="${base.descricaoModelo ? Utils.escapeHtml(base.descricaoModelo) : ''}" placeholder="Deixe em branco para usar o texto do extrato">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1">${editando ? 'Salvar alterações' : 'Criar regra e aplicar agora'}</button>
          <button type="button" id="btn-cancel-regra" class="btn-secondary">Cancelar</button>
        </div>
      </form>
    `);

    function atualizarCategorias() {
      const tipo = document.getElementById('rf-tipo').value;
      document.getElementById('rf-categoria').innerHTML = Utils.optionsCategoriasAgrupadas(Store.categoriasAgrupadas(tipo), base.categoriaId);
    }
    atualizarCategorias();
    document.getElementById('rf-tipo').addEventListener('change', atualizarCategorias);
    document.getElementById('btn-cancel-regra').addEventListener('click', App.closeModal);
    document.getElementById('form-regra').addEventListener('submit', (e) => {
      e.preventDefault();
      const dados = {
        padrao: document.getElementById('rf-padrao').value,
        tipo: document.getElementById('rf-tipo').value,
        categoriaId: document.getElementById('rf-categoria').value,
        contaId: document.getElementById('rf-conta').value,
        descricaoModelo: document.getElementById('rf-descricao').value,
      };
      if (editando) {
        Store.updateRegra(regraExistente.id, dados);
        App.toast('Regra atualizada!');
        App.closeModal();
        render(container);
      } else {
        Store.addRegra(dados);
        const aplicadas = Store.aplicarRegrasAutomaticas();
        App.toast(`Regra criada! ${aplicadas} lançamento(s) categorizado(s) agora.`);
        App.closeModal();
        render(container);
      }
    });
  }

  function abrirListaRegras(container) {
    const state = Store.getState();
    App.openModal(`
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">Regras de categorização automática</h3>
      ${state.regras.length === 0 ? '<p class="text-sm text-ink/50">Nenhuma regra ainda. Crie uma clicando em 🏷️ numa linha do extrato.</p>' : `
      <ul class="divide-y divide-sand/40 max-h-96 overflow-y-auto">
        ${state.regras.map(r => `
          <li class="flex items-center justify-between gap-2 py-2.5 text-sm">
            <div>
              <p class="font-medium">"${Utils.escapeHtml(r.padrao)}"</p>
              <p class="text-xs text-ink/50">${r.tipo === 'despesa' ? 'Despesa' : 'Receita'} → ${Utils.escapeHtml(Store.categoriaNome(r.categoriaId))} · ${Utils.escapeHtml(Store.contaNome(r.contaId))}</p>
            </div>
            <span class="flex gap-1 shrink-0">
              <button class="btn-icon" data-edit-regra="${r.id}" title="Editar regra">✏️</button>
              <button class="btn-icon" data-del-regra="${r.id}" title="Excluir regra">🗑️</button>
            </span>
          </li>
        `).join('')}
      </ul>
      `}
      <button type="button" id="btn-fechar-regras" class="btn-secondary w-full mt-4">Fechar</button>
    `);
    document.getElementById('btn-fechar-regras').addEventListener('click', App.closeModal);
    document.querySelectorAll('[data-edit-regra]').forEach(btn => {
      btn.addEventListener('click', () => {
        const regra = state.regras.find(r => r.id === btn.dataset.editRegra);
        abrirFormRegra(null, container, regra);
      });
    });
    document.querySelectorAll('[data-del-regra]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.deleteRegra(btn.dataset.delRegra);
        App.toast('Regra excluída.');
        App.closeModal();
        render(container);
      });
    });
  }

  return { render };
})();
