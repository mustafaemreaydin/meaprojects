"use client";

import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardContent className="space-y-6 py-5">
        <div>
          <label className="caption">Theme</label>
          <div className="mt-2 flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  "rounded-md border px-4 py-2 text-[13.5px] transition-colors",
                  (theme ?? "system") === t.id
                    ? "border-ink-400 bg-ink-100 text-ink-900 dark:bg-ink-700 dark:text-paper-100"
                    : "border-ink-100 text-text hover:bg-paper-200 dark:border-ink-600 dark:hover:bg-ink-700"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
