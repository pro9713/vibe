/**
 * Location Data Model for Location V1
 *
 * Supports pincode-based location, latitude/longitude coordinates,
 * city/state display, and fallback configuration.
 */

export interface LocationData {
  pincode?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  label: string;
  isFallback?: boolean;
}

/**
 * Standard fallback location (Mumbai) used only when the user has not selected their location.
 */
export const DEFAULT_FALLBACK_LOCATION: LocationData = {
  latitude: 19.0760,
  longitude: 72.8777,
  city: "Mumbai",
  state: "Maharashtra",
  label: "Mumbai",
  isFallback: true,
};
