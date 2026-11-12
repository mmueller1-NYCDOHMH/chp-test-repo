#!/usr/bin/env node
/**
 * FILE: scripts/notify-teams.js
 *
 * Posts a message card to a Microsoft Teams channel. Used by the data repo's
 * GitHub Actions (publish succeeded / failed, new change waiting for review).
 *
 * SETUP (once per channel): in Teams, open the channel → ••• → Workflows →
 * "Post to a channel when a webhook request is received" → copy the URL →
 * save it as the TEAMS_WEBHOOK_URL secret in the data repo.
 *
 * USAGE:
 *   TEAMS_WEBHOOK_URL=… node scripts/notify-teams.js \
 *     --status success|failure|info \
 *     --title "Publishing: Obesity 2023 update" \
 *     --text "Merged by @someone" \
 *     --url https://github.com/… --url-title "View pull request" \
 *     --url2 https://… --url2-title "View run" \
 *     --report report.json          optional: adds "what changed" facts
 *
 * Never fails the workflow: with no webhook set, or if Teams is down, it
 * prints a warning and exits 0. A notification problem must not block a publish.
 */

const fs = require('fs');

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
}

const url = process.env.TEAMS_WEBHOOK_URL;
if (!url) {
  console.log('[notify-teams] TEAMS_WEBHOOK_URL not set — skipping.');
  process.exit(0);
}

const colors = { success: 'Good', failure: 'Attention', info: 'Accent' };
const icons = { success: '✅', failure: '❌', info: '📝' };
const status = args.status || 'info';

const list = (xs, max = 6) => (xs.length > max ? `${xs.slice(0, max).join(', ')} +${xs.length - max} more` : xs.join(', '));

const facts = [];
if (args.report && fs.existsSync(args.report)) {
  try {
    const r = JSON.parse(fs.readFileSync(args.report, 'utf8'));
    const s = r.summary || {};
    if (s.updated?.length) facts.push({ title: 'Data updated', value: list(s.updated) });
    if (s.added?.length) facts.push({ title: 'New indicators', value: list(s.added) });
    if (s.removed?.length) facts.push({ title: 'Removed', value: list(s.removed) });
    if (s.timePeriods?.length) facts.push({ title: 'Time period', value: s.timePeriods.map((t) => `${t.key}: ${t.from} → ${t.to}`).join('; ') });
    if (s.copyChanged?.length) facts.push({ title: 'Copy edited', value: list(s.copyChanged.map((c) => c.key)) });
    if (s.copyAdded?.length) facts.push({ title: 'Copy rows added', value: list(s.copyAdded) });
    if (r.errors) facts.push({ title: 'Problems', value: `${r.errors} must be fixed` });
    if (r.review) facts.push({ title: 'Needs review', value: `${r.review} item(s)` });
  } catch (e) {
    console.log(`[notify-teams] Couldn't read report: ${e.message}`);
  }
}

const body = [
  { type: 'TextBlock', text: `${icons[status] || ''} ${args.title || 'Content update'}`, weight: 'Bolder', size: 'Medium', color: colors[status] || 'Default', wrap: true },
];
if (args.text) body.push({ type: 'TextBlock', text: args.text, wrap: true, spacing: 'Small' });
if (facts.length) body.push({ type: 'FactSet', facts });

const actions = [];
if (args.url) actions.push({ type: 'Action.OpenUrl', title: args['url-title'] || 'Open', url: args.url });
if (args.url2) actions.push({ type: 'Action.OpenUrl', title: args['url2-title'] || 'Details', url: args.url2 });

const payload = {
  type: 'message',
  attachments: [{
    contentType: 'application/vnd.microsoft.card.adaptive',
    contentUrl: null,
    content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4', body, actions },
  }],
};

fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  .then(async (res) => {
    if (!res.ok) console.log(`::warning::Teams notification failed: HTTP ${res.status} ${await res.text()}`);
    else console.log('[notify-teams] Sent.');
  })
  .catch((e) => console.log(`::warning::Teams notification failed: ${e.message}`));
