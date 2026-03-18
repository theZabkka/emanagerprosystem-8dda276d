export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
      🎭 Tryb demo — wyświetlane są przykładowe dane testowe.
      <a href="/settings" className="underline font-medium ml-1">Zmień w Ustawieniach</a>
    </div>
  );
}
