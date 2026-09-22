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
        <div class="flex gap-2">
          <label class="btn-secondary cursor-pointer">
            ⬆️ Importar extrato (CSV)
            <input type="file" id="input-csv" accept=".csv,text/csv" class="hidden">
          </label>
          <button id="btn-auto" class="btn-primary">🔗 Conciliar automaticamente</button>
        </div>
      </div>

      <p class="text-sm text-ink/60 mb-4">Exporte o extrato do seu banco em CSV (data, descrição e valor) e importe aqui. Depois, vincule cada linha do extrato ao lançamento correspondente — ou deixe o app tentar casar automaticamente pela data e valor.</p>

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

  function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { linhas, erros } = CsvImport.parse(reader.result);
      if (linhas.length > 0) {
        Store.addExtratoLinhas(linhas);
        App.toast(`${linhas.length} linha(s) importada(s)!`);
        App.renderView('conciliacao');
      }
      if (erros.length > 0) {
        App.toast(`${erros.length} linha(s) não puderam ser lidas. Verifique o arquivo.`, 'error');
      }
      if (linhas.length === 0 && erros.length === 0) {
        App.toast('Nenhum dado encontrado no arquivo.', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function conciliarAutomatico(container) {
    const state = Store.getState();
    const extratoPendente = state.extratoImportado.filter(e => !e.conciliadoComLancamentoId);
    const lancDisponiveis = state.lancamentos.filter(l => !l.conciliado);
    let count = 0;
    extratoPendente.forEach(e => {
      const candidato = lancDisponiveis.find(l =>
        !l.conciliado &&
        l.data === e.data &&
        Math.abs(Math.abs(l.valor) - Math.abs(e.valor)) < 0.01
      );
      if (candidato) {
        Store.conciliar(e.id, candidato.id);
        count++;
      }
    });
    App.toast(count > 0 ? `${count} conciliação(ões) feita(s) automaticamente!` : 'Nenhum par exato (mesma data e valor) foi encontrado.', count > 0 ? undefined : 'error');
    render(container);
  }

  return { render };
})();
