import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    zadarmaWidgetFn?: (
      key: string,
      sip: string,
      style: string,
      lang: string
    ) => void;
  }
}

export function ZadarmaWidget() {
  const { profile, user } = useAuth();
  const { isClient } = useRole();
  const [sipLogin, setSipLogin] = useState<string | null>(null);
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);
  const initialized = useRef(false);

  // 1. Fetch SIP login from profile
  useEffect(() => {
    if (!user || isClient) return;

    async function fetchSip() {
      const { data } = await supabase
        .from("profiles")
        .select("zadarma_sip_login")
        .eq("id", user!.id)
        .single();

      if (data?.zadarma_sip_login) {
        setSipLogin(data.zadarma_sip_login);
      }
    }

    fetchSip();
  }, [user, isClient]);

  // 2. Fetch WebRTC key when SIP is available
  useEffect(() => {
    if (!sipLogin) return;

    async function fetchKey() {
      try {
        const { data, error } = await supabase.functions.invoke(
          "zadarma-webrtc-key"
        );
        if (error) {
          console.warn("[ZadarmaWidget] Nie udało się pobrać klucza WebRTC:", error.message);
          return;
        }
        if (data?.error) {
          console.warn("[ZadarmaWidget] API Zadarma zwróciło błąd:", data.error);
          return;
        }
        if (data?.key) {
          setWebrtcKey(data.key);
        }
      } catch (e) {
        console.warn("[ZadarmaWidget] Nie udało się załadować widgetu telefonu. Sprawdź konfigurację API.", e);
      }
    }

    fetchKey();
  }, [sipLogin]);

  // 3. Load scripts and initialize widget
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
        document.head.appendChild(script);
      });
    }

    async function initWidget() {
      try {
        await loadScript(
          "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1"
        );
        await loadScript(
          "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1"
        );

        // Wait for zadarmaWidgetFn to be available
        const waitForWidget = () =>
          new Promise<void>((resolve) => {
            const check = () => {
              if (window.zadarmaWidgetFn) {
                resolve();
              } else {
                setTimeout(check, 200);
              }
            };
            check();
          });

        await waitForWidget();

        window.zadarmaWidgetFn!(webrtcKey!, sipLogin!, "square", "pl");
        initialized.current = true;
      } catch (e) {
        console.error("Zadarma widget init error:", e);
      }
    }

    initWidget();
  }, [webrtcKey, sipLogin]);

  // Widget renders itself via Zadarma scripts — no JSX needed
  return null;
}
