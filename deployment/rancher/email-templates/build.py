#!/usr/bin/env python3
"""Builds the Rancher-branded Supabase Auth email templates for Rancher Legal.

Writes templates.json (Management API PATCH body for /v1/projects/{ref}/config/auth) and
preview/*.html (sample-rendered, for light/dark screenshots). Colors are the frontend's
globals.css tokens: light = :root, dark = .dark. Run: python3 build.py
"""
import json
import pathlib

HERE = pathlib.Path(__file__).parent

LIGHT = dict(bg="#f7f6ee", card="#fffef7", border="#d9dfd3", text="#193e34", muted="#536059",
             btn="#193e34", btn_text="#fffef7")
DARK = dict(bg="#1c1b19", card="#262420", border="#494238", text="#f7f6ee", muted="#b8b1a5",
            btn="#f7f6ee", btn_text="#193e34")

# (key, subject, heading, body html, button label or None, footer note)
TEMPLATES = [
    ("confirmation", "Confirm your email for Rancher Legal", "Confirm your email address",
     "<p>Confirm this email address to finish creating your Rancher Legal account.</p>",
     "Confirm email address", "If you didn't sign up for Rancher Legal, you can ignore this email."),
    ("recovery", "Reset your Rancher Legal password", "Reset your password",
     "<p>We received a request to reset your Rancher Legal password. Use the button below to choose a new one.</p>",
     "Reset password", "If you didn't request this, you can ignore this email. Your password won't change."),
    ("invite", "You've been invited to Rancher Legal", "You've been invited",
     "<p>You've been invited to join Rancher Legal. Accept the invitation to create your account.</p>",
     "Accept invitation", "If you weren't expecting this invitation, you can ignore this email."),
    ("magic_link", "Your Rancher Legal sign-in link", "Your sign-in link",
     "<p>Use the button below to sign in to Rancher Legal. This link expires shortly and works once.</p>",
     "Sign in", "If you didn't try to sign in, you can ignore this email."),
    ("email_change", "Confirm your new email for Rancher Legal", "Confirm your new email address",
     "<p>Confirm <strong>{{ .NewEmail }}</strong> as the new email address for your Rancher Legal account.</p>",
     "Confirm new email address", "If you didn't request this change, you can ignore this email."),
    ("reauthentication", "{{ .Token }} is your Rancher Legal verification code", "Your verification code",
     "<p>Use this code to verify your identity. It expires shortly.</p>"
     '<p class="code" style="font-family:Menlo,Consolas,monospace;font-size:28px;font-weight:700;'
     'letter-spacing:4px;margin:24px 0;">{{ .Token }}</p>',
     None, "If you didn't request this code, you can ignore this email."),
    ("email_changed_notification", "Your Rancher Legal email address was changed", "Your email address was changed",
     "<p>The email address for your Rancher Legal account was changed from {{ .OldEmail }} to {{ .Email }}.</p>",
     None, "If you didn't make this change, contact your Rancher administrator right away."),
    ("identity_linked_notification", "A sign-in method was linked to your Rancher Legal account", "A new sign-in method was linked",
     "<p>Your {{ .Provider }} account was linked as a sign-in method for {{ .Email }}.</p>",
     None, "If you didn't make this change, contact your Rancher administrator right away."),
    ("identity_unlinked_notification", "A sign-in method was removed from your Rancher Legal account", "A sign-in method was removed",
     "<p>Your {{ .Provider }} account was removed as a sign-in method for {{ .Email }}.</p>",
     None, "If you didn't make this change, contact your Rancher administrator right away."),
    ("mfa_factor_enrolled_notification", "A verification method was added to your Rancher Legal account", "A new verification method was added",
     "<p>A {{ .FactorType }} verification method was added to your Rancher Legal account.</p>",
     None, "If you didn't make this change, contact your Rancher administrator right away."),
    ("mfa_factor_unenrolled_notification", "A verification method was removed from your Rancher Legal account", "A verification method was removed",
     "<p>A {{ .FactorType }} verification method was removed from your Rancher Legal account.</p>",
     None, "If you didn't make this change, contact your Rancher administrator right away."),
    ("password_changed_notification", "Your Rancher Legal password was changed", "Your password was changed",
     "<p>The password for your Rancher Legal account ({{ .Email }}) was changed.</p>",
     None, "If you didn't make this change, reset your password and contact your Rancher administrator."),
    ("phone_changed_notification", "Your Rancher Legal phone number was changed", "Your phone number was changed",
     "<p>The phone number for your Rancher Legal account was changed.</p>",
     None, "If you didn't make this change, contact your Rancher administrator right away."),
]

