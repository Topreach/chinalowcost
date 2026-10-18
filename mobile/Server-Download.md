# Host the Android test APK on Contabo

The installed app already calls https://chinalowcost.com. The VPS runs the API/database and can provide an APK download; it does not run the Android or iOS app itself. iPhone distribution requires an Apple signing/TestFlight/App Store workflow and cannot be accomplished by uploading this APK.

## Upload from Windows

From C:\Users\DELL\Chinalowcost\ChinaLowCost:

```powershell
powershell -ExecutionPolicy Bypass -File .\work\deploy\Upload-Mobile.ps1
```

This uploads only the existing debug APK to /root/chinalowcost-mobile.apk through SSH port 2222. It uses the existing SSH authentication and does not transmit your .env or database. The script prints its SHA256 digest; compare that with sha256sum on the server. Do not bypass an unexpected SSH host-key warning.

## Install on the server

Deploy the source commit containing the /download/android route with the existing controlled release helper first. Then run in the Contabo SSH terminal:

```bash
sha256sum /root/chinalowcost-mobile.apk
install -d -o root -g root -m 755 /opt/chinalowcost/public-downloads
install -o root -g root -m 644 /root/chinalowcost-mobile.apk /opt/chinalowcost/public-downloads/ChinaLowCost-android.apk.new
mv -f -- /opt/chinalowcost/public-downloads/ChinaLowCost-android.apk.new /opt/chinalowcost/public-downloads/ChinaLowCost-android.apk
curl --fail --silent --show-error -I https://chinalowcost.com/download/android
```

The install folder must remain root-owned, public-readable and separate from private uploads. The .new file and rename avoid serving a partly uploaded APK. Existing database/configuration/uploads are unaffected. The default path is a public-downloads folder beside the persistent data folder; an unusual layout can set MOBILE_APK_FILE explicitly. No Nginx config edits are needed for the existing reverse proxy. The route supports GET/HEAD and serves only this configured APK, with no directory listing. Before installation it returns 404. Download responses use no-store; exclude /download/android from any custom Cloudflare “cache everything” rule.

Download on an Android test phone at https://chinalowcost.com/download/android. This is a debug build for testing, not the final store release. Replace it with a signed release only after device acceptance and signing setup. APK signing keys must be retained privately so future installed app updates remain compatible.

## Shared settings

Web and mobile use the same backend and database. Server-side settings—SMTP/Reply-To, AI keys and limits, payment configuration, promotions, referrals, inventory, products, staff access and order status—are enforced by the same services. A running app may need a refresh/reopen for cached public configuration to update. Existing accepted quotations/orders keep their price snapshots.

Interface/native-code/plugin/permission changes require a new mobile build and installation/store update. Server API changes must remain compatible with existing mobile clients. Updating the APK on the download URL does not silently update an installed app. Native Google OAuth, native push/APNs/FCM, native reCAPTCHA support, private evidence viewing and verified payment return links are still listed as pending in README.md. Website Admin settings do not complete those native integrations automatically.
