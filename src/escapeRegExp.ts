/**
 * Escapes a string so that it can be matched verbatim in a regular expression.
 * @param str String to be escaped for use in a regular expression
 * @see https://stackoverflow.com/a/6969486
 */
export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
