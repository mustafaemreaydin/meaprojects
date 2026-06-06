export default function ImmersiveLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--bg)] text-text">{children}</div>;
}
