import { Breadcrumb } from "./breadcrumb";
import { CommandPaletteTrigger } from "./command-palette-trigger";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-ink-100 bg-[var(--bg)]/90 backdrop-blur px-6 dark:border-ink-700">
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-2">
        <CommandPaletteTrigger />
        <ThemeToggle />
      </div>
    </header>
  );
}
