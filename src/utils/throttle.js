/** Coalesces calls so `fn` runs at most once per animation frame with the latest args. */
export function rafThrottle(fn) {
  let pendingArgs = null;
  return (...args) => {
    const scheduled = pendingArgs !== null;
    pendingArgs = args;
    if (scheduled) return;
    requestAnimationFrame(() => {
      const latest = pendingArgs;
      pendingArgs = null;
      fn(...latest);
    });
  };
}
