export function usageUnavailableBody() {
  return {
    allowed: false,
    isPro: false,
    remaining: null,
    unavailable: true,
    error: 'Usage service unavailable.',
  };
}
