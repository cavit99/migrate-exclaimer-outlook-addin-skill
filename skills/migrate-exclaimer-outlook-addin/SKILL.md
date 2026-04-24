---
name: migrate-exclaimer-outlook-addin
description: Build and troubleshoot a private Outlook event-based signature add-in as an Exclaimer replacement, hosted on Azure Static Web Apps with an add-in-only XML manifest, OnNewMessageCompose, static signature JSON, Microsoft 365 admin deployment, DNS, Exclaimer cleanup, security review, and cross-client testing. Use when migrating away from Exclaimer or another signature relay, creating an Outlook signature add-in, diagnosing missing or duplicate Outlook signatures, provisioning Azure Static Web Apps/GitHub/Microsoft 365 deployment, or explaining client-side signature risks and limits.
---

# Migrate Exclaimer Outlook Add-in

## Operating Model

Build a client-side Outlook add-in, not a mail relay. Mail should continue flowing directly through Microsoft 365. The add-in only edits the compose body inside supported Outlook clients.

Use this default v1 architecture unless the user explicitly asks for more:

```text
Outlook compose opens
-> OnNewMessageCompose launches the add-in in the background
-> runtime reads From address and compose type
-> runtime fetches /config/signatures.json over HTTPS
-> runtime builds hosted-image HTML
-> body.setSignatureAsync(...)
-> event.completed()
```

Keep v1 static-only: no Graph, no EWS, no backend database, no telemetry endpoint, no send hook, no mail transport rule, no Exclaimer relay, and no automatic disabling of saved Outlook signatures unless the user accepts the consequences.

Treat signature design as customer-supplied input. Do not reuse a previous customer's layout, copy, phone numbers, legal footer, logo size, colors, or social links. The starter template is only a working scaffold; replace `config.signatures.json` templates and user data with the customer's approved signature HTML/content.

## Critical Choices

- Use the add-in-only XML manifest when Mac or mobile Outlook support matters.
- Use `ReadWriteItem`, not `ReadWriteMailbox`, for a signature-only add-in.
- Use `OnNewMessageCompose` for new mail, replies, reply-all, and forwards.
- Always include `Office.actions.associate("handlerName", handlerFunction)` in the event JavaScript file.
- Always call `event.completed()` on every success and failure path.
- Keep event code in one plain JavaScript file with no imports. Avoid `async`/`await` if classic Windows Outlook support matters.
- Use absolute URLs in event-handler fetches because classic Windows can load the JavaScript file directly.
- Add a compose command button that runs the same signature function manually. It is a diagnostic/manual fallback, not the intended daily workflow.
- Use hosted PNG/JPG images for v1. Defer inline CID images until the basic rollout is stable.
- Tell users to disable their built-in Outlook signatures. Do not call `disableClientSignatureAsync` in v1 unless the user explicitly wants client settings changed.
- Keep the runtime style-agnostic. It should fetch data, choose new-mail vs reply template, replace tokens, escape values, and call Outlook APIs; it should not contain customer-specific visual layout or contact details.

## Workflow

1. **Audit the current Exclaimer path.** Check DNS/MX/SPF, Exchange connectors, transport rules, Microsoft 365 apps, Entra service principals, and deleted apps. Do not delete live Exclaimer objects without clear user approval. Read `references/exclaimer-cleanup.md`.

2. **Scaffold the static add-in.** Copy `assets/site-template/site/` into the target repo, replace placeholders, add the customer logo/icon PNGs, replace the sample templates with the customer's signature design, and keep all files on one HTTPS origin. Read `references/implementation-playbook.md`.

3. **Configure Azure Static Web Apps.** Use a GitHub-backed Static Web App with `app_location: "site"`, empty API/output locations, and `skip_app_build: true`. Add a custom subdomain such as `sign.example.com`. Read `references/azure-static-webapps.md`.

4. **Deploy through Microsoft 365 admin center.** Sideloading is only smoke testing. Event-based auto-run requires admin deployment for normal private rollout. Upload the manifest through Integrated apps, assign a pilot user/group, and bump the manifest version for every manifest change. Read `references/m365-deployment.md`.

5. **Test deliberately.** Validate XML/JSON, curl live endpoints and headers, test Outlook web/Mac/mobile, send to Gmail web, check light/dark mode, and confirm no duplicate built-in Outlook signature. Use the manual button to separate deployment visibility from launch-event failures.

6. **Troubleshoot from evidence.** If the button is missing, diagnose Microsoft 365 deployment/caching. If the button works but auto-run does not, diagnose launch-event propagation and client support. If neither works, diagnose runtime JavaScript, config fetch, sender matching, permissions, or body APIs. Read `references/troubleshooting.md`.

## Resources

- `assets/site-template/`: generic static site starter with manifest/runtime/config/SWA headers. Its sample signature template is illustrative only and must be replaced or approved per customer.
- `references/security-and-risk.md`: security posture, permissions, mail-flow impact, SLA tradeoffs.
- `references/signature-html.md`: practical signature HTML guidance and rendering checks.
- `scripts/render_signature_preview.py`: create a local HTML preview from `signatures.json`.
- `scripts/check_addin_host.sh`: curl a deployed static host and report status, MIME, cache, and CORS headers.

## Validation Commands

Run these from a generated project:

```bash
npx --yes office-addin-manifest validate site/manifest.xml
python3 -m json.tool site/config/signatures.json >/tmp/signatures.json
node --check site/src/runtime/autorunshared.js
```

For a deployed host:

```bash
./scripts/check_addin_host.sh https://sign.example.com
```

## Delivery Notes

When reporting results, distinguish these states:

- **Hosted:** Azure serves the current files with correct MIME/cache/CORS headers.
- **Catalogued:** Microsoft 365 private catalog reports the expected manifest version and assignment.
- **Visible:** Outlook shows the add-in command in compose.
- **Runnable:** Clicking the command inserts the signature.
- **Automatic:** Opening new compose/reply/forward inserts the signature without clicking.

Do not claim the migration is complete until automatic insertion works in the pilot client matrix or the user explicitly accepts a narrower scope.
