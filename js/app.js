// App shell: navegação entre views, modal genérico, toasts, backup.
const App = (() => {
  const views = {
    resumo: ViewResumo,
    anual: ViewAnual,
    vendas: ViewVendas,
    lancamentos: ViewLancamentos,
    conciliacao: ViewConciliacao,
    contas: ViewContas,
    categorias: ViewCategorias,
  };
  let currentView = 'resumo';

  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  function openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.remove('hidden');
    backdrop.classList.add('flex');
  }
  function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.add('hidden');
    backdrop.classList.remove('flex');
    document.getElementById('modal-content').innerHTML = '';
  }

  function renderView(name) {
    currentView = name;
    Object.keys(views).forEach(v => {
      document.getElementById('view-' + v).classList.toggle('hidden', v !== name);
    });
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
    document.querySelectorAll('.nav-tab-mobile').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
    views[name].render(document.getElementById('view-' + name));
    document.getElementById('mobile-menu').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function refreshCurrentView() {
    views[currentView].render(document.getElementById('view-' + currentView));
  }

  function setupNav() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => renderView(btn.dataset.view));
    });
    document.getElementById('btn-menu-mobile').addEventListener('click', () => {
      document.getElementById('mobile-menu').classList.toggle('hidden');
    });
    document.getElementById('mobile-menu').addEventListener('click', (e) => {
      if (e.target.id === 'mobile-menu') document.getElementById('mobile-menu').classList.add('hidden');
    });
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });
  }

  function backupModalHtml() {
    return `
      <h3 class="font-heading font-bold text-xl text-forest-800 mb-4">Backup dos dados</h3>
      <p class="text-sm text-ink/70 mb-4">Todos os dados ficam salvos só neste navegador. Exporte um backup regularmente (ex: toda semana) para não correr risco de perder as informações.</p>
      <div class="flex flex-col gap-3">
        <button id="btn-export" class="btn-primary w-full">⬇️ Exportar backup (.json)</button>
        <label class="btn-secondary w-full cursor-pointer">
          ⬆️ Importar backup (.json)
          <input type="file" id="input-import" accept="application/json" class="hidden">
        </label>
        <button id="btn-reset" class="btn-danger w-full">🗑️ Apagar todos os dados</button>
      </div>
    `;
  }

  function setupBackup() {
    const open = () => {
      openModal(backupModalHtml());
      document.getElementById('btn-export').addEventListener('click', () => {
        const json = Store.exportJson();
        const stamp = Utils.todayIso();
        Utils.downloadFile(`financeiro-brecho-backup-${stamp}.json`, json, 'application/json');
        toast('Backup exportado!');
      });
      document.getElementById('input-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            Store.importJson(reader.result);
            toast('Backup importado com sucesso!');
            closeModal();
            refreshCurrentView();
          } catch (err) {
            toast('Arquivo inválido. Verifique se é um backup exportado por este app.', 'error');
          }
        };
        reader.readAsText(file);
      });
      document.getElementById('btn-reset').addEventListener('click', () => {
        if (confirm('Tem certeza? Isso vai apagar TODOS os lançamentos, contas a pagar/receber e o extrato importado. Essa ação não pode ser desfeita.')) {
          Store.resetAll();
          toast('Dados apagados.');
          closeModal();
          refreshCurrentView();
        }
      });
    };
    document.getElementById('btn-backup').addEventListener('click', open);
    document.getElementById('btn-backup-mobile').addEventListener('click', open);
  }

  function init() {
    setupNav();
    setupBackup();
    renderView('resumo');
  }

  return { toast, openModal, closeModal, renderView, refreshCurrentView, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
