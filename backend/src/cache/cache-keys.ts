/** Version counter keys — INCR to invalidate all cached entries for a domain */
export const VERSION_KEYS = {
  NEARBY: 'nearby:ver',
  SURGE: 'surge:ver',
  FARE: 'fare:ver',
} as const;

/** Round to 3 decimal places (~110 m precision) for cache key bucketing */
function r3(n: number): string {
  return n.toFixed(3);
}

/** Round to 1 decimal place for pickup context in destination keys */
function r1(n: number): string {
  return n.toFixed(1);
}

export const CacheKeys = {
  nearbyDrivers(ver: number, lat: number, lng: number, radiusKm: number): string {
    return `nearby:v${ver}:${r3(lat)}:${r3(lng)}:${radiusKm}`;
  },

  surgeMultiplier(ver: number, lat: number, lng: number): string {
    return `surge:v${ver}:${r3(lat)}:${r3(lng)}`;
  },

  fareEstimate(
    ver: number,
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
  ): string {
    return `fare:v${ver}:${r3(pickupLat)}:${r3(pickupLng)}:${r3(destLat)}:${r3(destLng)}`;
  },

  destination(text: string, lat?: number, lng?: number): string {
    const normalized = text.trim().toLowerCase().replace(/\s+/g, '_');
    const ctx = lat != null && lng != null ? `:${r1(lat)}:${r1(lng)}` : '';
    return `dest:${normalized}${ctx}`;
  },
};
