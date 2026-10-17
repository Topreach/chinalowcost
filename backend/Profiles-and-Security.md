# Profiles and account security

The original role account screens now provide server-backed profile and security
controls:

| Role | Profile/security screen | Two-factor policy |
| --- | --- | --- |
| Customer | Account & security C25; profile also on C20 | Optional |
| Worker | Account & security W21 | Optional |
| Admin | Account & security A41 | Mandatory |

## Profile

Each account can edit its display name, contact phone and preferred
English/Yoruba/Hausa/Igbo language. Records are stored in SQLite and scoped to
the signed-in account. Role, verified email, staff team and assignments cannot
be changed through this form. Worker operational names/assignments remain
Admin-managed. Contact phone is a profile field, not a verified phone number or
SMS authentication method. Email change and avatar upload are not implemented.

## Password and sessions

Changing a password requires the current password and a matching new-password
confirmation. The server requires 12–128 characters and stores salted scrypt
hashes. A successful change clears every session and outstanding password/email
challenge; the original interface clears private cached account state and asks
the user to sign in again. Existing 2FA remains enabled.

The account screen shows the number of active sessions and offers **Sign out
other devices**, protected by the current password and CSRF. The current session
remains active. Session expiry is 30 minutes idle or 12 hours absolute.

## Authenticator and recovery codes

To enable 2FA, enter the current password, generate the authenticator secret,
add that secret manually to an authenticator app, and confirm its current six
digit code. No external QR-generation service receives the secret. Setup issues
ten recovery codes, shown transiently in the current session; save them securely
and then dismiss the display. Only hashes of recovery codes are stored. TOTP
secrets are encrypted with APP_ENCRYPTION_KEY.

Every recovery code works once, with the account password or a verified Google
identity. Login accepts either an authenticator code or a recovery code. Enabling
2FA invalidates older sessions, including sessions that did not complete 2FA.

Replacing recovery codes requires the current password and a fresh authenticator
or unused recovery code. All older codes become invalid. Customers and workers
may disable 2FA using the same proof; doing so signs out every device and removes
the authenticator secret and recovery-code hashes. Admin 2FA cannot be disabled
through the application.

Google sign-in respects an enabled second factor. Its popup has a field for the
authenticator/recovery code before continuing with Google. A Google-created
account without a known password must first set a password through the email
reset flow before using password-protected account settings. Email reset needs
working SMTP and does not remove 2FA. If both the authenticator and recovery
codes are lost, there is no self-service 2FA bypass or automated staff recovery.

Recovery codes remain on the account screen until acknowledged, account change
or page reload. They are not stored in browser local storage. Back up the server
encryption key securely; changing it breaks existing authenticator secrets and
encrypted integration credentials.

## Verification and deployment

Automated checks cover all three role profiles, account isolation, blocked role
and email changes, CSRF, authenticator replay, one-use/replaced recovery codes,
old-session invalidation, mandatory Admin 2FA, optional disable, password/session
revocation, Google second-factor enforcement and original-interface profile
saving with escaped display names. No browser/device authenticator acceptance
test was performed.

Run `npm run build` and restart locally. Deploy the updated archive separately
to Contabo while retaining the existing .env, database and encryption key.
