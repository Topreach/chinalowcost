Two-factor authentication is optional for customer, worker and administrator accounts. This supersedes earlier documentation describing mandatory Admin enrollment.

Email/password login authenticates credentials first. Accounts without enabled MFA enter their dashboard immediately. Accounts with enabled MFA receive a temporary challenge and must verify an authenticator or recovery code before a session is issued. Existing enrolled accounts remain enrolled; this change does not turn their protection off.

Enrollment happens deliberately under Profile / Account security: confirm the current password, add the secret to an authenticator, then verify its code. Generating a secret alone does not enable MFA. Confirmation enables it, revokes prior sessions and generates one-use recovery codes. Disabling or replacing MFA credentials requires current-password and factor verification. Password confirmation for security-setting changes is reauthentication, not a second authentication factor.

References:
- https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
