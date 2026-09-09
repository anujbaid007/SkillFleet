import fs from 'node:fs'
import path from 'node:path'

const LOCAL_DEV_TEMPLATE_HTML =
  '/Users/anuj/Desktop/Projects/ISC/output/ISC-School-Emailer/email-template.html'
const LOCAL_DEV_TEMPLATE_TEXT =
  '/Users/anuj/Desktop/Projects/ISC/output/ISC-School-Emailer/email-plain-text.txt'

// Production fallback bundled template
export const BUNDLED_ISC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{{SchoolName}}, introduce your students to ISC 2026</title>
<style>
  body, table, td, p, a, li, blockquote { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background-color:#f5f4f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#252235; }
  @media only screen and (max-width: 620px) {
    .shell { width:100% !important; max-width:100% !important; }
    .pad { padding:24px 20px !important; }
    .hero-h1 { font-size:26px !important; line-height:34px !important; }
    .stack { display:block !important; width:100% !important; max-width:100% !important; }
    .gap { display:none !important; height:12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f4f8;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f4f8">
<tr><td align="center" style="padding:24px 12px 40px;">
<table role="presentation" width="600" class="shell" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7e3ef;box-shadow:0 4px 18px rgba(37,34,53,0.06);">
<tr><td class="pad" style="padding:26px 34px;"><table role="presentation" width="100%"><tr><td><a href="https://skillfleet.org/isc-2026"><img src="https://isc-emailer-assets.pages.dev/skillfleet.png" width="170" alt="SkillFleet" style="display:block;width:170px;max-width:100%;height:auto;"></a></td><td align="right" style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#706a7e;">SCHOOL INVITATION<br><span style="line-height:24px;color:#7447e1;">2026–27 EDITION</span></td></tr></table></td></tr>
<tr><td align="center"><img src="https://isc-emailer-assets.pages.dev/school-emailer-hero.png" width="600" alt="ISC 2026" style="display:block;width:100%;max-width:600px;height:auto;"></td></tr>
<tr><td class="pad" style="padding:30px 34px 10px;"><h1 class="hero-h1" style="margin:0 0 16px;font-size:30px;line-height:38px;color:#252235;letter-spacing:-0.5px;">Empower your students to represent <span style="color:#7447e1;">{{SchoolName}}</span> on a global stage.</h1><p style="margin:0 0 14px;font-size:15px;line-height:25px;color:#4a4556;">The <strong>International Skill Championship (ISC 2026)</strong> is a nationwide talent discovery championship across 12 modern disciplines — from AI, Robotics, and App Development to Financial Literacy, Creative Arts, and Entrepreneurship.</p><table role="presentation" width="100%"><tr><td align="center" bgcolor="#7447e1" style="border-radius:8px;"><a href="https://skillfleet.org/signup/coordinator" style="display:block;padding:17px 12px;border:1px solid #7447e1;border-radius:8px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;">Register your School Coordinator &rarr;</a></td></tr><tr><td height="10"></td></tr><tr><td align="center" style="border:1px solid #0b8277;border-radius:8px;"><a href="https://skillfleet.org/signup" style="display:block;padding:14px 12px;color:#08776e;text-decoration:none;font-weight:bold;font-size:15px;">Student Registration &rarr;</a></td></tr></table><p style="margin:18px 0 0;padding:15px 12px;background:#f4efff;border:1px solid #ded2f4;border-radius:8px;text-align:center;font-size:14px;line-height:24px;color:#565164;">Visit the ISC website to register:<br><a href="https://skillfleet.org/isc-2026" style="color:#6134cc;font-size:16px;font-weight:bold;text-decoration:underline;">https://skillfleet.org/isc-2026</a></p></td></tr>
<tr><td class="pad" bgcolor="#f4efff" style="padding:28px 34px;"><h2 style="margin:0 0 9px;font-size:26px;line-height:32px;">Bring ISC to {{SchoolName}}.</h2><p style="margin:0 0 20px;font-size:14px;line-height:23px;color:#565164;">Share the decks with your leadership team and students, then nominate your school coordinator to get started.</p><table role="presentation" width="100%"><tr><td class="stack" align="center" bgcolor="#ffffff" style="border:1px solid #d7c8f7;border-radius:7px;"><a href="https://skillfleet.org/decks/ISC-School-Deck.pdf" style="display:block;padding:15px 12px;color:#6134cc;text-decoration:none;font-size:14px;font-weight:bold;">Download School Deck ↓</a></td><td class="gap" width="12"></td><td class="stack" align="center" bgcolor="#ffffff" style="border:1px solid #d7c8f7;border-radius:7px;"><a href="https://skillfleet.org/decks/ISC-Student-Deck.pdf" style="display:block;padding:15px 12px;color:#6134cc;text-decoration:none;font-size:14px;font-weight:bold;">Download Student Deck ↓</a></td></tr></table><table role="presentation" width="100%" style="margin-top:12px;"><tr><td align="center" bgcolor="#7447e1" style="border-radius:7px;"><a href="https://skillfleet.org/signup/coordinator" style="display:block;padding:17px 12px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Register your School Coordinator &rarr;</a></td></tr></table><p style="margin:15px 0 0;text-align:center;font-size:13px;"><a href="https://skillfleet.org/signup" style="color:#08776e;font-weight:bold;">Student Registration &rarr;</a></p></td></tr>
<tr><td class="pad" style="padding:25px 34px;"><p style="margin:0 0 7px;font-size:14px;font-weight:bold;">Let’s give your students a stage.</p><p style="margin:0;font-size:13px;line-height:24px;color:#565164;">Team SkillFleet<br><a href="tel:+919220556879" style="color:#252235;text-decoration:none;">+91 92205 56879</a><br><a href="mailto:hello@skillfleet.org" style="color:#7447e1;">hello@skillfleet.org</a><br><a href="https://skillfleet.org/isc-2026" style="color:#7447e1;">Explore ISC 2026</a></p></td></tr>
</table>
<table role="presentation" width="600" class="shell" style="width:600px;max-width:600px;"><tr><td style="padding:20px 25px;text-align:center;font-size:11px;line-height:18px;color:#81798e;">School outreach from SkillFleet · International Skill Championship<br>{{PostalAddress}}<br><a href="{{UnsubscribeURL}}" style="color:#81798e;text-decoration:underline;">Unsubscribe from school invitations</a></td></tr></table>
</td></tr>
</table>
</body>
</html>`

export const BUNDLED_ISC_TEXT = `Empower your students to represent {{SchoolName}} at ISC 2026.

International Skill Championship (ISC 2026) is a nationwide talent discovery championship across 12 modern disciplines.

Register School Coordinator: https://skillfleet.org/signup/coordinator
Student Registration: https://skillfleet.org/signup
Explore ISC 2026: https://skillfleet.org/isc-2026

Download School Deck: https://skillfleet.org/decks/ISC-School-Deck.pdf
Download Student Deck: https://skillfleet.org/decks/ISC-Student-Deck.pdf

Team SkillFleet
+91 92205 56879
hello@skillfleet.org

{{PostalAddress}}
Unsubscribe: {{UnsubscribeURL}}
`

export function getIscEmailTemplate(): { html: string; text: string } {
  try {
    if (fs.existsSync(LOCAL_DEV_TEMPLATE_HTML) && fs.existsSync(LOCAL_DEV_TEMPLATE_TEXT)) {
      return {
        html: fs.readFileSync(LOCAL_DEV_TEMPLATE_HTML, 'utf-8'),
        text: fs.readFileSync(LOCAL_DEV_TEMPLATE_TEXT, 'utf-8'),
      }
    }
  } catch {
    // Fall back to bundled template in production/edge
  }

  return {
    html: BUNDLED_ISC_HTML,
    text: BUNDLED_ISC_TEXT,
  }
}
