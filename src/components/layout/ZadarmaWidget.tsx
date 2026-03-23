import { useEffect, useRef } from "react";
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

interface ZadarmaWidgetProps {
  sipLogin?: string | null;
}

export function ZadarmaWidget({ sipLogin }: ZadarmaWidgetProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!sipLogin || initialized.current) return;

    const currentSip = sipLogin.trim();
    if (!currentSip) return;

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
        const { data, error } = await supabase.functions.invoke('zadarma-webrtc-key');

        if (error || !data || data.status === 'error' || !data.key) {
          console.error("[ZadarmaWidget] Błąd pobierania klucza:", error || data);
          return;
        }

        const webrtcKey = data.key;

        await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1");
        await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1");

        await new Promise<void>((resolve) => {
          const check = () => {
            if (window.zadarmaWidgetFn) resolve();
            else setTimeout(check, 200);
          };
          check();
        });

        window.zadarmaWidgetFn!(
          webrtcKey,
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
  }, [sipLogin]);

  return null;
}
