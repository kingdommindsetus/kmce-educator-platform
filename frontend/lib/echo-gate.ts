export type EchoGateInput = {
  jobStatus: string;
  sentAt?: unknown;
  pipelineStage: string;
  email?: string | null;
  contactSourceUrl?: string | null;
  contactVerifiedAt?: unknown;
};

export type EchoGateResult =
  | {ok: true; sendEligible: true; providerConfigured: false; reason: "PROVIDER_DISABLED"}
  | {ok: false; status: 409; reason: "DUPLICATE_SEND" | "NOT_APPROVED" | "CONTACT_NOT_VERIFIED"};

export function evaluateEchoSend(input: EchoGateInput): EchoGateResult {
  if (input.jobStatus === "SENT" || Boolean(input.sentAt)) {
    return {ok: false, status: 409, reason: "DUPLICATE_SEND"};
  }
  if (input.jobStatus !== "APPROVED" || input.pipelineStage !== "APPROVED") {
    return {ok: false, status: 409, reason: "NOT_APPROVED"};
  }
  if (!input.email || !input.contactSourceUrl || !input.contactVerifiedAt) {
    return {ok: false, status: 409, reason: "CONTACT_NOT_VERIFIED"};
  }
  return {ok: true, sendEligible: true, providerConfigured: false, reason: "PROVIDER_DISABLED"};
}
