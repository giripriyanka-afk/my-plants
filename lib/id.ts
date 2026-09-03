/**
 * Deliberately not crypto.randomUUID(): that is undefined outside a secure
 * context, so every "Add plant" would throw when the app is opened on a phone
 * at http://192.168.x.x:3000. Uniqueness only has to hold within one browser's
 * plant list, which timestamp + randomness covers comfortably.
 */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
