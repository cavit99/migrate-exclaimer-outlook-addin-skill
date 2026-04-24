# Microsoft 365 Deployment

## Admin Deployment Is Not Optional

Event-based Outlook add-ins only auto-run reliably when deployed by an admin. Sideloading is useful for developer smoke tests, but treat Microsoft 365 admin deployment as part of v1 testing.

Admin path:

```text
Microsoft 365 admin center
-> Settings
-> Integrated apps
-> Upload custom apps
-> Upload manifest
-> Assign pilot user/group
```

## Version Discipline

The manifest `<Id>` stays stable. The manifest `<Version>` changes whenever the manifest changes.

Bump for:

- URL changes.
- Permission changes.
- Adding/removing command buttons.
- Adding/removing launch events.
- Requirement set changes.
- Icon or metadata changes that Outlook may cache.

Config-only changes in `signatures.json` do not require a manifest bump.

## Catalog States to Confirm

After upload/update, confirm:

- Product ID matches the manifest GUID.
- Version matches the live manifest.
- Status is `Ok`.
- Default state is expected, often `Mandatory` for a private pilot.
- The pilot user or group is assigned.
- `AutorunLaunchEvents` includes `OnNewMessageCompose`.
- Only one service principal exists for the add-in display name.

## Advanced Catalog Update

Prefer the admin center when possible. If automating with an already-authenticated admin session, the Microsoft 365 private catalog API used by the admin tooling can update an existing add-in from a manifest URL.

Use only with explicit admin authorization:

```bash
export PRODUCT_ID="00000000-0000-0000-0000-000000000000"
export MANIFEST_URL="https://sign.example.com/manifest.xml"
export TOKEN="$(az account get-access-token --resource https://portal.office.com --query accessToken -o tsv)"

python3 - <<'PY'
import json, os, urllib.request

headers = {
    "Authorization": "Bearer " + os.environ["TOKEN"],
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "PowerShell",
}

body = {
    "ProductId": os.environ["PRODUCT_ID"],
    "AddInUrl": os.environ["MANIFEST_URL"],
    "AddInContents": None,
    "Locale": "en-US",
}

req = urllib.request.Request(
    "https://portal.office.com/admin/api/privatecatalog/UpdateAddIn",
    data=json.dumps(body).encode(),
    headers=headers,
    method="PUT",
)
print(urllib.request.urlopen(req, timeout=60).read().decode())
PY
```

Then verify:

```bash
python3 - <<'PY'
import json, os, urllib.request
headers = {
    "Authorization": "Bearer " + os.environ["TOKEN"],
    "Content-Type": "application/json",
    "Accept": "application/json",
}
body = {"ProductIds": [os.environ["PRODUCT_ID"]], "GetFullDetails": True, "Locale": "en-US"}
req = urllib.request.Request(
    "https://portal.office.com/admin/api/privatecatalog/GetAddInDetails",
    data=json.dumps(body).encode(),
    headers=headers,
)
print(json.dumps(json.loads(urllib.request.urlopen(req, timeout=30).read()), indent=2))
PY
```

This API may change. If it fails, use the admin center or the supported `O365CentralizedAddInDeployment` PowerShell module.

## Propagation Expectations

Outlook web and mobile can take time to refresh admin-deployed add-ins. Hard refresh, sign out/in, restart Outlook mobile, and wait before assuming code is broken. Use the visible command button to confirm deployment visibility separately from automatic launch.
