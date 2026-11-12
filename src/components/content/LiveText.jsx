/**
 * FILE: LiveText.jsx
 *
 * Renders a string inside a span KEYED ON THE STRING, so every new message
 * is a brand-new DOM node. Google Translate only translates text when it
 * first enters the page — text React swaps inside an existing node stays
 * English on a translated page (a11y checklist #34, 2026-10-13). Use it for
 * any text that changes after load, especially live-region messages.
 *
 *   <div role="status" aria-live="polite"><LiveText>{message}</LiveText></div>
 */
export default function LiveText({ children }) {
  const text = children == null || children === false ? '' : String(children);
  if (!text) return null;
  return <span key={text}>{text}</span>;
}
