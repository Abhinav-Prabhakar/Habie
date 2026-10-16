// Habie configuration.
//
// chatEndpoint: when set, the buddy sends each message to this URL as
//   POST { message, image, history: [{ role, content }], context }
// and expects JSON back: { reply: "text", actions?: [{ label, href }] }.
// Leave it empty to use the built-in offline responder.
export const CONFIG = {
  chatEndpoint: '',
  chatHeaders: {},
};
