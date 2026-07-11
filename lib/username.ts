export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

export function getUsernameError(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) return `En az ${USERNAME_MIN_LENGTH} karakter olmalı`;
  if (username.length > USERNAME_MAX_LENGTH) return `En fazla ${USERNAME_MAX_LENGTH} karakter olmalı`;
  if (!USERNAME_PATTERN.test(username)) return "Sadece küçük harf, rakam, _ ve - kullanılabilir";
  return null;
}
