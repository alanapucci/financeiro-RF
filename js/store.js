// Estado da aplicação + persistência em localStorage.
const Store = (() => {
  const STORAGE_KEY = 'financeiro_brecho_v1';

  function seedData() {
    const hoje = Utils.todayIso();
    return {
      versao: 1,
      contas: [
        { id: 'conta_caixa', nome: 'Caixa (dinheiro)', saldoInicial: 0 },
        { id: 'conta_banco', nome: 'Conta bancária', saldoInicial: 0 },
      ],
      categorias: [
        { id: 'cat_venda_pecas', nome: 'Venda de peças', tipo: 'receita' },
        { id: 'cat_venda_consig', nome: 'Venda por consignação', tipo: 'receita' },
        { id: 'cat_outras_receitas', nome: 'Outras receitas', tipo: 'receita' },
        { id: 'cat_aluguel', nome: 'Aluguel', tipo: 'despesa' },
        { id: 'cat_consignantes', nome: 'Repasse a consignantes', tipo: 'despesa' },
        { id: 'cat_fornecedores', nome: 'Fornecedores', tipo: 'despesa' },
        { id: 'cat_embalagens', nome: 'Embalagens e etiquetas', tipo: 'despesa' },
        { id: 'cat_marketing', nome: 'Marketing/Divulgação', tipo: 'despesa' },
        { id: 'cat_taxas', nome: 'Taxas de cartão/maquininha', tipo: 'despesa' },
        { id: 'cat_contas_consumo', nome: 'Água/Luz/Internet', tipo: 'despesa' },
        { id: 'cat_funcionarios', nome: 'Funcionários/Pró-labore', tipo: 'despesa' },
        { id: 'cat_transporte', nome: 'Transporte', tipo: 'despesa' },
        { id: 'cat_manutencao', nome: 'Manutenção/Limpeza', tipo: 'despesa' },
        { id: 'cat_impostos', nome: 'Impostos/Taxas', tipo: 'despesa' },
        { id: 'cat_outras_despesas', nome: 'Outras despesas', tipo: 'despesa' },
      ],
      formasPagamento: ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Boleto'],
      lancamentos: [],
      parcelamentos: [],
      extratoImportado: [],
      vendas: [],
      _ultimaAtualizacao: hoje,
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedData();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return seedData();
      return Object.assign(seedData(), parsed, {
        categorias: parsed.categorias || seedData().categorias,
        contas: parsed.contas || seedData().contas,
        formasPagamento: parsed.formasPagamento || seedData().formasPagamento,
        lancamentos: parsed.lancamentos || [],
        parcelamentos: parsed.parcelamentos || [],
        extratoImportado: parsed.extratoImportado || [],
        vendas: parsed.vendas || [],
      });
    } catch (e) {
      console.error('Erro ao carregar dados salvos, iniciando do zero.', e);
      return seedData();
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getState() {
    return state;
  }

  // ---- Categorias ----
  function addCategoria(nome, tipo) {
    const cat = { id: Utils.uid('cat'), nome, tipo };
    state.categorias.push(cat);
    persist();
    return cat;
  }
  function updateCategoria(id, changes) {
    const cat = state.categorias.find(c => c.id === id);
    if (cat) Object.assign(cat, changes);
    persist();
  }
  function deleteCategoria(id) {
    state.categorias = state.categorias.filter(c => c.id !== id);
    persist();
  }
  function categoriaNome(id) {
    const c = state.categorias.find(c => c.id === id);
    return c ? c.nome : '—';
  }

  // ---- Contas ----
  function addConta(nome, saldoInicial) {
    const conta = { id: Utils.uid('conta'), nome, saldoInicial: Number(saldoInicial) || 0 };
    state.contas.push(conta);
    persist();
    return conta;
  }
  function contaNome(id) {
    const c = state.contas.find(c => c.id === id);
    return c ? c.nome : '—';
  }
  function updateConta(id, changes) {
    const c = state.contas.find(c => c.id === id);
    if (c) Object.assign(c, changes);
    persist();
  }
  function deleteConta(id) {
    state.contas = state.contas.filter(c => c.id !== id);
    persist();
  }

  // ---- Lançamentos ----
  function addLancamento(data) {
    const lanc = Object.assign({
      id: Utils.uid('lanc'),
      conciliado: false,
      origem: 'manual',
      parcelaRef: null,
    }, data);
    state.lancamentos.push(lanc);
    persist();
    return lanc;
  }
  function updateLancamento(id, changes) {
    const l = state.lancamentos.find(l => l.id === id);
    if (l) Object.assign(l, changes);
    persist();
    return l;
  }
  function deleteLancamento(id) {
    state.lancamentos = state.lancamentos.filter(l => l.id !== id);
    persist();
  }

  // ---- Parcelamentos (contas a pagar/receber) ----
  function addParcelamento({ descricao, tipo, pessoa, categoriaId, contaId, valorTotal, numParcelas, dataPrimeiraParcela }) {
    const id = Utils.uid('parc');
    const valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100;
    const parcelas = [];
    let somaParcelas = 0;
    for (let i = 0; i < numParcelas; i++) {
      let valor = valorParcela;
      if (i === numParcelas - 1) {
        valor = Math.round((valorTotal - somaParcelas) * 100) / 100;
      } else {
        somaParcelas += valorParcela;
      }
      parcelas.push({
        numero: i + 1,
        vencimento: Utils.addMonths(dataPrimeiraParcela, i),
        valor,
        status: 'pendente',
        dataPagamento: null,
        lancamentoId: null,
      });
    }
    const parcelamento = { id, descricao, tipo, pessoa, categoriaId, contaId, valorTotal, numParcelas, dataPrimeiraParcela, parcelas };
    state.parcelamentos.push(parcelamento);
    persist();
    return parcelamento;
  }
  function deleteParcelamento(id) {
    const parc = state.parcelamentos.find(p => p.id === id);
    if (parc) {
      const lancIds = parc.parcelas.filter(p => p.lancamentoId).map(p => p.lancamentoId);
      state.lancamentos = state.lancamentos.filter(l => !lancIds.includes(l.id));
    }
    state.parcelamentos = state.parcelamentos.filter(p => p.id !== id);
    persist();
  }
  function pagarParcela(parcelamentoId, numero, { dataPagamento, contaId, formaPagamento }) {
    const parc = state.parcelamentos.find(p => p.id === parcelamentoId);
    if (!parc) return;
    const parcela = parc.parcelas.find(p => p.numero === numero);
    if (!parcela || parcela.status === 'pago') return;
    const lanc = addLancamento({
      data: dataPagamento,
      descricao: `${parc.descricao} (${numero}/${parc.numParcelas})`,
      categoriaId: parc.categoriaId,
      contaId: contaId || parc.contaId,
      tipo: parc.tipo === 'pagar' ? 'despesa' : 'receita',
      valor: parcela.valor,
      formaPagamento: formaPagamento || 'Pix',
      conciliado: false,
      origem: 'parcela',
      parcelaRef: { parcelamentoId, numero },
    });
    parcela.status = 'pago';
    parcela.dataPagamento = dataPagamento;
    parcela.lancamentoId = lanc.id;
    persist();
    return lanc;
  }
  function estornarParcela(parcelamentoId, numero) {
    const parc = state.parcelamentos.find(p => p.id === parcelamentoId);
    if (!parc) return;
    const parcela = parc.parcelas.find(p => p.numero === numero);
    if (!parcela || parcela.status !== 'pago') return;
    if (parcela.lancamentoId) deleteLancamento(parcela.lancamentoId);
    parcela.status = 'pendente';
    parcela.dataPagamento = null;
    parcela.lancamentoId = null;
    persist();
  }

  // ---- Extrato importado (conciliação) ----
  function addExtratoLinhas(linhas) {
    const novas = linhas.map(l => Object.assign({ id: Utils.uid('ext'), conciliadoComLancamentoId: null }, l));
    state.extratoImportado.push(...novas);
    persist();
    return novas;
  }
  function conciliar(extratoId, lancamentoId) {
    const ext = state.extratoImportado.find(e => e.id === extratoId);
    const lanc = state.lancamentos.find(l => l.id === lancamentoId);
    if (!ext || !lanc) return false;
    ext.conciliadoComLancamentoId = lancamentoId;
    lanc.conciliado = true;
    persist();
    return true;
  }
  function desconciliar(extratoId) {
    const ext = state.extratoImportado.find(e => e.id === extratoId);
    if (!ext || !ext.conciliadoComLancamentoId) return;
    const lanc = state.lancamentos.find(l => l.id === ext.conciliadoComLancamentoId);
    if (lanc) lanc.conciliado = false;
    ext.conciliadoComLancamentoId = null;
    persist();
  }
  function deleteExtratoLinha(id) {
    state.extratoImportado = state.extratoImportado.filter(e => e.id !== id);
    persist();
  }

  // ---- Vendas por consignação (registro de recebimentos, independente do financeiro) ----
  function addVenda(data) {
    const venda = Object.assign({ id: Utils.uid('venda') }, data);
    state.vendas.push(venda);
    persist();
    return venda;
  }
  function updateVenda(id, changes) {
    const v = state.vendas.find(v => v.id === id);
    if (v) Object.assign(v, changes);
    persist();
    return v;
  }
  function deleteVenda(id) {
    state.vendas = state.vendas.filter(v => v.id !== id);
    persist();
  }

  // ---- Backup / restauração ----
  function exportJson() {
    return JSON.stringify(state, null, 2);
  }
  function importJson(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    state = Object.assign(seedData(), parsed);
    persist();
    return state;
  }
  function resetAll() {
    state = seedData();
    persist();
    return state;
  }

  return {
    getState, persist,
    addCategoria, updateCategoria, deleteCategoria, categoriaNome,
    addConta, contaNome, updateConta, deleteConta,
    addLancamento, updateLancamento, deleteLancamento,
    addParcelamento, deleteParcelamento, pagarParcela, estornarParcela,
    addExtratoLinhas, conciliar, desconciliar, deleteExtratoLinha,
    addVenda, updateVenda, deleteVenda,
    exportJson, importJson, resetAll,
  };
})();
