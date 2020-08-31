/**
 * Create a banner to be shown in command output.
 * @param str String to present as a banner
 * @param bottomChar The character to use underneath the string.
 * @param topChar The character to use above the string.
 */
export function banner(
  str: string,
  bottomChar: string = '-',
  topChar: string = ' '
) {
  return (
    topChar.repeat(str.length) +
    '\n' +
    str +
    '\n' +
    bottomChar.repeat(str.length)
  );
}
