# ChinaLowCost

Customer, worker and Admin commerce application using the original designed interface, a Node.js backend and SQLite. Node.js 24.14 or newer is required.

## Run locally

1. Run npm ci --ignore-scripts.
2. Copy .env.example to .env and configure local values. Never commit .env.
3. Run npm run build, then npm test.
4. Run npm start and open the configured APP_URL (default http://localhost:3000).

The real application is served at /application. The standalone design preview is outputs/Screen-Blueprint.html. Build outputs retain the original homepage and CSS.

## Production and updates

Read [GitHub and server releases](backend/GitHub-Deployment.md) before deployment. Production settings, SQLite databases, uploads and encryption keys stay on the server outside Git. Releases are prepared separately, checked against an isolated database snapshot and activated during a short maintenance window. A failed initial startup restores the pre-release snapshot and previous code before reopening public traffic.

GitHub Actions runs application checks on pushes and pull requests. Production deployment is an explicit Run workflow action after configuring the production environment and SSH secrets. A commit or push does not automatically update the live server.

## Readiness

Passing automated tests does not guarantee production readiness. New inventory, purchase-order and finance flows need operator acceptance; real payment/refund/transfer, SMTP, malware scanning and device push need provider/device acceptance. Keep PAYMENT_MODE=test until those checks and the separate live-database setup are completed. No real transactions are performed by the test suite.

See [remaining work](backend/Implementation-Status.md), [notification setup](backend/Notification-Status.md), [email setup](backend/Email-Templates.md), [WhatsApp setup](backend/WhatsApp-Setup.md) and [application review](backend/Application-Review.md).

## Security and backups

Report suspected security problems privately to the project owner. Do not put credentials, customer data, database exports, private upload files or private backup keys in GitHub issues or commits. Use the encrypted backup workflow for off-server copies; source control is not a database backup.
