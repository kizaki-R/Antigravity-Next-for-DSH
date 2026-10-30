/** One-time visibility migration for model additions. */
export const MODEL_VISIBILITY_VERSION = 2;

/**
 * Existing explicit visibility lists predate Argon. Add it once so users see
 * the newly supported model in the provider picker; later manual choices are
 * respected because the migration version is persisted with the book.
 *
 * @param {object} book
 * @returns {boolean} whether the book changed and should be persisted
 */
export function migrateArgonVisibility(book) {
  if (!book || !Array.isArray(book.visibleModels) || Number(book.modelVisibilityVersion) >= MODEL_VISIBILITY_VERSION) {
    return false;
  }
  // An EMPTY list is the user's explicit "show nothing in chat" choice, not a
  // fresh install. Only a non-empty list is topped up with newer models.
  if (!book.visibleModels.length) {
    book.modelVisibilityVersion = MODEL_VISIBILITY_VERSION;
    return true;
  }
  for (const id of ["gemini-4-argon", "claude-opus-4-6"]) {
    if (!book.visibleModels.includes(id)) book.visibleModels.push(id);
  }
  book.modelVisibilityVersion = MODEL_VISIBILITY_VERSION;
  return true;
}
