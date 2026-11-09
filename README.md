# Cloud Janitor Dashboard

A personal dashboard that stops forgotten AWS EC2 instances before they run up a bill.
Each instance gets a TTL tag. Before the TTL ends you get an email (AWS SNS). When it ends,
the instance is stopped, and after a grace period it is deleted. The dashboard shows live
countdowns and savings, and lets you Extend, Stop or Delete an instance.

> **Status:** prototype. The dashboard runs on mock data, so it works without an AWS account. The Python (boto3) backend is in progress.

Built as my Final Year Project.

## Run it

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the link shown in the terminal (usually http://localhost:5173). Stop it with Ctrl+C.

First you see **Connect your AWS account**. Click **Try it with example keys**, then
**Test connection** and **Continue**. These are AWS's official fake example keys.

`npm run check` runs a quick self-check of the lifecycle rules.

## Pages

| Page | What it shows |
|---|---|
| Connect | Paste AWS access keys, with a how-to for Learner Lab and normal AWS accounts |
| Instances | Live countdowns, status, Extend / Stop / Delete, details popup, bulk actions |
| Savings | Monthly savings, saved per day, how it was saved, savings per instance |
| Alerts | Every email SNS sent, grouped by day, with the full email text |
| Settings | Lifecycle rules, dry run, protect tag, email, AWS connection, CSV export |

The **Demo speed** switch in the sidebar runs the clock at 60x, so you can watch an
instance get its warning, stop, and be deleted within a few minutes.
Settings such as the warning time, grace period and dry run change how the demo behaves.

## AWS access keys

Cloud Janitor connects with AWS access keys (AWS's API keys).

- **Learner Lab:** AWS Details, then Show next to AWS CLI. Copy the whole block. These keys expire when the lab session ends.
- **Your own AWS account:** create an IAM user called `cloud-janitor` with only these permissions:
  `ec2:DescribeInstances`, `ec2:CreateTags`, `ec2:StopInstances`, `ec2:TerminateInstances`, `sns:Publish`.
  Never use root account keys.

Keys are handled by the backend and saved to `~/.aws/credentials` on your computer.
The browser only remembers non-secret details (region and the last 4 characters of the key).
Never commit keys to GitHub.

## Project structure

```
src/
  App.jsx                 page routing, shared state, theme
  pages/                  Connect, Instances, Savings, Alerts, Settings
  components/             Sidebar, top bar, shared UI pieces, icons
  lib/lifecycle.js        lifecycle rules: warning, auto stop, grace period, delete, savings
  lib/alerts.js           email templates sent through SNS
  lib/format.js           time and money formatting
  data/mock.js            mock instances, alerts and savings
  api/client.js           REST endpoints for the Python backend (not wired yet)
  styles.css              light and dark theme, all styles
```

## Connecting the backend

The Python (boto3) backend will expose the endpoints listed in `src/api/client.js`
and store alert history and savings in a local SQLite file (`janitor.db`).
Set `VITE_API_URL` in a `.env` file to point the dashboard at it.
