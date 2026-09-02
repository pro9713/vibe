import { useSyncExternalStore } from "react";
import { type LocationData, DEFAULT_FALLBACK_LOCATION } from "./types";
import { validatePincode } from "./validation";

export const LOCATION_STORAGE_KEY = "pricely-location";

/**
 * Retrieves the currently saved location from localStorage, or returns the default fallback.
 */
export function getLocation(): LocationData {
  if (typeof window === "undefined") {
    return DEFAULT_FALLBACK_LOCATION;
  }

  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FALLBACK_LOCATION;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        ...DEFAULT_FALLBACK_LOCATION,
        ...parsed,
        isFallback: false,
      };
    }

    return DEFAULT_FALLBACK_LOCATION;
  } catch (err) {
    console.error("Error reading saved location from localStorage:", err);
    return DEFAULT_FALLBACK_LOCATION;
  }
}

/**
 * Saves a new location to localStorage and notifies all components.
 */
export function setLocation(data: Partial<LocationData>): LocationData {
  if (typeof window === "undefined") {
    return DEFAULT_FALLBACK_LOCATION;
  }

  try {
    let label = data.label;

    if (!label) {
      if (data.pincode) {
        const val = validatePincode(data.pincode);
        label = val.city ? `${val.city} (${data.pincode})` : `Pincode ${data.pincode}`;
      } else if (data.city) {
        label = data.city;
      } else {
        label = DEFAULT_FALLBACK_LOCATION.label;
      }
    }

    const newLocation: LocationData = {
      ...DEFAULT_FALLBACK_LOCATION,
      ...data,
      label,
      isFallback: false,
    };

    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
    window.dispatchEvent(
      new CustomEvent("location-updated", { detail: { location: newLocation } })
    );

    return newLocation;
  } catch (err) {
    console.error("Error saving location to localStorage:", err);
    return DEFAULT_FALLBACK_LOCATION;
  }
}

/**
 * Resets saved location back to the default fallback (Mumbai).
 */
export function resetLocation(): LocationData {
  if (typeof window === "undefined") {
    return DEFAULT_FALLBACK_LOCATION;
  }

  try {
    window.localStorage.removeItem(LOCATION_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("location-updated", { detail: { location: DEFAULT_FALLBACK_LOCATION } })
    );
    return DEFAULT_FALLBACK_LOCATION;
  } catch (err) {
    console.error("Error resetting location:", err);
    return DEFAULT_FALLBACK_LOCATION;
  }
}

/**
 * Event subscriber for React useSyncExternalStore
 */
function subscribeLocation(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("location-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("location-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedRawLocation: string | null = null;
let cachedLocationSnapshot: LocationData = DEFAULT_FALLBACK_LOCATION;

function getLocationSnapshot(): LocationData {
  if (typeof window === "undefined") return DEFAULT_FALLBACK_LOCATION;
  const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
  if (raw !== cachedRawLocation) {
    cachedRawLocation = raw;
    cachedLocationSnapshot = getLocation();
  }
  return cachedLocationSnapshot;
}

/**
 * React 19 Hook for reactive Location subscription
 */
export function useLocation(): LocationData {
  return useSyncExternalStore(
    subscribeLocation,
    getLocationSnapshot,
    () => DEFAULT_FALLBACK_LOCATION
  );
}
