# Security and Risk

## What This Approach Protects

Compared with a relay-based signature product, this design keeps mail transport direct through Microsoft 365. The add-in does not need to sit in the mail path, rewrite messages in transit, or receive every outbound message.

For v1, avoid:

- Graph permissions.
- EWS permissions.
- Server-side API endpoints.
- Databases.
- Telemetry containing message content.
- Send hooks that can block mail.

## Remaining Risks

The static host is still trusted code. If someone compromises the GitHub repo, GitHub Actions, Azure Static Web App, or custom domain, they could change the JavaScript that runs in Outlook compose. With `ReadWriteItem`, malicious code could alter the current draft body through supported Office APIs.

The hosted logo/image URL is also trusted presentation content. If the image is replaced, recipients may see the wrong brand asset.

## Mitigations

- Keep the repo private when it contains customer config.
- Require MFA for GitHub, Azure, and Microsoft 365 admins.
- Restrict who can push to the deployment branch.
- Review changes to `manifest.xml`, runtime JS, and config before deploy.
- Use minimal `ReadWriteItem` permission.
- Keep all add-in files on one HTTPS origin.
- Use no secrets in the static site.
- Keep config static unless failures justify adding an API.
- Prefer hosted images for v1; use inline CID only after rollout is stable.

## SLA Meaning

An SLA is a contractual availability target from the hosting provider. It does not make the signature code better; it changes the reliability promise for the host.

If the host is down:

- Mail still sends.
- The event add-in may not launch or may fail to fetch config.
- The signature may be missing.

Free Azure Static Web Apps is usually acceptable for small signature deployments where missing a signature during a rare host outage is tolerable. Upgrade to Standard if the user wants an SLA or Standard-only network controls.

## Permissions Explanation

`ReadWriteItem` lets the add-in read/write the current Outlook item it is running on. It is narrower than `ReadWriteMailbox`, which would be excessive for static signature insertion.

The add-in should not request broad mailbox, Graph, or EWS permissions unless a later feature truly requires them.
