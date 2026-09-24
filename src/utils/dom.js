/**
 * Tiny hyperscript helper: h('div', { class: 'x', onClick: fn }, child1, child2)
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  let deferredValue;

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'html') el.innerHTML = value;
    else if (key === 'value') deferredValue = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in el && typeof value !== 'string') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }

  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }

  // Set after children so <select> can pick a matching <option>.
  if (deferredValue !== undefined) el.value = deferredValue;
  return el;
}

export function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  if (target.tagName === 'INPUT') {
    return !['range', 'checkbox', 'color', 'button', 'radio'].includes(target.type);
  }
  return false;
}