L, D = LIGHT, DARK
STYLE = f"""
:root {{ color-scheme: light dark; supported-color-schemes: light dark; }}
body, .bg {{ background:{L['bg']} !important; }}
@media (prefers-color-scheme: dark) {{
  body, .bg {{ background:{D['bg']} !important; }}
  .card {{ background:{D['card']} !important; border-color:{D['border']} !important; }}
  .text, .text p, .text h1, .code, .wordmark {{ color:{D['text']} !important; }}
  .muted, .muted p, .muted a {{ color:{D['muted']} !important; }}
  .btn {{ background:{D['btn']} !important; }}
  .btn a {{ color:{D['btn_text']} !important; }}
  .rule {{ border-color:{D['border']} !important; }}
}}
[data-ogsc] .card {{ background:{D['card']} !important; border-color:{D['border']} !important; }}
[data-ogsc] .text, [data-ogsc] .text p, [data-ogsc] .text h1, [data-ogsc] .code, [data-ogsc] .wordmark {{ color:{D['text']} !important; }}
[data-ogsc] .muted, [data-ogsc] .muted p, [data-ogsc] .muted a {{ color:{D['muted']} !important; }}
[data-ogsb] .btn {{ background:{D['btn']} !important; }}
[data-ogsc] .btn a {{ color:{D['btn_text']} !important; }}
a {{ color:inherit; }}
"""


def render(heading, body, button, note):
    btn = ""
    link_fallback = ""
    if button:
        btn = (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr>'
               f'<td class="btn" style="background:{L["btn"]};border-radius:8px;">'
               f'<a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;padding:13px 24px;'
               f'font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:{L["btn_text"]};'
               f'text-decoration:none;border-radius:8px;">{button}</a></td></tr></table>')
        link_fallback = (f'<p style="margin:16px 0 0;font-size:13px;line-height:1.5;">If the button doesn\'t work, '
                         f'copy this link into your browser:<br><a href="{{{{ .ConfirmationURL }}}}" '
                         f'style="color:{L["muted"]};word-break:break-all;">{{{{ .ConfirmationURL }}}}</a></p>')
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>{heading}</title><style>{STYLE}</style></head>
<body class="body" style="margin:0;padding:0;background:{L['bg']};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:{L['bg']};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 4px 20px;"><span class="wordmark" style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;letter-spacing:-1.2px;color:{L['text']};">rancher</span><span class="wordmark" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:400;color:{L['text']};padding-left:8px;">Legal</span></td></tr>
<tr><td class="card text" style="background:{L['card']};border:1px solid {L['border']};border-radius:12px;padding:32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:{L['text']};">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:{L['text']};">{heading}</h1>
{body}
{btn}
<div class="muted" style="color:{L['muted']};">{link_fallback}
<p class="rule" style="margin:24px 0 0;padding-top:16px;border-top:1px solid {L['border']};font-size:13px;line-height:1.5;color:{L['muted']};">{note}</p></div>
</td></tr>
<tr><td class="muted" style="padding:20px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:{L['muted']};">Rancher Legal &middot; <a href="https://legal.gorancher.com" style="color:{L['muted']};">legal.gorancher.com</a></td></tr>
</table></td></tr></table></body></html>"""


def main():
    patch = {}
    preview = HERE / "preview"
    preview.mkdir(exist_ok=True)
    sample = {"{{ .ConfirmationURL }}": "https://legal.gorancher.com/auth/v1/verify?token=EXAMPLE&amp;type=signup",
              "{{ .Token }}": "48213907", "{{ .NewEmail }}": "new@gorancher.com", "{{ .Email }}": "you@gorancher.com",
              "{{ .OldEmail }}": "old@gorancher.com", "{{ .Provider }}": "Google", "{{ .FactorType }}": "TOTP"}
    for key, subject, heading, body, button, note in TEMPLATES:
        html = render(heading, body, button, note)
        patch[f"mailer_subjects_{key}"] = subject
        patch[f"mailer_templates_{key}_content"] = html
        for k, v in sample.items():
            html = html.replace(k, v)
        (preview / f"{key}.html").write_text(html)
    (HERE / "templates.json").write_text(json.dumps(patch, indent=1) + "\n")
    print(f"Wrote {len(TEMPLATES)} templates")


if __name__ == "__main__":
    main()
