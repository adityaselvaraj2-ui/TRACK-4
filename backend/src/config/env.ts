import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 5000),
  jwtSecret: process.env.JWT_SECRET ?? "forge-dev-secret",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "demo-gemini-key",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

export function assertRuntimeEnv(): void {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    console.warn(`[forge] Continuing in demo mode with missing env vars: ${missing.join(", ")}`);
  }
}
