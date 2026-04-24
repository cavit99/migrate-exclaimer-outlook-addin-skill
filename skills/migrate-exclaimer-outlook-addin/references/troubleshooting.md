# Troubleshooting

## Symptom Matrix

### Add-in Button Does Not Appear

Likely deployment/catalog issue.

Check:

- Microsoft 365 admin deployment completed.
- Pilot user/group is assigned.
- Manifest version in catalog matches live manifest.
- User has refreshed Outlook web, restarted Outlook desktop/mobile, or signed out/in.
- Add-in is not duplicated in private catalog.
- Manifest validates.
- Command surface exists in `DesktopFormFactor`.

### Button Appears, Manual Click Inserts Signature, Auto Does Not

Likely launch-event issue.

Check:

- Add-in was admin-deployed, not only sideloaded.
- `AutorunLaunchEvents` includes `OnNewMessageCompose`.
- `Office.actions.associate("applySignature", applySignature)` is in the event JS file.
- Handler name in manifest exactly matches the associated function.
- Runtime `<SourceLocation>` resid matches `<Runtime resid>`.
- JavaScript override points to the same event handler bundle.
- `event.completed()` is called on all paths.
- Outlook surface is standard compose, not a non-standard reply/meeting surface.
- Another event-based add-in is not delaying or interfering.

### Button Appears, Manual Click Does Nothing

Likely runtime/config/API issue.

Check:

- Browser console warnings in Outlook web.
- `config/signatures.json` is reachable and valid JSON.
- Config email key matches the sender address lower-cased.
- `setSignatureAsync` is available in that client.
- Compose body is HTML, not plain text.
- Host sends expected MIME/CORS/cache headers.
- Runtime JS has no syntax errors.

### Signature Appears Then Disappears or Duplicates

Check:

- Outlook built-in signature is still enabled.
- Another signature add-in or Exclaimer client add-in runs on compose.
- Exclaimer transport rule is still appending at send time.
- The add-in is installed twice with duplicate private catalog entries.
- The runtime is intentionally reapplying and racing with another source.

### Mobile Does Not Show Signature in Quick Reply

On mobile, a signature may be inserted but not visible in compact reply. Expand to full-screen compose. If the signature is the only draft change, Outlook may not save a draft even though the add-in inserted it.

## Cache and Refresh

After manifest changes:

- Bump manifest version.
- Update the Microsoft 365 catalog, not only the hosted file.
- Accept admin consent again if prompted.
- Refresh Outlook web.
- Restart Outlook desktop/mobile.
- Clear Office cache only after normal refresh/restart fails.

After config-only changes:

- No manifest bump is needed.
- Confirm `Cache-Control: no-store` on `signatures.json`.
- Open a new compose window.

## Live Host Checks

Use:

```bash
curl -I https://sign.example.com/manifest.xml
curl -I https://sign.example.com/src/runtime/autorunshared.js
curl -I https://sign.example.com/config/signatures.json
curl -I https://sign.example.com/assets/logo.png
```

Expect:

- `manifest.xml`: 200, `application/xml`, no-cache.
- runtime JS: 200, JavaScript MIME, no-cache.
- config JSON: 200, `application/json`, no-store.
- images: 200, image MIME, cacheable.

## Known Fragile Spots

- Microsoft 365 private catalog may keep an imported manifest copy. Updating Azure-hosted XML alone may not update the catalog version.
- Requirement set and mobile support differ. Verify current Microsoft docs for new events and mobile API support.
- Classic Outlook on Windows has stricter event-runtime JavaScript limitations.
- `setSignatureAsync` works differently in launch events: the form may not count as modified if the user makes no other edits.
