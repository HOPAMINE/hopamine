import { isZimaHost } from "./zima/domain";
import { isZimaAppContext } from "./zima/onboarding";
import { getZimaPath } from "./zima/routes";

/** Path to the stepped project onboarding wizard. */
export function getProjectOnboardingPath(hostname = "", pathname = ""): string {
  if (
    (hostname && isZimaHost(hostname)) ||
    pathname.startsWith("/zima") ||
    (typeof window !== "undefined" &&
      window.location.pathname.startsWith("/zima"))
  ) {
    return `${getZimaPath("onboard", hostname)}/project`;
  }
  return "/onboard/project";
}

export function getProjectOnboardingHref(
  hostname = "",
  params?: { from?: string },
): string {
  const base = getProjectOnboardingPath(hostname);
  if (!params?.from) return base;
  return `${base}?from=${encodeURIComponent(params.from)}`;
}

/** Where to land when leaving or finishing project onboard. */
export function getProjectOnboardingReturnPath(
  hostname = "",
  from?: string | null,
): string {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  if (from === "zima" || isZimaAppContext(pathname, hostname)) {
    return getZimaPath("search", hostname);
  }
  return "/dashboard";
}
