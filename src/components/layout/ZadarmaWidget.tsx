import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

declare global {
  interface Window {
    zadarmaWidgetFn?: (
      key: string,
      sip: string,
      style: string,
      lang: string,
      showFlag: boolean,
      position: { right: string; bottom: string }
    ) => void;
  }
}

const ZADARMA_PUBLIC_KEY = "6abdee0bb08c787de712";

export function ZadarmaWidget() {
  const { profile, loading } = useAuth();
  const { isClient } = useRole();
  const initialized = useRef(false);

  // Strict guard: wait until profile is fully loaded and SIP is a non-empty string
  const sipLogin = profile?.zadarma_sip_login;
  const hasSip = typeof sipLogin === "string" && sipLogin.trim().length > 0;

  useEffect(() => {
    if (loading || !hasSip || isClient || initialized.current) return;

    const currentSip = sipLogin!.trim();

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) { resolve(); return; }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    }

    (async () => {
      try {
        await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1");
        await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1");

        await new Promise<void>((resolve) => {
          const check = () => {
            if (window.zadarmaWidgetFn) resolve();
            else setTimeout(check, 200);
          };
          check();
        });

        console.log("[ZadarmaWidget] Initializing with SIP:", currentSip);
        window.zadarmaWidgetFn!(
          ZADARMA_PUBLIC_KEY,
          currentSip,
          "square",
          "pl",
          true,
          { right: "10px", bottom: "5px" }
        );
        initialized.current = true;
      } catch (e) {
        console.error("[ZadarmaWidget] Nie udało się załadować widgetu:", e);
      }
    })();
  }, [loading, hasSip, sipLogin, isClient]);

  return null;
}
