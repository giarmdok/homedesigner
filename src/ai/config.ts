/** Runtime-only configuration. Do not use VITE_ variables: those are bundled into the client. */
export type AiRuntimeConfig = {
  readonly apiKey?: string;
  readonly provider?: 'gemini' | 'openai';
  readonly model?: string;
};
declare global { interface Window { __HOME_DESIGNER_AI__?: AiRuntimeConfig } }
export const getAiRuntimeConfig = (): AiRuntimeConfig => typeof window === 'undefined' ? {} : (window.__HOME_DESIGNER_AI__ ?? {});
export const redactSecrets = (message: string, secret?: string) => secret ? message.split(secret).join('[redacted]') : message;
