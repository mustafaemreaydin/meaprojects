import type { Metadata } from "next";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/shared/session-provider";

export const metadata: Metadata = {
  title: "meaprojects.com",
  description: "Personal AI tool management panel.",
  icons: { icon: "/mea-dark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
