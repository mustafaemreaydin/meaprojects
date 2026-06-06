import { AppearanceForm } from "./appearance-form";

export default function AppearancePage() {
  return (
    <div className="flex flex-col gap-6 max-w-[560px]">
      <div>
        <h2 className="text-h2 text-text">Appearance</h2>
        <p className="mt-1 text-[14px] text-text-muted">Theme preferences.</p>
      </div>
      <AppearanceForm />
    </div>
  );
}
