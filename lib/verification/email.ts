import type { VerificationDescriptor } from "./core";
import { verificationCopy } from "./email-copy";

export function renderVerificationText(
  product: VerificationDescriptor,
  code: string,
  ttlMinutes: number,
  language?: string,
): string {
  const copy = verificationCopy(language, product.email.productName, ttlMinutes);
  return [
    product.email.brandLine,
    "",
    copy.intro,
    "",
    groupedCode(code),
    "",
    copy.support,
    "",
    copy.expiry,
    copy.security,
    "",
    "OneRead",
    copy.tagline,
  ].join("\n");
}

export function renderVerificationHtml(
  product: VerificationDescriptor,
  code: string,
  ttlMinutes: number,
  language?: string,
): string {
  const copy = verificationCopy(language, product.email.productName, ttlMinutes);
  const p = product.email;
  return `<!doctype html>
<html lang="${copy.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(copy.subject)}</title>
  <meta name="x-apple-disable-message-reformatting" />
  <style>
    body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    @media screen and (max-width:400px){.page-pad{padding:20px 12px!important}.card-pad{padding:26px 18px!important}}
  </style>
</head>
<body style="margin:0;padding:0;background:${p.theme.background};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${escapeHtml(copy.subject)}. ${escapeHtml(copy.expiry)}${"&nbsp;&zwnj;".repeat(100)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.theme.background};">
    <tr>
      <td align="center" class="page-pad" style="padding:34px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:0 0 22px 0;font-family:Georgia,Cambria,'Times New Roman',serif;font-size:12px;line-height:1;letter-spacing:0.22em;text-transform:uppercase;font-style:italic;color:#616161;">
              OneRead
            </td>
          </tr>
          <tr>
            <td class="card-pad" style="border:1px solid ${p.theme.border};border-radius:18px;background:${p.theme.surface};padding:30px 24px 26px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:${p.theme.accent};font-weight:600;">
                    ${escapeHtml(p.brandLine)}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:18px;font-family:Georgia,Cambria,'Times New Roman',serif;font-size:30px;line-height:1.15;font-weight:500;color:#111111;">
                    ${escapeHtml(copy.heading)}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:12px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#616161;">
                    ${escapeHtml(copy.intro)}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px 0 18px 0;">
                    <div dir="ltr" style="padding:16px 8px;border:1px solid ${p.theme.border};border-radius:10px;background:${p.theme.background};font-family:Consolas,'Courier New',monospace;font-size:30px;line-height:1.4;font-weight:700;letter-spacing:4px;color:${p.theme.accent};white-space:nowrap;">${escapeHtml(code)}</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13.5px;line-height:1.65;color:#616161;">
                    ${escapeHtml(copy.support)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${p.theme.border};">
                      <tr>
                        <td align="center" style="padding-top:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.65;color:#616161;">
                          ${escapeHtml(copy.expiry)} ${escapeHtml(copy.security)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 10px 0 10px;font-family:Georgia,Cambria,'Times New Roman',serif;font-style:italic;font-size:13px;line-height:1.5;color:#616161;">
              ${escapeHtml(copy.tagline)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function groupedCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
