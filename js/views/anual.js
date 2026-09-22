const ViewAnual = (() => {
  let anoSelecionado = new Date().getFullYear();
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  function anosDisponiveis(state) {
    const anos = new Set(state.lancamentos.map(l => Number(l.data.slice(0, 4))));
    anos.add(new Date().getFullYear());
    return Array.from(anos).sort((a, b) => b - a);
  }

  // Retorna { categoria: [12 valores], total: [12 valores] }
  function montarMatriz(state, tipo, ano) {
    const categorias = state.categorias.filter(c => c.tipo === tipo);
    const porCategoria = {};
    categorias.forEach(c => { porCategoria[c.id] = new Array(12).fill(0); });
    const totalMensal = new Array(12).fill(0);

    state.lancamentos
      .filter(l => l.tipo === tipo && Number(l.data.slice(0, 4)) === ano)
      .forEach(l => {
        const mes = Number(l.data.slice(5, 7)) - 1;
        if (!porCategoria[l.categoriaId]) porCategoria[l.categoriaId] = new Array(12).fill(0);
        porCategoria[l.categoriaId][mes] += l.valor;
        totalMensal[mes] += l.valor;
      });

    return { categorias, porCategoria, totalMensal };
  }

  function fmtNum(v) {
    if (!v) return '<span class="text-ink/30">0</span>';
    const abs = Math.round(Math.abs(v)).toLocaleString('pt-BR');
    return v < 0 ? `<span class="text-rose-600">(${abs})</span>` : abs;
  }

  function linhaSecao(titulo, valores, totalAno, extraClass) {
    return `
      <tr class="${extraClass || ''}">
        <td class="pl-4 font-bold text-forest-800 sticky left-0 bg-inherit">${titulo}</td>
        ${valores.map(v => `<td class="text-right font-bold">${fmtNum(v)}</td>`).join('')}
        <td class="text-right font-bold pr-4">${fmtNum(totalAno)}</td>
      </tr>
    `;
  }

  function linhaCategoria(nome, valores, totalAno) {
    return `
      <tr>
        <td class="pl-8 text-ink/80 sticky left-0 bg-inherit">${Utils.escapeHtml(nome)}</td>
        ${valores.map(v => `<td class="text-right">${fmtNum(v)}</td>`).join('')}
        <td class="text-right pr-4">${fmtNum(totalAno)}</td>
      </tr>
    `;
  }

  function somaArrays(...arrays) {
    return arrays[0].map((_, i) => arrays.reduce((s, arr) => s + arr[i], 0));
  }

  function render(container) {
    const state = Store.getState();
    const anos = anosDisponiveis(state);
    const receitas = montarMatriz(state, 'receita', anoSelecionado);
    const despesas = montarMatriz(state, 'despesa', anoSelecionado);
    const resultadoMensal = somaArrays(receitas.totalMensal, despesas.totalMensal.map(v => -v));
    const totalReceitasAno = receitas.totalMensal.reduce((s, v) => s + v, 0);
    const totalDespesasAno = despesas.totalMensal.reduce((s, v) => s + v, 0);
    const totalResultadoAno = totalReceitasAno - totalDespesasAno;

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 class="font-heading font-bold text-2xl text-forest-800">Visão anual</h2>
        <div class="flex items-center gap-2">
          <label class="label mb-0">Ano</label>
          <select id="input-ano" class="input w-auto">
            ${anos.map(a => `<option value="${a}" ${a === anoSelecionado ? 'selected' : ''}>${a}</option>`).join('')}
          </select>
        </div>
      </div>

      <p class="text-sm text-ink/60 mb-4">Igual ao painel de acompanhamento que você usava — receitas e despesas por categoria, mês a mês.</p>

      <div class="card p-0 overflow-hidden">
        <div class="table-scroll">
        <table class="data-table" style="min-width:920px">
          <thead>
            <tr>
              <th class="pl-4 sticky left-0 bg-cream" style="min-width:190px">Categoria</th>
              ${MESES.map(m => `<th class="text-right" style="min-width:64px">${m}</th>`).join('')}
              <th class="text-right pr-4" style="min-width:80px">Total ${anoSelecionado}</th>
            </tr>
          </thead>
          <tbody>
            ${linhaSecao('RECEITAS', receitas.totalMensal, totalReceitasAno, 'bg-forest/5')}
            ${receitas.categorias.map(c => linhaCategoria(c.nome, receitas.porCategoria[c.id], receitas.porCategoria[c.id].reduce((s, v) => s + v, 0))).join('')}

            ${linhaSecao('DESPESAS', despesas.totalMensal.map(v => -v), -totalDespesasAno, 'bg-rose/5')}
            ${despesas.categorias.map(c => linhaCategoria(c.nome, despesas.porCategoria[c.id].map(v => -v), -despesas.porCategoria[c.id].reduce((s, v) => s + v, 0))).join('')}

            ${linhaSecao('RESULTADO DO PERÍODO', resultadoMensal, totalResultadoAno, 'border-t-2 border-forest/30 bg-beige')}
          </tbody>
        </table>
        </div>
      </div>
      <p class="text-xs text-ink/40 mt-2">Valores em R$, arredondados. Despesas aparecem entre parênteses.</p>
    `;

    document.getElementById('input-ano').addEventListener('change', (e) => {
      anoSelecionado = Number(e.target.value);
      render(container);
    });
  }

  return { render };
})();
