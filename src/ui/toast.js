import { h } from '../utils/dom.js';

let container = null;

export function toast(message, duration = 2200) {
  container ??= document.body.appendChild(h('div', { class: 'toast-container' }));
  const el = h('div', { class: 'toast' }, message);
  container.append(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
