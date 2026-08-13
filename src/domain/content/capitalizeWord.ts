/** Headwords are stored lower case and shown with a Finnish initial capital. */
export const capitalizeWord = (value: string): string =>
  value.charAt(0).toLocaleUpperCase("fi-FI") + value.slice(1);
