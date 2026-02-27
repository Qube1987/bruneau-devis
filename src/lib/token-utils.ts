export const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const getDevisPublicUrl = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/devis/${token}`;
};
