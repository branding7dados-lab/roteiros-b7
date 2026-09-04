/* =====================================================================
   BACKUP
   Segurança extra, não é onde os dados moram. O banco continua sendo o
   Supabase; isto aqui só gera e devolve um arquivo.
   ===================================================================== */

window.B7 = window.B7 || {};

B7.Backup = (function () {

  function baixar(obj, nome) {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
      a.download = nome;
      a.style.display = 'none';
      document.body.appendChild(a);          // Firefox exige o link no documento
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function exportar() {
    try {
      const pacote = await B7.Save.acao(() => B7.DB.exportarTudo());
      const hoje = new Date().toISOString().slice(0, 10);
      if (baixar(pacote, 'backup_roteiros_b7_' + hoje + '.json')) {
        B7.UI.toast('Backup gerado · ' + pacote.roteiros.length + ' roteiros');
      } else {
        B7.UI.toast('O navegador bloqueou o download do backup', { tipo: 'erro' });
      }
    } catch (e) {}
  }

  function importar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      const leitor = new FileReader();
      leitor.onload = async () => {
        let pacote;
        try { pacote = JSON.parse(leitor.result); }
        catch (e) { return B7.UI.toast('Arquivo inválido', { tipo: 'erro' }); }
        if (!pacote || !Array.isArray(pacote.clientes)) {
          return B7.UI.toast('Este arquivo não é um backup do Roteiros B7', { tipo: 'erro' });
        }
        B7.UI.confirmar({
          titulo: 'Importar backup?',
          texto: 'Os registros do arquivo entram no banco. O que já existir com o mesmo id ' +
                 'será sobrescrito pela versão do arquivo. Nada é apagado.',
          rotulo: 'Importar',
          aoConfirmar: async () => {
            try {
              const r = await B7.Save.acao(() => B7.DB.importarTudo(pacote));
              B7.UI.toast('Importado: ' + r.clientes + ' clientes, ' + r.gravacoes + ' gravações, ' +
                          r.roteiros + ' roteiros, ' + r.cenas + ' cenas');
              B7.Rota.recarregar();
            } catch (e) {}
          }
        });
      };
      leitor.readAsText(f);
    };
    input.click();
  }

  return { exportar, importar };
})();
