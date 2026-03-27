import { useEffect, useRef, useCallback } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SCRIPT_LIB_URL = "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1";
const SCRIPT_FN_URL = "https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1";
const SCRIPT_LIB_ID = "zadarma-webphone-lib";
const SCRIPT_FN_ID = "zadarma-webphone-fn";

declare global {
  interface Window {
    zadarmaWidgetFn?: (
      key: string, sip: string, design: string, lang: string, autoInit: boolean, position: Record<string, string>
    ) => void;
    zadarmaOuterCall?: (number: string) => void;
  }
}

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(s);
  });
}

export function makeCall(number: string) {
  const cleaned = number.replace(/\D/g, "");
  if (!cleaned) { console.warn("[ZadarmaWebPhone] Empty number"); return; }

  if (typeof window.zadarmaOuterCall === "function") {
    window.zadarmaOuterCall(cleaned);
    return;
  }

  const iframe = document.getElementById("zadarma-webphone-iframe") as HTMLIFrameElement | null;
  if (iframe?.contentWindow) {
    try {
      iframe.contentWindow.postMessage({ action: "call", number: cleaned }, "*");
    } catch (e) {
      console.error("[ZadarmaWebPhone] iframe call failed:", e);
    }
    return;
  }

  console.warn("[ZadarmaWebPhone] Widget not ready, cannot make call");
}

interface ZadarmaWebPhoneProps {
  showTestButton?: boolean;
  testNumber?: string;
}

export function ZadarmaWebPhone({ showTestButton = false, testNumber = "" }: ZadarmaWebPhoneProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        // 1. Load scripts sequentially
        await loadScript(SCRIPT_LIB_ID, SCRIPT_LIB_URL);
        await loadScript(SCRIPT_FN_ID, SCRIPT_FN_URL);
        console.log("[ZadarmaWebPhone] Scripts loaded");

        // 2. Fetch key from edge function
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const res = await fetch(
          "https://wdsgtbdqgtwnywvkquhd.supabase.co/functions/v1/zadarma-webrtc-key",
          {
            headers: {
              Authorization: `Bearer ${token || ""}`,
              apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkc2d0YmRxZ3R3bnl3dmtxdWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjgyMjEsImV4cCI6MjA4OTQwNDIyMX0.jDOtnSauyl-r6WS-XUJm-uQD0-8Tw31l_IovsO2Lfps",
            },
          }
        );

        if (!res.ok) {
          console.error("[ZadarmaWebPhone] Edge function error:", res.status);
          return;
        }

        const json = await res.json();
        if (!json.key) {
          console.warn("[ZadarmaWebPhone] No key returned:", json);
          return;
        }

        // 3. Initialize widget
        if (typeof window.zadarmaWidgetFn === "function") {
          window.zadarmaWidgetFn(json.key, "504768-500", "square", "ru", true, {
            right: "10px",
            bottom: "5px",
          });
          console.log("[ZadarmaWebPhone] Widget initialized");
        } else {
          console.error("[ZadarmaWebPhone] zadarmaWidgetFn not available after script load");
        }
      } catch (err) {
        console.error("[ZadarmaWebPhone] Init error:", err);
      }
    })();
  }, []);

  const handleTestCall = useCallback(() => {
    makeCall(testNumber || "48123456789");
  }, [testNumber]);

  if (!showTestButton) return null;

  return (
    <Button
      onClick={handleTestCall}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Phone className="h-4 w-4" />
      Zadzwoń do klienta
    </Button>
  );
}
