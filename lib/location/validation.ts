/**
 * Deterministic Indian Pincode Validation and City Helper
 */

const PINCODE_PREFIX_MAP: Record<string, { city: string; state: string }> = {
  "11": { city: "Delhi", state: "Delhi" },
  "40": { city: "Mumbai", state: "Maharashtra" },
  "41": { city: "Pune", state: "Maharashtra" },
  "42": { city: "Nashik", state: "Maharashtra" },
  "44": { city: "Nagpur", state: "Maharashtra" },
  "56": { city: "Bengaluru", state: "Karnataka" },
  "50": { city: "Hyderabad", state: "Telangana" },
  "60": { city: "Chennai", state: "Tamil Nadu" },
  "70": { city: "Kolkata", state: "West Bengal" },
  "38": { city: "Ahmedabad", state: "Gujarat" },
  "39": { city: "Surat", state: "Gujarat" },
  "30": { city: "Jaipur", state: "Rajasthan" },
  "22": { city: "Lucknow", state: "Uttar Pradesh" },
  "20": { city: "Noida / Ghaziabad", state: "Uttar Pradesh" },
  "12": { city: "Gurugram / Faridabad", state: "Haryana" },
  "16": { city: "Chandigarh", state: "Chandigarh" },
};

export interface PincodeValidationResult {
  isValid: boolean;
  pincode?: string;
  city?: string;
  state?: string;
  error?: string;
}

/**
 * Validates a 6-digit Indian Postal PIN Code.
 */
export function validatePincode(input: string): PincodeValidationResult {
  if (!input) {
    return {
      isValid: false,
      error: "Pincode is required.",
    };
  }

  const clean = input.trim().replace(/\s+/g, "");

  // Must be exactly 6 numeric digits
  if (!/^\d{6}$/.test(clean)) {
    if (/[^0-9]/.test(clean)) {
      return {
        isValid: false,
        error: "Pincode must contain only numbers (e.g. 400001).",
      };
    }
    return {
      isValid: false,
      error: `Pincode must be exactly 6 digits (got ${clean.length}).`,
    };
  }

  // Check prefix for city resolution if known
  const prefix = clean.substring(0, 2);
  const info = PINCODE_PREFIX_MAP[prefix];

  return {
    isValid: true,
    pincode: clean,
    city: info?.city,
    state: info?.state,
  };
}
