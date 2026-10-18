# ChinaLowCost logo

Master: chinalowcost-master.png. Created with the built-in image generation tool; selected and visually reviewed for website and mobile branding.

Prompt: A compact white open C-shaped shopping parcel with a gold delivery/check arrow on the existing deep forest green background; simple bold geometry, no text, generous app-icon margins, legible as a favicon.

Run powershell -NoProfile -File work/build-brand.ps1 from the project root to resize the master into website PNG favicons, Android density assets and the opaque 1024px iOS icon. The header uses an embedded copy so the sandboxed interface and bundled mobile screen work without external image requests. If changing the master later, also replace that embedded header image.

Website deployment updates the header and favicon. Mobile launcher changes require rebuilding and installing the APK; iOS requires a signed Xcode build. The existing debug APK is not changed by a source-only update. Search engines control whether and when the favicon appears in search results.
