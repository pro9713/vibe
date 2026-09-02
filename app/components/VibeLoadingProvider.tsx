"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import VibeLoader from "./VibeLoader";

interface VibeLoadingContextType {
  isLoading: boolean;
  startLoading: (customTagline?: string) => void;
  stopLoading: () => void;
}

const VibeLoadingContext = createContext<VibeLoadingContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export const useVibeLoading = () => useContext(VibeLoadingContext);

/**
 * Inner navigation observer wrapped in Suspense for Next.js App Router compatibility.
 */
function NavigationObserver({
  onRouteComplete,
}: {
  onRouteComplete: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onRouteComplete();
  }, [pathname, searchParams, onRouteComplete]);

  return null;
}

export function VibeLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [customTagline, setCustomTagline] = useState<string | undefined>(undefined);

  const startTimeRef = useRef<number>(0);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const stopLoading = useCallback(() => {
    const elapsed = performance.now() - startTimeRef.current;
    // Fast minimum settle duration (180ms) to ensure butter-smooth visual continuity without delaying fast navigations
    const minDisplayTime = 180;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    hideTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);
      // Wait for fade out animation (~200ms) to complete before removing from DOM
      setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        setCustomTagline(undefined);
      }, 200);
    }, remainingTime);
  }, []);

  const startLoading = useCallback((tagline?: string) => {
    clearAllTimers();
    startTimeRef.current = performance.now();
    setCustomTagline(tagline);
    setIsFadingOut(false);
    setIsVisible(true);

    // Maximum safety timeout (3.5s) to auto-dismiss if route transition hangs or was aborted
    safetyTimerRef.current = setTimeout(() => {
      stopLoading();
    }, 3500);
  }, [clearAllTimers, stopLoading]);

  // Intercept client-side link clicks and browser history navigation
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor || !anchor.href) return;

      // Ignore special modifier keys, new tab clicks, downloads, or external links
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("rel")?.includes("external")
      ) {
        return;
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Ignore different origins
        if (targetUrl.origin !== currentUrl.origin) return;

        // Ignore same exact URL (or same path hash jumps)
        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        // Trigger Vibe Loader transition
        startLoading();
      } catch {
        // Fallback safely for invalid URLs
      }
    };

    const handlePopState = () => {
      startLoading();
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      clearAllTimers();
    };
  }, [startLoading, clearAllTimers]);

  return (
    <VibeLoadingContext.Provider
      value={{
        isLoading: isVisible,
        startLoading,
        stopLoading,
      }}
    >
      <Suspense fallback={null}>
        <NavigationObserver onRouteComplete={stopLoading} />
      </Suspense>

      {children}

      {/* Global Vibe Loading Screen Overlay */}
      {isVisible && (
        <div
          aria-hidden={!isVisible}
          className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#F8F9FA]/95 backdrop-blur-md transition-all duration-200 ${
            isFadingOut
              ? "opacity-0 scale-95 pointer-events-none"
              : "opacity-100 scale-100 pointer-events-auto"
          }`}
        >
          <VibeLoader
            fullScreen={false}
            tagline={customTagline || "SMARTER DEALS. BETTER VIBES."}
            size="md"
          />
        </div>
      )}
    </VibeLoadingContext.Provider>
  );
}

export default VibeLoadingProvider;
