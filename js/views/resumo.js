const ViewResumo = (() => {
  let mesSelecionado = Utils.monthKey(Utils.todayIso());
  let chartFluxo = null;
  let chartCategorias = null;

  function calcularSaldoAtual(state) {
    const saldoContas = state.contas.reduce((s, c) => s + (Number(c.saldoInicial) || 0), 0);
    const totalLanc = state.lancamentos.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0);
    return saldoContas + totalLanc;
  }

  function totaisDoMes(state, mesKey) {
    const doMes = state.lancamentos.filter(l => Utils.monthKey(l.data) === mesKey);
    const receitas = doMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesas = doMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas, doMes };
  }

  function ultimosMeses(n) {
    const meses = [];
    const hoje = Utils.todayIso();
    for (let i = n - 1; i >= 0; i--) {
      const d = Utils.addMonths(hoje.slice(0, 8) + '01', -i);
      meses.push(Utils.monthKey(d));
    }
    return meses;
  }

  function proximosVencimentos(state, dias) {
    const hoje = Utils.todayIso();
    const limite = Utils.addMonths(hoje, 0);
    const limiteDate = new Date(hoje);
    const fim = new Date(limiteDate.getTime() + dias * 86400000);
    const itens = [];
    state.parcelamentos.forEach(p => {
      p.parcelas.forEach(parc => {
        if (parc.status !== 'pendente') return;
        const vDate = new Date(parc.vencimento);
        if (vDate <= fim) {
          itens.push({ parcelamento: p, parcela: parc, atrasada: parc.vencimento < hoje });
        }
      });
    });
    itens.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento));
    return itens;
  }

  function render(container) {
    const state = Store.getState();
    const saldoAtual = calcularSaldoAtual(state);
    const { receitas, despesas, saldo } = totaisDoMes(state, mesSelecionado);
    const vencimentos = proximosVencimentos(state, 30);

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 class="font-heading font-bold text-2xl text-forest-800">Resumo</h2>
        <div class="flex items-center gap-2">
          <label class="label mb-0">Mês</label>
          <input type="month" id="input-mes-resumo" class="input w-auto" value="${mesSelecionado}">
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Saldo atual</p>
          <p class="text-lg sm:text-xl font-bold ${saldoAtual >= 0 ? 'text-forest-700' : 'text-rose-600'}">${Utils.formatCurrency(saldoAtual)}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Receitas do mês</p>
          <p class="text-lg sm:text-xl font-bold text-forest-700">${Utils.formatCurrency(receitas)}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Despesas do mês</p>
          <p class="text-lg sm:text-xl font-bold text-rose-600">${Utils.formatCurrency(despesas)}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1">Saldo do mês</p>
          <p class="text-lg sm:text-xl font-bold ${saldo >= 0 ? 'text-forest-700' : 'text-rose-600'}">${Utils.formatCurrency(saldo)}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 mb-6">
        <div class="card">
          <h3 class="font-semibold text-ink mb-3">Fluxo de caixa (últimos 6 meses)</h3>
          <canvas id="chart-fluxo" height="220"></canvas>
        </div>
        <div class="card">
          <h3 class="font-semibold text-ink mb-3">Despesas por categoria — ${Utils.monthLabel(mesSelecionado + '-01')}</h3>
          <canvas id="chart-categorias" height="220"></canvas>
        </div>
      </div>

      <div class="card">
        <h3 class="font-semibold text-ink mb-3">Próximos vencimentos (30 dias)</h3>
        ${vencimentos.length === 0 ? '<p class="text-sm text-ink/50">Nada por aqui. 🎉</p>' : `
        <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Vencimento</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            ${vencimentos.map(v => `
              <tr>
                <td>${Utils.formatDate(v.parcela.vencimento)}</td>
                <td>${Utils.escapeHtml(v.parcelamento.descricao)} <span class="text-ink/40">(${v.parcela.numero}/${v.parcelamento.numParcelas})</span></td>
                <td><span class="badge ${v.parcelamento.tipo === 'pagar' ? 'badge-red' : 'badge-green'}">${v.parcelamento.tipo === 'pagar' ? 'A pagar' : 'A receber'}</span></td>
                <td>${Utils.formatCurrency(v.parcela.valor)}</td>
                <td>${v.atrasada ? '<span class="badge badge-amber">Atrasada</span>' : '<span class="badge badge-gray">Pendente</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
        `}
      </div>
    `;

    document.getElementById('input-mes-resumo').addEventListener('change', (e) => {
      mesSelecionado = e.target.value;
      render(container);
    });

    renderCharts(state);
  }

  function renderCharts(state) {
    const meses = ultimosMeses(6);
    const receitasPorMes = meses.map(m => totaisDoMes(state, m).receitas);
    const despesasPorMes = meses.map(m => totaisDoMes(state, m).despesas);

    if (chartFluxo) chartFluxo.destroy();
    const ctxFluxo = document.getElementById('chart-fluxo');
    chartFluxo = new Chart(ctxFluxo, {
      type: 'bar',
      data: {
        labels: meses.map(m => Utils.monthLabel(m + '-01')),
        datasets: [
          { label: 'Receitas', data: receitasPorMes, backgroundColor: '#67754F', borderRadius: 4 },
          { label: 'Despesas', data: despesasPorMes, backgroundColor: '#B15C5C', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v } } },
      },
    });

    const { doMes } = totaisDoMes(state, mesSelecionado);
    const despesasMes = doMes.filter(l => l.tipo === 'despesa');
    const porCategoria = {};
    despesasMes.forEach(l => {
      const nome = Store.categoriaNome(l.categoriaId);
      porCategoria[nome] = (porCategoria[nome] || 0) + l.valor;
    });
    const labels = Object.keys(porCategoria);
    const dados = Object.values(porCategoria);
    const cores = ['#67754F', '#919D71', '#B15C5C', '#CFC4A8', '#3A412E', '#7E8A60', '#9C4C4C', '#F1EAD7', '#576343', '#6A754F'];

    if (chartCategorias) chartCategorias.destroy();
    const ctxCat = document.getElementById('chart-categorias');
    if (labels.length === 0) {
      const ctx2d = ctxCat.getContext('2d');
      ctx2d.font = '13px Inter';
      ctx2d.fillStyle = '#9a9284';
      ctx2d.fillText('Sem despesas neste mês.', 10, 30);
      return;
    }
    chartCategorias = new Chart(ctxCat, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: dados, backgroundColor: cores }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } },
    });
  }

  return { render };
})();
