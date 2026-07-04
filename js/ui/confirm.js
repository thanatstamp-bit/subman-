// Small centered confirm dialog. Returns a Promise<boolean>.
export function confirmDialog(message, { danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-panel modal-panel--sm" role="alertdialog" aria-modal="true">
        <div class="modal-body" style="padding-top: 28px;">
          <p style="font-size: var(--text-base); color: var(--color-text-primary);">${message}</p>
        </div>
        <div class="modal-footer">
          <div class="modal-footer__right">
            <button type="button" class="btn-outline" data-action="cancel">ยกเลิก</button>
            <button type="button" class="${danger ? 'btn-primary' : 'btn-primary'}" data-action="confirm" style="${danger ? 'background: var(--color-danger);' : ''}">ยืนยัน</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const trigger = document.activeElement;
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    confirmBtn.focus();

    function cleanup(result) {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      if (trigger && trigger.focus) trigger.focus();
      resolve(result);
    }

    function onKeydown(e) {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));
    document.addEventListener('keydown', onKeydown);
  });
}
