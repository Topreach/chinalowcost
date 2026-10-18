# ChinaLowCost mobile — first development version

Android and iOS projects use Capacitor 8 and bundle the existing 86-screen interface. The default backend is https://chinalowcost.com. There is no remote `server.url`, wildcard navigation or copied production `.env`/database. Website source and mobile source stay in the same repository; their releases are separate.

The Android debug build compiled successfully on Windows on October 18, 2026 (package `com.chinalowcost.app`, version 0.1.0, minimum Android API 24, target API 36). A local copy is `artifacts/ChinaLowCost-0.1.0-debug.apk`; binaries are excluded from Git. Three native-transport/build checks and the existing 130 backend tests passed. The APK contents were checked for bundled interface files and absence of environment files/databases/private keys. These checks do not establish successful login or native-plugin behavior on a phone.

## Build on Windows

From the application root:

```powershell
cd mobile
npm ci --ignore-scripts
npm run build
npm test
npx cap sync android
npx cap open android
```

Android Studio 2025.2.1 or newer, Android SDK 36 and Java 21 are required by this toolchain. Android Studio's bundled `jbr` is suitable. Android minimum SDK is 24. To build a test APK from PowerShell using the already-installed tools:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\DELL\AppData\Local\Android\Sdk'
cd android
.\gradlew.bat assembleDebug --no-daemon
```

The debug APK appears at `android/app/build/outputs/apk/debug/app-debug.apk`. It is a test artifact, not a Play Store release. Do not commit APKs or signing credentials. Use an emulator or a test phone, verify all critical flows and never use a debug build as the production distribution.

## iPhone / iPad

The native Xcode project is under `ios/App`. On a Mac with Xcode 26 or newer:

```sh
cd mobile
npm ci --ignore-scripts
npm run build
npx cap sync ios
npx cap open ios
```

Select the Apple development team and a unique bundle identifier in Xcode, then run on an iPhone/simulator. The initial ID is `com.chinalowcost.app`. It must be confirmed before App Store/Play Console registration. iOS uses Swift Package Manager. iOS has not been compiled or tested on this Windows computer. Replace the initial iOS template icon and complete privacy manifests before publishing.

## Implemented development foundations

- Local assets preserve the existing interface and customer/worker/Admin login routes.
- The parent host calls only the pinned HTTPS backend API using CapacitorHttp. Native cookies carry the existing HttpOnly session; the sandboxed UI receives neither session nor CSRF tokens. No browser CORS exception was added to the backend.
- Email/password login, existing 2FA challenge/enrollment screens and server-backed commerce calls reuse the existing host action allowlist.
- JSON requests and raw photo/video uploads use native HTTP serialization. Public product media URLs resolve against the backend. Automatic redirects are disabled for API requests.
- Photo-capable file inputs gain a Take photo button. Camera/photos permission is requested through native UI when used. Photos attach for review; existing AI-sharing consent and malware scanning are still required.
- Worker location uses native geolocation after shift/feature checks and an explicit confirmation. No background location is requested.
- Network notices provide a manual reload option. The complete store is not available offline. Existing encrypted worker action drafts remain separate from authoritative server records.
- External payment pages open in the native browser. Returning to the app requests fresh order status; browser completion is not treated as payment proof. Only server verification/webhooks can mark paid. The custom `chinalowcost://payment-return` scheme is reserved and refreshes status only; automatic HTTPS App Links/Universal Links are not configured yet.
- Android Back closes a dialog or returns through application navigation. Mail and WhatsApp/source links leave the local app view.
- Android app backup and cleartext traffic are disabled. Native logs and web contents debugging are disabled. An initial Android vector icon uses the existing green/CLC identity.

## Features still required before store publication

1. **Device acceptance:** native session persistence, signup/reset, login and 2FA for every role, checkout/verification, photo attachment, evidence upload, location permissions, low-connectivity recovery, logout and worker drafts on real Android/iOS devices. Unit tests with a mock native transport are not native device acceptance.
2. **Google sign-in:** native OAuth clients and a backend mobile authorization flow are not configured. The mobile app displays a clear pending-setup message and keeps password login available. It does not run Google's website popup inside the WebView.
3. **reCAPTCHA:** if Admin enables website reCAPTCHA, native login/registration/reset currently fails closed with a setup message. Native-compatible abuse protection/challenge completion must be implemented before using those flows with reCAPTCHA-enabled deployments. Do not disable server security checks to make the app pass.
4. **Native push:** Firebase/APNs registration, device-token storage, provider sends and notification/deep-link routing are not implemented. The native enable-push action explicitly reports this; in-app notifications work through the backend.
5. **Payment return links:** verified Android App Links/iOS Universal Links, associated domain files, production device tests and durable recovery after app process termination. Payments are never automatically resubmitted.
6. **Private evidence viewer:** authenticated PDF/photo/video file downloads need native secure file handling; the app currently directs the operator to the website for private evidence downloads. Public product media and private draft media requested through the existing bridge use the native transport.
7. **QR/barcode device scanning:** existing browser discovery remains; a dedicated native barcode plugin/device validation is still pending.
8. **Store requirements:** account-deletion workflow, final icons/splash screens, privacy policy/data safety forms, accessibility/translation review, screenshots, versioning, signing and store accounts. Store acceptance is not guaranteed by generating a native project.

## Updates and staging

For a separate HTTPS staging backend, set `CLC_MOBILE_API_ORIGIN` only during the mobile build. It must be an HTTPS origin with no path, credentials or custom port. Rebuild and sync after changing it. Native API routing is restricted to that configured origin. Never put OpenAI, SMTP, Paystack or signing secrets into a mobile bundle.

Website/server changes can be deployed using the existing controlled Contabo release process. Bundled interface/native plugin changes require rebuilding and distributing a new mobile version. Ordinary GitHub pushes do not automatically publish to either store. CI verifies the mobile bundle and transport tests; native builds require their platform toolchains.

An override replaces the Xcode tool's old UUID implementation with a patched CommonJS-compatible UUID 11 release; project parsing/ID generation was checked and `npm audit` reports no known vulnerabilities for the installed lockfile.

References checked October 18, 2026:
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/apis/http
- https://capacitorjs.com/docs/apis/camera
- https://capacitorjs.com/docs/guides/deep-links
