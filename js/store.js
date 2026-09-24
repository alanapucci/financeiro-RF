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
      grupos: [
        { id: 'grp_custos_operacionais', nome: 'Custos operacionais', tipo: 'despesa' },
        { id: 'grp_despesas_operacionais', nome: 'Despesas operacionais', tipo: 'despesa' },
        { id: 'grp_despesas_pessoais', nome: 'Despesas pessoais', tipo: 'despesa' },
      ],
      categorias: [
        { id: 'cat_venda_pecas', nome: 'Venda de peças', tipo: 'receita', grupoId: null },
        { id: 'cat_venda_consig', nome: 'Venda por consignação', tipo: 'receita', grupoId: null },
        { id: 'cat_outras_receitas', nome: 'Outras receitas', tipo: 'receita', grupoId: null },

        { id: 'cat_fornecedores', nome: 'Fornecedores', tipo: 'despesa', grupoId: 'grp_custos_operacionais' },
        { id: 'cat_consignantes', nome: 'Repasse a consignantes', tipo: 'despesa', grupoId: 'grp_custos_operacionais' },

        { id: 'cat_aluguel', nome: 'Aluguel', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_embalagens', nome: 'Embalagens e etiquetas', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_marketing', nome: 'Marketing/Divulgação', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_taxas', nome: 'Taxas de cartão/maquininha', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_contas_consumo', nome: 'Água/Luz/Internet', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_funcionarios', nome: 'Funcionários/Pró-labore', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_transporte', nome: 'Transporte (loja)', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_manutencao', nome: 'Manutenção/Limpeza', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },
        { id: 'cat_impostos', nome: 'Impostos/Taxas', tipo: 'despesa', grupoId: 'grp_despesas_operacionais' },

        { id: 'cat_pessoal_moradia', nome: 'Moradia', tipo: 'despesa', grupoId: 'grp_despesas_pessoais' },
        { id: 'cat_pessoal_alimentacao', nome: 'Alimentação', tipo: 'despesa', grupoId: 'grp_despesas_pessoais' },
        { id: 'cat_pessoal_transporte', nome: 'Transporte pessoal', tipo: 'despesa', grupoId: 'grp_despesas_pessoais' },
        { id: 'cat_pessoal_saude', nome: 'Saúde', tipo: 'despesa', grupoId: 'grp_despesas_pessoais' },
        { id: 'cat_pessoal_lazer', nome: 'Lazer', tipo: 'despesa', grupoId: 'grp_despesas_pessoais' },
        { id: 'cat_pessoal_educacao', nome: 'Educação', tipo: 'despesa', grupoId: 'grp_despesas_pessoais' },
        { id: 'cat_pessoal_outras', nome: 'Outras despesas pessoais', tipo: 'despesa', grupoId: 'grp_despesas_pessoais' },

        { id: 'cat_outras_despesas', nome: 'Outras despesas', tipo: 'despesa', grupoId: null },
      ],
      formasPagamento: ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Boleto'],
      lancamentos: [],
      parcelamentos: [],
      extratoImportado: [],
      vendas: [],
      regras: [],
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
      const seed = seedData();
      // Migração: adiciona grupos/categorias novos do seed que ainda não existem nos dados salvos,
      // sem sobrescrever nada que o usuário já tenha (dados existentes sempre têm prioridade).
      const gruposSalvos = parsed.grupos || [];
      const gruposNovos = seed.grupos.filter(g => !gruposSalvos.some(gs => gs.id === g.id));
      const categoriasSalvas = parsed.categorias || seed.categorias;
      const categoriasNovas = parsed.categorias
        ? seed.categorias.filter(c => !categoriasSalvas.some(cs => cs.id === c.id))
        : [];
      return Object.assign(seed, parsed, {
        grupos: [...gruposSalvos, ...gruposNovos],
        categorias: [...categoriasSalvas, ...categoriasNovas],
        contas: parsed.contas || seed.contas,
        formasPagamento: parsed.formasPagamento || seed.formasPagamento,
        lancamentos: parsed.lancamentos || [],
        parcelamentos: parsed.parcelamentos || [],
        extratoImportado: parsed.extratoImportado || [],
        vendas: parsed.vendas || [],
        regras: parsed.regras || [],
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

  // ---- Grupos de categoria (subcategorias) ----
  function addGrupo(nome, tipo) {
    const grupo = { id: Utils.uid('grp'), nome, tipo };
    state.grupos.push(grupo);
    persist();
    return grupo;
  }
  function updateGrupo(id, changes) {
    const g = state.grupos.find(g => g.id === id);
    if (g) Object.assign(g, changes);
    persist();
  }
  function deleteGrupo(id) {
    state.categorias.forEach(c => { if (c.grupoId === id) c.grupoId = null; });
    state.grupos = state.grupos.filter(g => g.id !== id);
    persist();
  }
  function grupoNome(id) {
    const g = state.grupos.find(g => g.id === id);
    return g ? g.nome : null;
  }

  // ---- Categorias ----
  function addCategoria(nome, tipo, grupoId) {
    const cat = { id: Utils.uid('cat'), nome, tipo, grupoId: grupoId || null };
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
  // Retorna [{ grupo: {id,nome}|null, categorias: [...] }] — grupos primeiro (na ordem cadastrada),
  // depois um bloco final com categorias sem grupo (grupo: null), só se houver alguma.
  function categoriasAgrupadas(tipo) {
    const categorias = state.categorias.filter(c => c.tipo === tipo);
    const blocos = state.grupos
      .filter(g => g.tipo === tipo)
      .map(g => ({ grupo: g, categorias: categorias.filter(c => c.grupoId === g.id) }))
      .filter(b => b.categorias.length > 0);
    const semGrupo = categorias.filter(c => !c.grupoId || !state.grupos.some(g => g.id === c.grupoId));
    if (semGrupo.length > 0) blocos.push({ grupo: null, categorias: semGrupo });
    return blocos;
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

  // ---- Regras de categorização automática (a partir do texto do extrato) ----
  function addRegra({ padrao, tipo, categoriaId, contaId, descricaoModelo }) {
    const regra = { id: Utils.uid('regra'), padrao: padrao.trim(), tipo, categoriaId, contaId: contaId || null, descricaoModelo: (descricaoModelo || '').trim() };
    state.regras.push(regra);
    persist();
    return regra;
  }
  function updateRegra(id, changes) {
    const r = state.regras.find(r => r.id === id);
    if (r) Object.assign(r, changes);
    persist();
    return r;
  }
  function deleteRegra(id) {
    state.regras = state.regras.filter(r => r.id !== id);
    persist();
  }
  function encontrarRegra(descricaoExtrato) {
    const alvo = (descricaoExtrato || '').toUpperCase();
    return state.regras.find(r => r.padrao && alvo.includes(r.padrao.toUpperCase()));
  }
  // Varre o extrato ainda não conciliado e aplica regras existentes: cria o lançamento
  // correspondente e já concilia com a linha do extrato. Retorna quantas foram aplicadas.
  function aplicarRegrasAutomaticas() {
    let aplicadas = 0;
    state.extratoImportado
      .filter(e => !e.conciliadoComLancamentoId)
      .forEach(e => {
        const regra = encontrarRegra(e.descricao);
        if (!regra) return;
        const lanc = addLancamento({
          data: e.data,
          descricao: regra.descricaoModelo || e.descricao,
          categoriaId: regra.categoriaId,
          contaId: regra.contaId || (state.contas[0] ? state.contas[0].id : null),
          tipo: regra.tipo,
          valor: Math.abs(e.valor),
          formaPagamento: 'Pix',
          conciliado: true,
          origem: 'regra',
        });
        e.conciliadoComLancamentoId = lanc.id;
        aplicadas++;
      });
    persist();
    return aplicadas;
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
    addGrupo, updateGrupo, deleteGrupo, grupoNome,
    addCategoria, updateCategoria, deleteCategoria, categoriaNome, categoriasAgrupadas,
    addConta, contaNome, updateConta, deleteConta,
    addLancamento, updateLancamento, deleteLancamento,
    addParcelamento, deleteParcelamento, pagarParcela, estornarParcela,
    addExtratoLinhas, conciliar, desconciliar, deleteExtratoLinha,
    addRegra, updateRegra, deleteRegra, encontrarRegra, aplicarRegrasAutomaticas,
    addVenda, updateVenda, deleteVenda,
    exportJson, importJson, resetAll,
  };
})();
