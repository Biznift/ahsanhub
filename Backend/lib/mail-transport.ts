export const SENDER_HOST = "api.sender.net";

export type MailTransport = "smtp" | "sender";

/** Saved rows from before Sender have no transport. The API host is the other signal. */
export function mailTransport(value: { transport?: string | null; host?: string | null }): MailTransport {
  if (value.transport === "sender" || value.transport === "smtp") return value.transport;
  return value.host?.trim().toLowerCase() === SENDER_HOST ? "sender" : "smtp";
}
