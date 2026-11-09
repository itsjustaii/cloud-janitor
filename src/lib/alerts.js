// Email text the janitor sends through SNS. The backend uses the same templates
// and saves every alert it sends in the SQLite `alerts` table.
import { formatTime } from './format.js';

const HOUR = 3_600_000;

export const ALERT_KINDS = {
  warn: { label: 'Expiry warning' },
  stop: { label: 'Stopped automatically' },
  manual: { label: 'Stopped by you' },
  delete: { label: 'Deleted' },
  extend: { label: 'TTL extended' },
  dryrun: { label: 'Dry run' },
};

export function buildAlert(id, kind, inst, at, extra = {}) {
  const { name, type } = inst;
  const ref = `${name} (${inst.id}, ${type})`;
  const t = formatTime;
  let subject, summary, body;

  switch (kind) {
    case 'warn': {
      const stopAt = extra.stopAt ?? at + 30 * 60_000;
      subject = `[Cloud Janitor] ${name} stops at ${t(stopAt)}`;
      summary = `${name} stops at ${t(stopAt)} unless extended`;
      body = `Hi,\n\nYour instance ${ref} reaches its TTL at ${t(stopAt)} and will be stopped.\n\nNeed it longer? Open Cloud Janitor and choose Extend.\nIf you do nothing, it is stopped at ${t(stopAt)} and deleted after the grace period.`;
      break;
    }
    case 'stop':
    case 'manual': {
      const deleteAt = extra.deleteAt ?? at + 2 * HOUR;
      subject = `[Cloud Janitor] ${name} has been stopped`;
      summary = kind === 'stop'
        ? `${name} reached its TTL. Deletes at ${t(deleteAt)}`
        : `You stopped ${name} early. Deletes at ${t(deleteAt)}`;
      body = `Hi,\n\n${ref} was stopped at ${t(at)}${kind === 'stop' ? ' because its TTL expired.' : ' from the dashboard.'} Compute billing has ended.\n\nIt will be permanently deleted at ${t(deleteAt)}. To keep it, open Cloud Janitor and choose Restart.`;
      break;
    }
    case 'delete':
      subject = `[Cloud Janitor] ${name} has been deleted`;
      summary = extra.manual ? `You deleted ${name} from the dashboard` : `${name} was terminated after its grace period`;
      body = `Hi,\n\n${ref} was terminated at ${t(at)}${extra.manual ? ' from the dashboard.' : ' after its grace period ended.'} Its disk has been deleted.\n\nNo action is needed.`;
      break;
    case 'dryrun':
      subject = `[Cloud Janitor] Dry run: ${name} would be ${extra.action}`;
      summary = `Dry run is on, so ${name} was not ${extra.action}`;
      body = `Hi,\n\nDry run is on. The janitor would have ${extra.action} ${ref} at ${t(at)}, but made no change.\n\nTurn off dry run in Settings to let the janitor act.`;
      break;
    default: // extend
      subject = `[Cloud Janitor] ${name} TTL extended`;
      summary = `You extended ${name} to ${t(extra.newEnd)}`;
      body = `Hi,\n\nThe TTL for ${ref} was extended. It now expires at ${t(extra.newEnd)}.\n\nYou will get another warning before then.`;
  }

  return { id, at, kind, instance: name, subject, summary, body, msgId: `${inst.id.slice(2, 10)}-${(4096 + id * 977).toString(16)}-4b2e` };
}
