import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ALLOWED_ROLES = ['admin', 'superadmin', 'boss', 'koordynator', 'specjalista', 'praktykant'];
const SCRIPT_LIB_ID = 'zadarma-phone-lib';
const SCRIPT_FN_ID = 'zadarma-phone-fn';

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

  useEffect(() => {
    if (initialized.current) return;

    const role = profile?.role;
    if (!role || !ALLOWED_ROLES.includes(role)) return;

    initialized.current = true;

    const initZadarma = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("zadarma-webrtc-key");

        if (error || !data?.key) {
          // 404 = no SIP assigned, not an error worth logging loudly
          if (data?.error) console.warn("[ZadarmaWidget]", data.error);
          else console.error("[ZadarmaWidget] Błąd pobierania klucza:", error || data);
          return;
        }

        const webrtcKey = data.key;
        const sipLogin = data.sip;

        // Guard: don't inject scripts twice (memory leak prevention)
        if (document.getElementById(SCRIPT_LIB_ID)) {
          // Scripts already loaded, just re-init if function exists
          if (window.zadarmaWidgetFn) {
            window.zadarmaWidgetFn(webrtcKey, sipLogin, "square", "pl", true, { right: "10px", bottom: "5px" });
          }
          return;
        }

        // Load base library
        const scriptLib = document.createElement("script");
        scriptLib.id = SCRIPT_LIB_ID;
        scriptLib.src = "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1";
        document.body.appendChild(scriptLib);

        scriptLib.onload = () => {
          // Load widget launcher after base library
          if (document.getElementById(SCRIPT_FN_ID)) return;

          const scriptFn = document.createElement("script");
          scriptFn.id = SCRIPT_FN_ID;
          scriptFn.src = "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1";
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
  }, [profile?.role]);

  return null;
}
