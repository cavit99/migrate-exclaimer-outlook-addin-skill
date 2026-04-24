# Implementation Playbook

## Table of Contents

- Inputs to collect
- Folder shape
- Manifest rules
- Runtime rules
- Buildless project checks
- Production rollout order

## Inputs to Collect

Collect these before changing anything:

- Customer domain for the add-in host, for example `sign.example.com`.
- Approved signature design: screenshot, HTML, brand guidelines, required contact fields, legal footer copy, logo/social icon requirements, light/dark expectations, and new-mail vs reply/forward variants.
- Sender email addresses and display data for each signature.
- Logo PNG/JPG and desired rendered width.
- Outlook clients in scope: web, Mac new UI, iOS, Android, new Windows, classic Windows.
- Microsoft 365 admin account and Azure/GitHub access model.
- Whether any users send from aliases, shared mailboxes, or multiple Exchange accounts.
- Whether old Outlook signatures and Exclaimer are still active.

Do not assume the signature should look like a previous implementation. The customer must provide or approve the style.

## Folder Shape

Use a static-only site first:

```text
site/
  manifest.xml
  index.html
  staticwebapp.config.json
  src/runtime/
    autorunweb.html
    autorunshared.js
  config/
    signatures.json
  assets/
    logo.png
    icon-16.png
    icon-32.png
    icon-64.png
    icon-80.png
    icon-128.png
```

Keep everything on one HTTPS origin. This avoids unnecessary CORS complexity and keeps the manifest, runtime, config, and images easy to audit.

## Manifest Rules

- Generate a fresh GUID for `<Id>` and keep it stable forever.
- Start at `<Version>1.0.0.0</Version>`.
- Bump the manifest version for every manifest change, including URL, permission, command, or launch event changes.
- Use `ReadWriteItem` for a signature-only add-in.
- Add `Runtimes` with an HTML runtime and JavaScript override.
- Add `LaunchEvent Type="OnNewMessageCompose"` for desktop and mobile form factors.
- Add a `MessageComposeCommandSurface` button that executes the same signature handler for diagnostics/manual fallback.
- Include `FunctionFile` for the command surface.
- Use add-in-only XML when Mac/mobile support matters.

## Runtime Rules

- Put all event logic in the single JavaScript file referenced by the runtime override.
- Avoid imports and bundlers for v1.
- Avoid `async`/`await` if classic Windows support matters.
- Call `Office.actions.associate("applySignature", applySignature)` in the event JavaScript.
- Call `event.completed()` on every path, including config failures and unknown senders.
- Fetch config with an absolute HTTPS URL and `cache: "no-store"`.
- Key `signatures.json` users by lower-case sender email address.
- Use `body.setSignatureAsync(...)`, not append/prepend.
- Add `console.warn` diagnostics for unknown sender, fetch/parse failure, set failure, client signature still enabled, missing From API, and missing compose type API.
- Keep customer style out of the JavaScript where practical. Put the new-mail and reply signature HTML in `signatures.json` templates, then let JavaScript perform token replacement and safe escaping.
- Replace sample template labels, colors, layout, legal copy, and contact fields with the customer-approved version before rollout.

## Template Tokens

The starter config supports `{{tokenName}}` placeholders inside `templates.newMail` and `templates.reply`.

Common escaped data tokens:

```text
{{displayName}}
{{title}}
{{phone}}
{{mobile}}
{{email}}
{{websiteLabel}}
{{logoAlt}}
```

Common prebuilt HTML/safe URL tokens:

```text
{{emailHref}}
{{websiteHref}}
{{logoImg}}
{{phoneLine}}
{{mobileLine}}
{{emailLine}}
{{websiteLine}}
{{footerHtml}}
```

If a customer's design needs different fields, add them to each user object and reference them with `{{fieldName}}`, or add a small prebuilt token in the runtime if the value must be HTML.

## Buildless Project Checks

Run:

```bash
python3 -m json.tool site/config/signatures.json >/tmp/signatures.json
node --check site/src/runtime/autorunshared.js
npx --yes office-addin-manifest validate site/manifest.xml
```

Then curl live files after deploy:

```bash
curl -I https://sign.example.com/manifest.xml
curl -I https://sign.example.com/src/runtime/autorunshared.js
curl -I https://sign.example.com/config/signatures.json
curl -I https://sign.example.com/assets/logo.png
```

Expect XML/JS/JSON/PNG MIME types. Use no-cache for manifest/runtime, no-store for config, and cacheable headers for images.

## Production Rollout Order

1. Build and deploy static site to Azure Static Web Apps.
2. Add custom subdomain and wait for TLS.
3. Validate live manifest/runtime/config/logo.
4. Upload manifest through Microsoft 365 admin center Integrated apps.
5. Assign one pilot user.
6. Confirm catalog version and assignment.
7. Test visibility with the compose command button.
8. Test automatic insertion on new mail, reply, and forward.
9. Test sent output in Outlook and Gmail web.
10. Remove or disable Exclaimer only after the new path is proven for the pilot.
