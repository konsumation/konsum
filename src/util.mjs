/**
 * Merges two objects.
 * Overwrite all keys in a1 with the corresponding values from a2
 * @param {Object} a1
 * @param {Object} a2
 * @return {Object} merged result
 */
export function mergeDefaults(a1, a2) {
  const t = {};

  Object.keys(a1).forEach(k => (t[k] = a2[k] ? a2[k] : a1[k]));

  return Object.assign({}, a1, t);
}
