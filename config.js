// Habie configuration.
//
// The buddy talks to an OpenAI-compatible chat API and can change the app through tool calls.
// The API key is never committed. The GitHub Pages deploy (.github/workflows/pages.yml) fills in
// apiKeyEncoded from the VOIDAI_API_KEY repository secret; locally, paste a key in
// Settings → Buddy brain (kept in that browser only, and it wins over the deployed one).
// models are tried in order; the next one is used if a call fails.
//
// chatEndpoint (optional): send each message to your own server instead, as
//   POST { message, image, history: [{ role, content }], context }
// expecting JSON back: { reply: "text", actions?: [{ label, href }] }.
export const CONFIG = {
  apiBase: 'https://api.voidai.app/v1',
  apiKeyEncoded: '',   // set at deploy time: base64 of the reversed key
  models: ['gpt-4.1-mini', 'gpt-4o-mini'],
  chatEndpoint: '',
  chatHeaders: {},
};
