import logoLight from "@/assets/logo-light.svg";
import logoDark from "@/assets/logo-dark.svg";
import { useTheme } from "next-themes";

interface ThemeLogoProps {
  className?: string;
  alt?: string;
}

export function ThemeLogo({ className = "h-7 w-auto", alt = "EMANAGER.PRO" }: ThemeLogoProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? logoDark : logoLight;

  return <img src={src} alt={alt} className={className} />;
}
