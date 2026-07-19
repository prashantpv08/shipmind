export const MAX_GUIDED_TEXT_CHARACTERS = 2_000;
export const GUIDED_TEXT_LIMIT_MESSAGE = 'Enter only 2,000 characters.';

export function guidedTextLimitError(value: string) {
  return value.length > MAX_GUIDED_TEXT_CHARACTERS ? GUIDED_TEXT_LIMIT_MESSAGE : '';
}
