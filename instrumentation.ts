export async function register() {
  // Yalnızca Node.js runtime'da çalıştır (Edge runtime'da değil)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/jobs/scheduler");
    await startScheduler();
  }
}
