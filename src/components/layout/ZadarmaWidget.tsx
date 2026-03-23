import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";

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

export function ZadarmaWidget() {
  const { profile, loading } = useAuth();
  const { isClient } = useRole();
  const initialized = useRef(false);

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
        // 1. Pobierz dynamiczny klucz WebRTC z Edge Function
        const { data, error } = await supabase.functions.invoke('zadarma-webrtc-key', {
          body: { sip: currentSip }
        });

        if (error) {
          console.error("[ZadarmaWidget] Edge Function error:", error);
          return;
        }

        if (!data?.success || !data?.key) {
          console.error("[ZadarmaWidget] Nie udało się pobrać klucza WebRTC:", data?.details || data?.error);
          return;
        }

        console.log("[ZadarmaWidget] Klucz WebRTC pobrany pomyślnie");

        // 2. Załaduj skrypty Zadarmy dopiero po otrzymaniu klucza
        await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1");
        await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1");

        await new Promise<void>((resolve) => {
          const check = () => {
            if (window.zadarmaWidgetFn) resolve();
            else setTimeout(check, 200);
          };
          check();
        });

        // 3. Inicjalizacja widgetu z dynamicznym kluczem
        window.zadarmaWidgetFn!(
          data.key,
          currentSip,
          "square",
          "pl",
          true,
          { right: "10px", bottom: "5px" }
        );
        initialized.current = true;
        console.log("[ZadarmaWidget] Widget zainicjalizowany pomyślnie");
      } catch (e) {
        console.error("[ZadarmaWidget] Błąd ładowania widgetu:", e);
      }
    })();
  }, [loading, hasSip, sipLogin, isClient]);

  return null;
}
