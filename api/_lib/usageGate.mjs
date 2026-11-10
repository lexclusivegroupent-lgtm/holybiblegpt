export const FREE_LIMIT = 5;

export function usageUnavailableBody() {
  return {
    allowed: false,
    isPro: false,
    remaining: null,
    unavailable: true,
    error: 'Usage service unavailable.',
  };
}
