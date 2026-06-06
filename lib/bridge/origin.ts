/**
 * Bridge için origin doğrulama. Tool iframe ile panel aynı origin'i paylaşır
 * (her iki taraf da meaprojects kendisi), o yüzden NEXTAUTH_URL'i kanonik
 * origin olarak kullanırız.
 */
export function getPanelOrigin(): string {
  const fromEnv = process.env.NEXTAUTH_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignore */
    }
  }
  return "http://localhost:3000";
}
