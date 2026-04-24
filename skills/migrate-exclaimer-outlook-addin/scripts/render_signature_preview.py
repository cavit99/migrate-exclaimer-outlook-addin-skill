#!/usr/bin/env python3
"""Render a local HTML preview from a static Outlook signature config."""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any


TOKEN_RE = re.compile(r"\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}")


def safe_url(value: str) -> str:
    value = str(value or "")
    if value.lower().startswith(("https://", "mailto:", "tel:")):
        return value.replace('"', "%22")
    return ""


def line(label: str, value_html: str) -> str:
    if not value_html:
        return ""
    return (
        '<div style="margin:0 0 4px 0;white-space:nowrap;">'
        f'<span style="font-weight:bold;">{html.escape(label)}</span> '
        f"{value_html}</div>"
    )


def footer_html(user: dict[str, Any]) -> str:
    lines = user.get("footerLines") or []
    footer = "<br>".join(html.escape(str(line)) for line in lines)
    if not footer:
        return ""
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;'
        'line-height:1.35;color:#666;margin-top:10px;">'
        f"{footer}</div>"
    )


def logo_img(user: dict[str, Any]) -> str:
    logo_url = safe_url(user.get("logoUrl", ""))
    if not logo_url:
        return ""
    logo_width = int(user.get("logoWidth") or 160)
    logo_alt = html.escape(str(user.get("logoAlt") or "Company logo"))
    return (
        f'<img src="{logo_url}" width="{logo_width}" alt="{logo_alt}" '
        'style="display:block;border:0;outline:none;text-decoration:none;'
        f'width:{logo_width}px;max-width:{logo_width}px;height:auto;">'
    )


def build_tokens(user: dict[str, Any]) -> dict[str, str]:
    tokens: dict[str, str] = {}
    email = str(user.get("email") or "")
    website = str(user.get("website") or "")
    email_href = safe_url("mailto:" + email)
    website_href = safe_url(website)
    website_label = html.escape(str(user.get("websiteLabel") or website))

    for key, value in user.items():
        if isinstance(value, (str, int, float)):
            tokens[key] = html.escape(str(value))

    tokens["emailHref"] = email_href
    tokens["websiteHref"] = website_href
    tokens["logoImg"] = logo_img(user)
    tokens["footerHtml"] = footer_html(user)
    tokens["phoneLine"] = line("T", html.escape(str(user.get("phone") or "")))
    tokens["mobileLine"] = line("M", html.escape(str(user.get("mobile") or "")))
    tokens["emailLine"] = line(
        "E",
        f'<a href="{email_href}" style="color:#222;text-decoration:none;">{html.escape(email)}</a>'
        if email_href
        else "",
    )
    tokens["websiteLine"] = line(
        "W",
        f'<a href="{website_href}" style="color:#222;text-decoration:none;">{website_label}</a>'
        if website_href
        else "",
    )
    return tokens


def render_template(template: str, tokens: dict[str, str]) -> str:
    return TOKEN_RE.sub(lambda match: tokens.get(match.group(1), ""), template or "")


def build_signature(config: dict[str, Any], user: dict[str, Any], is_reply: bool) -> str:
    templates = user.get("templates") or config.get("templates") or {}
    template = (
        templates.get("reply") or templates.get("newMail")
        if is_reply
        else templates.get("newMail") or templates.get("reply")
    )
    if not template:
        raise SystemExit("No signature template found. Add config.templates.newMail/reply or user.templates.")
    return render_template(template, build_tokens(user))


def build_page(signature_html: str) -> str:
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Signature Preview</title>
    <style>
      body {{ margin:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; }}
      .page {{ padding:32px; }}
      .mail {{
        box-sizing:border-box; width:760px; min-height:290px; background:#fff;
        border:1px solid #d8dde6; box-shadow:0 2px 10px rgba(0,0,0,.06);
        padding:28px 32px;
      }}
      .bodyline {{ height:16px; background:#e6e8ec; border-radius:2px; margin-bottom:10px; }}
      .bodyline.short {{ width:52%; }}
      .bodyline.long {{ width:75%; }}
      .spacer {{ height:22px; }}
    </style>
  </head>
  <body>
    <div class="page">
      <div class="mail">
        <div class="bodyline long"></div>
        <div class="bodyline short"></div>
        <div class="spacer"></div>
        {signature_html}
      </div>
    </div>
  </body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("config", type=Path, help="Path to signatures.json")
    parser.add_argument("--email", required=True, help="Sender email to preview")
    parser.add_argument("--reply", action="store_true", help="Render reply/forward version")
    parser.add_argument("--output", type=Path, default=Path("signature-preview.html"))
    args = parser.parse_args()

    cfg = json.loads(args.config.read_text())
    users = cfg.get("users", {})
    user = users.get(args.email.lower())
    if not user:
        raise SystemExit(f"No user config for {args.email.lower()}")

    args.output.write_text(build_page(build_signature(cfg, user, args.reply)))
    print(args.output.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
