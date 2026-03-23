import { useEffect, useRef, useState } from "react";
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
  const { user } = useAuth();
  const { isClient } = useRole();
  const [sipLogin, setSipLogin] = useState<string | null>(null);
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);
  const initialized = useRef(false);

  // 1. Fetch SIP login from profile
  useEffect(() => {
    if (!user || isClient) return;

    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("zadarma_sip_login")
          .eq("id", user.id)
          .single();
        if (data?.zadarma_sip_login) {
          setSipLogin(data.zadarma_sip_login);
        }
      } catch (e) {
        console.warn("[ZadarmaWidget] Nie udało się pobrać SIP login:", e);
      }
    })();
  }, [user, isClient]);

  // 2. Fetch WebRTC key from Edge Function — NEVER throw
  useEffect(() => {
    if (!sipLogin) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "zadarma-webrtc-key",
          { body: { sip: sipLogin } }
        );

        if (error) {
          console.error("[ZadarmaWidget] Supabase invoke error:", error);
          return;
        }

        if (data?.error) {
          console.error("[ZadarmaWidget] Zadarma API error:", data.message, data);
          return;
        }

        if (data?.key) {
          setWebrtcKey(data.key);
        } else {
          console.warn("[ZadarmaWidget] Brak klucza w odpowiedzi:", data);
        }
      } catch (e) {
        console.error("[ZadarmaWidget] Nie udało się pobrać klucza WebRTC:", e);
      }
    })();
  }, [sipLogin]);

  // 3. Load scripts & initialize widget — NEVER throw
  useEffect(() => {
    if (!webrtcKey || !sipLogin || initialized.current) return;

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
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
        await loadScript(
          "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1"
        );
        await loadScript(
          "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1"
        );

        await new Promise<void>((resolve) => {
          const check = () => {
            if (window.zadarmaWidgetFn) resolve();
            else setTimeout(check, 200);
          };
          check();
        });

        window.zadarmaWidgetFn!(
          webrtcKey,
          sipLogin,
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
  }, [webrtcKey, sipLogin]);

  return null;
}
