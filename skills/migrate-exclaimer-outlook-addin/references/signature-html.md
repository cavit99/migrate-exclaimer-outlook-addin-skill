# Signature HTML

## Rendering Strategy

Use conservative email HTML:

- Table layout.
- Inline style attributes.
- PNG/JPG images, not SVG.
- Hosted `https://` image URLs for v1.
- Fixed image width in the config.
- Plain text fallbacks through `alt`.
- No web fonts, scripts, forms, video, CSS animations, or remote stylesheets.

Expect Outlook and recipient clients to rewrite or strip parts of the HTML. Test in Outlook and Gmail web before rollout.

## Style Agnosticism

The migration workflow is independent of the customer's visual signature style. Always ask for the approved design or reconstruct it from a supplied screenshot/mockup. Do not carry over another customer's layout, logo size, legal footer, social icons, colors, contact labels, or wording.

Keep the runtime generic:

- Outlook event handling, sender lookup, config fetch, and `setSignatureAsync` stay in JavaScript.
- Visual layout, legal text, and contact field order live in `signatures.json` templates.
- User-specific values live under `users[email]`.
- Customer-specific HTML can replace the starter `templates.newMail` and `templates.reply` entirely.

The starter two-column template is only a smoke-test template. It is not a design recommendation.

## New Mail vs Replies

Use a fuller signature on new mail and a lighter signature on replies/forwards. Common pattern:

- New mail: name, title, logo, contact details, company footer.
- Replies/forwards: name, title, logo, contact details, no legal/footer block.

`getComposeTypeAsync` identifies new/reply/forward. Treat anything other than new mail as a reply-style signature unless the user wants separate forward handling.

## Logo Size

Keep logo width configurable per user or organization in `signatures.json`.

Typical values:

- `120px`: compact/minimal.
- `150-170px`: balanced for a two-column signature.
- `250-300px`: brand-forward, can dominate narrow compose windows.

Generate a preview before deployment using `scripts/render_signature_preview.py`.

## Image Delivery

Hosted images:

- Fastest v1.
- Easy to cache and update.
- Some recipients may see image-loading prompts.

Inline CID images:

- More self-contained.
- Requires adding inline attachments from JavaScript.
- More moving parts across Outlook clients.

Use hosted images first. Move to CID only after the static add-in is stable.

## Social Icons

Avoid social icons in v1 unless explicitly required. They add image-loading noise, layout fragility, and more links to validate. If old social icons appear when the new template has none, the signature is coming from another source.
