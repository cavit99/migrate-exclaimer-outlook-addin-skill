# Migrate Exclaimer to an Outlook Signature Add-in

A Codex skill for replacing Exclaimer-style email signature routing with a private Outlook event-based add-in hosted on Azure Static Web Apps.

The goal is simple: keep mail flowing directly through Microsoft 365, and let Outlook insert a clean signature in the compose window for supported Outlook clients.

## What This Is

This repository packages a reusable Codex skill:

```text
skills/migrate-exclaimer-outlook-addin/
```

The skill helps an agent:

- Audit an existing Exclaimer path before removal.
- Build a private Outlook add-in using the add-in-only XML manifest.
- Host static runtime/config/assets on Azure Static Web Apps.
- Deploy through Microsoft 365 admin center Integrated apps.
- Diagnose missing, duplicate, or delayed Outlook signatures.
- Keep the signature design customer-specific and configurable.

## What This Is Not

This is not an email relay, transport agent, Graph app, EWS app, CRM, or signature SaaS.

The default v1 design is static and minimal:

```text
Outlook compose opens
-> OnNewMessageCompose launches a background add-in
-> add-in fetches static signature config
-> add-in calls body.setSignatureAsync(...)
-> mail still sends directly through Microsoft 365
```

## Why This Approach

Exclaimer and similar tools often sit in the mail path or leave behind connectors, transport rules, and enterprise apps. For small teams that only need reliable Outlook signatures, that can be more machinery than necessary.

An Outlook event-based add-in keeps the logic at compose time. The tradeoff is that it only covers Outlook clients that support Office add-ins. It does not cover Apple Mail, Gmail, or other mail apps.

## Install The Skill

Copy the skill folder into your Codex skills directory:

```bash
mkdir -p ~/.codex/skills
cp -R skills/migrate-exclaimer-outlook-addin ~/.codex/skills/
```

Then invoke it in Codex:

```text
Use $migrate-exclaimer-outlook-addin to migrate this Exclaimer signature setup to a private Outlook add-in on Azure Static Web Apps.
```

## Required Inputs

Before building for a customer, collect:

- Add-in host domain, for example `sign.example.com`.
- Microsoft 365 admin access for Integrated apps deployment.
- Azure/GitHub access for Static Web Apps deployment.
- Approved signature design or HTML.
- Logo/images and desired image delivery approach.
- Sender email addresses and per-user signature data.
- Client matrix: Outlook web, Mac, iOS, Android, Windows classic/new.
- Exclaimer state: DNS, connectors, transport rules, enterprise apps, and user signatures.

## Included Resources

The skill includes:

- `SKILL.md`: the main operating workflow.
- `references/`: Azure, Microsoft 365, Exclaimer cleanup, security, troubleshooting, and signature HTML guidance.
- `assets/site-template/`: a generic static add-in starter.
- `scripts/check_addin_host.sh`: verify deployed MIME/cache/CORS headers.
- `scripts/render_signature_preview.py`: render local signature previews from config.

## Signature Design Is Not Hardcoded

The Outlook/Azure/Microsoft 365 machinery is reusable, but the signature style is not.

Each customer should provide or approve their own:

- HTML layout.
- Contact fields.
- Legal footer.
- Logo size and placement.
- Colors and typography.
- Social links or no social links.
- New-mail and reply/forward variants.

The starter config uses replaceable `templates.newMail` and `templates.reply` HTML strings. Treat them as smoke-test placeholders, not a design recommendation.

## Validation

From a generated add-in project:

```bash
npx --yes office-addin-manifest validate site/manifest.xml
python3 -m json.tool site/config/signatures.json >/tmp/signatures.json
node --check site/src/runtime/autorunshared.js
```

For a deployed host:

```bash
skills/migrate-exclaimer-outlook-addin/scripts/check_addin_host.sh https://sign.example.com
```

For a signature preview:

```bash
skills/migrate-exclaimer-outlook-addin/scripts/render_signature_preview.py \
  site/config/signatures.json \
  --email person@example.com \
  --output /tmp/signature-preview.html
```

## Sanitization

This public repository uses generic placeholder data only. Before publishing forks or customer-specific versions, run:

```bash
scripts/sanitize_scan.sh
```

Also scan for the customer’s company name, real domains, real phone numbers, live tenant IDs, subscription IDs, and personal email addresses.

## Security Model

The default skill guidance keeps permissions narrow:

- Use `ReadWriteItem`, not `ReadWriteMailbox`.
- Avoid Graph/EWS in v1.
- Avoid databases and telemetry in v1.
- Keep repo/Azure/Microsoft 365 admin access protected by MFA.
- Do not remove Exclaimer transport objects until the Outlook add-in passes pilot testing.

If the static host is unavailable, mail should still send, but the signature may not be inserted.

## License

MIT.
