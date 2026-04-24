# Scope and Fit

## Plain-English Positioning

This skill builds a private Outlook signature add-in that inserts signatures in the compose window. It is a practical way to remove relay-style signature infrastructure for teams whose real requirement is "good clean signatures in Outlook."

It is not a full Exclaimer clone. Exclaimer-like products can provide server-side stamping, directory sync, campaign controls, delegated admin workflows, analytics, and coverage for mail sent outside Outlook. The v1 add-in intentionally does not.

## Good Fit For V1

Use the static add-in pattern when:

- Outlook clients are the supported sending surface.
- The organization is small enough that static JSON is acceptable at first.
- Signature layout is one approved design or a small set of approved variants.
- The customer wants mail to flow directly through Microsoft 365.
- Low cost, narrow permissions, and simple hosting matter more than a full signature platform.
- Missing a signature during a rare static-host outage is acceptable.
- A human can review and deploy signature-data changes.

## Poor Fit For V1

Do not sell the static v1 as sufficient when the customer needs:

- Signatures on messages sent from Apple Mail, Gmail, SMTP apps, scanners, CRMs, or non-Outlook clients.
- Server-side legal/compliance disclaimers regardless of client or add-in availability.
- Automatic live sync from Entra ID, HR, CRM, or another directory.
- Department, office, language, campaign, recipient, or time-based rule targeting.
- Central admin UI, delegated editing, approval flows, or audit trails.
- Marketing banner rotation, click analytics, or campaign reporting.
- Guaranteed behavior when users are offline or the static host is unreachable.
- Complex shared mailbox, alias, or multi-account behavior without additional event handling.

For those cases, keep a server-side product or design a v2 with backend services and operational ownership.

## How Contact Details Are Fetched

The add-in fetches one static config file from the add-in host:

```text
https://sign.example.com/config/signatures.json
```

The runtime asks Outlook for the current From address, lowercases it, and uses it as the lookup key:

```text
users["person@example.com"]
```

That user object supplies fields such as display name, title, phone numbers, website, logo alt text, and optional custom fields. The config also contains HTML templates for new mail and replies/forwards. The runtime replaces template tokens, then calls `body.setSignatureAsync(...)`.

The source of truth for v1 is therefore the static JSON file. If the customer wants details to come from Entra ID, HR, a spreadsheet, or another system, add an explicit generation/sync step. Do not imply the default skill has live directory sync.

## Multiple Users

Multiple users are handled by adding multiple keys under `users`:

```json
{
  "users": {
    "person@example.com": {
      "displayName": "Person Example",
      "title": "Producer",
      "email": "person@example.com"
    },
    "colleague@example.com": {
      "displayName": "Colleague Example",
      "title": "Head of Production",
      "email": "colleague@example.com"
    }
  }
}
```

Each sender address that should get a signature needs a matching entry. For shared mailboxes and aliases, either add explicit entries for those addresses or add `OnMessageFromChanged` support in a later version so the signature updates when the sender changes after compose opens.

## V2 Paths

Common upgrades:

- Generate `signatures.json` from Entra ID, HR export, CRM, or a spreadsheet.
- Add an Azure Function or other API for controlled updates.
- Add an admin UI with validation and preview rendering.
- Add a logging endpoint for launch/config/signature failures.
- Add `OnMessageFromChanged` for shared mailboxes and aliases.
- Add CID/inline image delivery for better recipient rendering.
- Add a rule engine for departments, offices, languages, or campaign variants.

Treat each upgrade as a deliberate product decision. The value of v1 is that it stays small, inspectable, and easy to remove.

## Cutover Rule

Do not remove Exclaimer or equivalent transport objects until the add-in has passed the pilot client matrix and sent-message rendering checks.

If the signature must be present on every outbound message regardless of client, network state, or add-in availability, the customer still needs a server-side signature/compliance path.
