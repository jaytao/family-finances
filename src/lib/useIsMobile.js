import { useState, useEffect } from "react";

export const MOBILE_BREAKPOINT = 768;

// Media-query hook — the app has no stylesheet (all styles are inline in `S`),
// so responsive layout is driven from JS rather than CSS breakpoints.
export default function useIsMobile() {
  const query = `(max-width: ${MOBILE_BREAKPOINT}px)`;
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}
