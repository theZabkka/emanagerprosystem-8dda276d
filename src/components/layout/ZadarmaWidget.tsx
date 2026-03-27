import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    zadarmaWidgetFn?: (
      key: string,
      sip: string,
      design: string,
      lang: string,
      autoInit: boolean,
      position: Record<string, string>
    ) => void;
  }
}

export function ZadarmaWidget() {
  const { profile } = useAuth();
  const initialized = useRef(false);

  const sipLogin = profile?.zadarma_sip_login;

  useEffect(() => {
    if (!sipLogin || initialized.current) return;
    initialized.current = true;

    const initZadarma = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("zadarma-webrtc-key", {
          body: { sip: sipLogin },
        });

        if (error || !data?.key) {
          console.error("[ZadarmaWidget] Błąd pobierania klucza:", error || data);
          return;
        }

        const webrtcKey = data.key;

        // Load base library
        const scriptLib = document.createElement("script");
        scriptLib.src =
          "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1";
        document.body.appendChild(scriptLib);

        scriptLib.onload = () => {
          // Load widget launcher after base library
          const scriptFn = document.createElement("script");
          scriptFn.src =
            "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1";
          document.body.appendChild(scriptFn);

          scriptFn.onload = () => {
            if (window.zadarmaWidgetFn) {
              window.zadarmaWidgetFn(
                webrtcKey,
                sipLogin,
                "square",
                "pl",
                true,
                { right: "10px", bottom: "5px" }
              );
            }
          };
        };
      } catch (err) {
        console.error("[ZadarmaWidget] Wyjątek podczas inicjalizacji:", err);
      }
    };

    initZadarma();
  }, [sipLogin]);

  return null;
}
