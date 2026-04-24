# Azure Static Web Apps

## Recommended Shape

Use Azure Static Web Apps Free for v1 unless the user requires an SLA, private networking, or Standard-only controls.

Recommended settings:

```yaml
app_location: "site"
api_location: ""
output_location: ""
skip_app_build: true
```

Use a GitHub-backed deploy. Keep the repo private if it contains customer signature data or brand assets.

## Provisioning Checklist

1. Create or choose a resource group.
2. Create a Static Web App on Free tier.
3. Connect the GitHub repo and branch.
4. Use buildless settings.
5. Let GitHub Actions deploy once.
6. Add a custom subdomain such as `sign.example.com`.
7. Add the DNS record Azure requests.
8. Wait for DNS and TLS validation.
9. Verify live URLs before Microsoft 365 upload.

For GoDaddy subdomains, the DNS record name is usually just the left-hand label such as `sign`, not the full `sign.example.com`.

## Headers

Use `staticwebapp.config.json` to control MIME and cache behavior:

```json
{
  "globalHeaders": {
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "routes": [
    {
      "route": "/manifest.xml",
      "headers": { "Cache-Control": "no-cache" }
    },
    {
      "route": "/src/runtime/*",
      "headers": { "Cache-Control": "no-cache" }
    },
    {
      "route": "/config/signatures.json",
      "headers": { "Cache-Control": "no-store" }
    },
    {
      "route": "/assets/*.{png,jpg,jpeg,svg,ico}",
      "headers": { "Cache-Control": "public, max-age=604800" }
    }
  ],
  "mimeTypes": {
    ".html": "text/html",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".xml": "application/xml"
  }
}
```

## Free vs Standard

Free is usually enough technically. The practical difference is reliability and enterprise features:

- Free has no SLA.
- Standard gives an SLA and more enterprise/network controls.
- If the static host is down, mail still sends, but the add-in cannot fetch code/config and the signature may be missing.

Do not add Azure Functions, Front Door, a database, or private networking in v1 unless there is a specific requirement.
