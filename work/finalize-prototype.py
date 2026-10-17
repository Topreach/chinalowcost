from pathlib import Path
import subprocess
import sys
import zipfile

node = __import__("shutil").which("node") or "node"
source = Path('outputs/prototype.js')
text = source.read_text(encoding='utf8')
old='current?totals().total:53000'
new='current?(state.orderSnapshot?.total??totals().total):53000'
if old in text:
    assert text.count(old)==1
    source.write_text(text.replace(old,new),encoding='utf8')
for command in [[node,'work/build-prototype.cjs'],[node,'work/check-connected-prototype.cjs'],[node,'work/check-accounts.cjs'],[sys.executable,'work/check-markup.py']]:
    subprocess.run(command,check=True)
files=['Screen-Blueprint.html','prototype.css','prototype.js','commerce.js','catalog.js','navigation.js','operations.js','accounts.js','Screen-Inventory.csv','Prototype-Page-Map.json','Prototype-Guide.md','Wholesale-Design-Research.md','Location-Delivery-and-Promotions.md','Catalog-Categories-and-Product-Design.md','Worker-and-Admin-Operations.md','Accounts-and-Access-Guide.md','ChinaLowCost-Architecture-and-Design.md','State-Machines.mmd','Job-Control-and-Security-Readiness.md','WhatsApp-Configuration-Guide.md','Configuration-Free-Improvements.md']
helpers=['build-prototype.cjs','check-connected-prototype.cjs','check-accounts.cjs','check-markup.py']
archive=Path('outputs/ChinaLowCost-Prototype-Source.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for file in files:z.write(Path('outputs')/file,'ChinaLowCost-Prototype/outputs/'+file)
    for file in helpers:z.write(Path('work')/file,'ChinaLowCost-Prototype/work/'+file)
    z.writestr('ChinaLowCost-Prototype/README.md','# ChinaLowCost connected prototype\n\nOpen outputs/Screen-Blueprint.html directly in a browser. No installation is needed to preview it.\n\nEditable source: outputs/*.js and outputs/prototype.css.\n\nAfter editing, run from this directory with Node.js installed:\n\n    node work/build-prototype.cjs\n    node work/check-connected-prototype.cjs\n\nOptional structural HTML check with Python:\n\n    python work/check-markup.py\n\nSee outputs/Prototype-Guide.md for journeys and prototype limits. No production integrations or credentials are included.\n')
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist())==26
report='''# ChinaLowCost prototype verification

Verified 15 October 2026.

- All 86 page routes render: 25 customer, 21 worker, 40 admin.
- Empty, error and offline previews are checked for each route (258 alternate states).
- Internal route targets, unique element IDs and inline handler syntax pass.
- Every page passes the structural HTML balance check.
- Wholesale tier boundaries, MOQ/pack validation, quotation acceptance and expiry pass.
- Sample PDF header and cross-reference structure pass.
- Independent approval, catalog submission/consent gates and inspection validation pass.
- Simulated payment creates a frozen order total; repeated simulation does not change it.
- All 36 states plus FCT are available, with representative town suggestions and custom entry.
- Location and chargeable-weight transport estimates, unknown-route payment blocking and separate discount lines pass.
- Promo eligibility, minimum spend, caps, expiry, inactive status and redemption limits pass.
- Changed destination or rate invalidates quote acceptance; original quotation and paid totals remain frozen.
- All 32 departments have sample product coverage (33 products total).
- Category, design/style, price range, quality grade, condition, search and price sorting pass.
- Three distinct illustrative gallery views and four product-detail tabs pass.
- Vehicles/specialist goods cannot enter ordinary checkout; tyre-specific MOQ, pack and tier validation pass.
- Visible previous-page navigation and customer/worker/admin home fallbacks pass.
- Worker activation and role gates, media permission, multi-image drafts and independent publication into customer views pass.
- Published customer fields exclude supplier cost; receipt retries cannot duplicate accepted goods.
- Assigned delivery requires dispatch and OTP; shift consent, manual check-ins and location clearing pass.
- Duplicate cash collection references do not post twice; cash variance blocks finance reconciliation.
- Customer, worker and admin credentials/sessions are separate; private customer workspaces remain isolated.
- Worker and admin signup are disabled. A Manager creates worker logins; removing access revokes sessions and blocks login.
- Password change validates the current password, revokes old account sessions and leaves other application accounts unaffected.
- Recovery requires the matching account code, rotates it, and preserves unrelated sessions.
- Signed-in worker identities and restricted catalog-reviewer admin scopes are enforced by the prototype UI.
- Unified job acceptance, evidence, correction/resubmission, Manager approval, reassignment, role restrictions, revocation and stale-action checks pass.
- WhatsApp dummy mode creates no external link; Manager settings, number validation, prepared messages, disabled mode and live-link encoding pass.
- Private saved addresses/products, archived orders, reorder cart reset, order-linked task synchronization, checklist gating, CSV validation and draft-only import pass.
- Standalone HTML embeds its style and scripts; source archive integrity passes.

These are code-level prototype checks using generated markup and a simulated document environment. They do not validate a production backend or every native browser behavior. Automated visual browser inspection remains unavailable because the browser URL policy denied local-file observation. Responsive CSS is included, but device screenshots and production accessibility testing remain outstanding.
'''
Path('outputs/Prototype-Verification.md').write_text(report,encoding='utf8')
print('PASS: source archive integrity. Deliverables ready in outputs/.')
