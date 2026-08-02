import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only plugin: injects the configured vision API key from the server environment
 * into window.__HOME_DESIGNER_AI__ at runtime via an HTML transform.
 *
 * The key is NEVER bundled into client JS assets — it exists only in the
 * dev server's memory and is injected into the served HTML response.
 * This satisfies the project rule against VITE_ variables for secrets.
 */
function injectAiConfig(enabled: boolean) {
  return {
    name: 'inject-ai-config',
    transformIndexHtml(html: string) {
      if (!enabled) return html;
      const provider = process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : undefined;
      const apiKey = provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
      if (!apiKey) return html;
      const model = provider === 'gemini'
        ? process.env.GEMINI_MODEL ?? process.env.GRAPHIFY_GEMINI_MODEL ?? 'gemini-3-flash-preview'
        : process.env.OPENAI_MODEL ?? 'gpt-4o';
      const script = `<script>window.__HOME_DESIGNER_AI__ = { apiKey: ${JSON.stringify(apiKey)}, provider: ${JSON.stringify(provider)}, model: ${JSON.stringify(model)} };</script>`;
      return html.replace('<div id="root">', `${script}\n<div id="root">`);
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), injectAiConfig(command === 'serve')],
}));
