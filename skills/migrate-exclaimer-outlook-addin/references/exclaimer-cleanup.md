# Exclaimer Cleanup

## Rule

Do not remove Exclaimer until the replacement add-in has passed pilot testing, unless the user explicitly asks to remove it immediately. Always gather evidence first.

## Audit Areas

Check these places:

- DNS records: MX, SPF TXT, DKIM/CNAME, DMARC notes.
- Exchange Online connectors: inbound and outbound connectors.
- Exchange transport/mail-flow rules.
- Microsoft 365 integrated apps.
- Entra enterprise applications/service principals.
- Entra app registrations, including deleted apps.
- User Outlook signatures and mobile signatures.

## DNS Checks

Use the customer domain:

```bash
dig MX example.com
dig TXT example.com
dig TXT _dmarc.example.com
```

Look for Exclaimer-specific MX routing, SPF includes, or CNAMEs. Do not remove SPF mechanisms unless mail is no longer routed through that sender.

## Exchange Online Checks

Use Exchange Online PowerShell:

```powershell
Connect-ExchangeOnline

Get-InboundConnector | Format-Table Name,Enabled,SenderDomains,ConnectorSource
Get-OutboundConnector | Format-Table Name,Enabled,RecipientDomains,SmartHosts

Get-TransportRule |
  Where-Object {
    $_.Name -match 'exclaimer' -or
    ($_.Description -match 'exclaimer') -or
    ($_.RedirectMessageTo -match 'exclaimer') -or
    ($_.RouteMessageOutboundConnector -match 'exclaimer')
  } |
  Format-List Name,State,Mode,Description,RedirectMessageTo,RouteMessageOutboundConnector
```

Disable before deleting if there is any uncertainty:

```powershell
Disable-TransportRule -Identity "Rule Name"
Disable-OutboundConnector -Identity "Connector Name"
```

## Entra / Microsoft 365 App Checks

Use Graph/Azure CLI if available:

```bash
az ad sp list --all --query "[?contains(tolower(displayName), 'exclaimer')].[id,appId,displayName]" -o table
az ad app list --all --query "[?contains(tolower(displayName), 'exclaimer')].[id,appId,displayName]" -o table
```

Before deleting service principals, inspect delegated grants and app role assignments. Removing an enterprise app can break remaining Exclaimer management or sync functionality if the tenant still depends on it.

## Migration Cutover

Recommended order:

1. Leave Exclaimer running while building the Outlook add-in.
2. Pilot the add-in on one mailbox.
3. Disable Outlook built-in signatures for the pilot user.
4. Confirm no duplicate Exclaimer/client signatures.
5. Disable Exclaimer transport rules/connectors for the pilot path if applicable.
6. Send external test messages and inspect headers/body.
7. Only then remove Exclaimer apps/connectors/rules.

## Common Clue

If a signature with old social icons appears but the new runtime code has no social icon HTML, it is not coming from the new add-in. Check Exclaimer remnants, saved Outlook signatures, mobile device signatures, or another signature add-in.
