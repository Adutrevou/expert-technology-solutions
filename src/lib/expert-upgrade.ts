import type { AuthUser } from "@/lib/auth-api";

export const EXPERT_CLIENT_SLUG = "expert-technology-solutions";
export const EXPERT_JACQUES_UPGRADE_END_AT =
  String(import.meta.env.VITE_EXPERT_JACQUES_UPGRADE_END_AT || "2026-06-09T13:00:00+02:00");
export const EXPERT_JACQUES_UPGRADE_MODE = readBooleanEnv(
  import.meta.env.VITE_EXPERT_JACQUES_UPGRADE_MODE,
  true,
);

const JACQUES_NAME_FRAGMENT = "jacques";
const JACQUES_EMAIL = "jacques.vancoller@experttechnology.co.za";

export function shouldShowExpertJacquesUpgrade(user: AuthUser | null | undefined, clientSlug: string) {
  if (!EXPERT_JACQUES_UPGRADE_MODE) return false;
  if (clientSlug !== EXPERT_CLIENT_SLUG) return false;
  if (!user) return false;
  if (user.role === "intergrai_admin" || user.role === "system_agent") return false;

  const normalizedName = normalizeToken(user.name);
  const normalizedEmail = normalizeToken(user.email);

  return normalizedName.includes(JACQUES_NAME_FRAGMENT) || normalizedEmail === JACQUES_EMAIL;
}

function readBooleanEnv(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  return fallback;
}

function normalizeToken(value: string | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
