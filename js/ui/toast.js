// Bottom-right toast stack. Auto-dismiss 3s, max 3 stacked.
let container = null;

function ensureContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'toast-stack';
  document.body.appendChild(container);
  return container;
}

export function toast(message, type = 'success') {
  const stack = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' toast--error' : ''}`;
  el.textContent = message;
  stack.appendChild(el);

  while (stack.children.length > 3) {
    stack.removeChild(stack.firstElementChild);
  }

  setTimeout(() => {
    el.remove();
  }, 3000);
}
