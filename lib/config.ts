/**
 * Safe Runtime Environment Variable Audit & Validation Utility
 * Validates required/optional configuration without revealing secret contents.
 */

export interface EnvValidationResult {
  valid: boolean;
  environment: "development" | "production" | "test";
  required: {
    name: string;
    configured: boolean;
    isServerOnly: boolean;
  }[];
  optional: {
    name: string;
    configured: boolean;
    defaultValue?: string;
  }[];
  missingRequired: string[];
}

export function validateEnvironmentConfig(): EnvValidationResult {
  const env = (process.env.NODE_ENV || "development") as "development" | "production" | "test";
  const isProd = env === "production";

  // Production Required Variables
  const requiredConfig = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")),
      isServerOnly: false,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")),
      isServerOnly: false,
    },
    {
      name: "PRICELY_CRON_SECRET",
      configured: Boolean((process.env.PRICELY_CRON_SECRET || process.env.CRON_SECRET)?.trim()),
      isServerOnly: true,
    },
  ];

  // Optional / Extension Variables
  const optionalConfig = [
    {
      name: "QUICKCOMMERCE_API_KEY",
      configured: Boolean(process.env.QUICKCOMMERCE_API_KEY?.trim()),
      defaultValue: "Local product catalog provider",
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")),
      defaultValue: "Server-side elevated operations",
    },
    {
      name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      configured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()),
      defaultValue: "In-memory test VAPID key",
    },
    {
      name: "VAPID_PRIVATE_KEY",
      configured: Boolean(process.env.VAPID_PRIVATE_KEY?.trim()),
      defaultValue: "In-memory test VAPID key",
    },
    {
      name: "PRICE_MONITOR_INTERVAL_MINUTES",
      configured: Boolean(process.env.PRICE_MONITOR_INTERVAL_MINUTES?.trim()),
      defaultValue: "60",
    },
    {
      name: "PRICE_MONITOR_BATCH_SIZE",
      configured: Boolean(process.env.PRICE_MONITOR_BATCH_SIZE?.trim()),
      defaultValue: "20",
    },
  ];

  const missingRequired = requiredConfig
    .filter((c) => isProd && !c.configured)
    .map((c) => c.name);

  return {
    valid: missingRequired.length === 0,
    environment: env,
    required: requiredConfig,
    optional: optionalConfig,
    missingRequired,
  };
}
