import { validateWebhookSecret } from "../../_shared/telegram.ts";

export async function validateSecret(secret: string | null): Promise<boolean> {
  return await validateWebhookSecret(secret);
}