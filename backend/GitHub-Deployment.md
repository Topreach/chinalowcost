# GitHub and controlled Contabo releases

Repository: https://github.com/Topreach/chinalowcost

A push stores code and runs CI. It does not automatically deploy production. Do not use git pull inside /opt/chinalowcost as a production update method.

## What stays private and persistent

- /opt/chinalowcost/.env: SMTP/OpenAI/provider settings and stable APP_ENCRYPTION_KEY.
- /opt/chinalowcost/data: SQLite, private media and application state.
- /opt/chinalowcost/releases: independent source/dependency directories for each release.
- /opt/chinalowcost/current: atomic symlink to the active code.
- /root/chinalowcost-release-backups: private pre-release database snapshots and service configuration.

The repository ignores .env, databases, data directories, uploads, private keys, encrypted backups, node_modules and log files. It includes .env.example with empty configuration values. Keep the repository private if you do not intend to publish your source code.

## One-time setup on the existing server

Prerequisites: current application and data are backed up, Node 24.14+, Git, curl, tar, Nginx, flock and systemd. The current installation uses port 3100 and the chinalowcost service account. Do not change payment mode or encryption keys as part of a code update.

1. Clone the source into /opt/chinalowcost-source. For a private repository, configure a separate read-only GitHub deploy key on the VPS. Verify GitHub's host key using its official documentation. Never place a GitHub token in the remote URL or repository files.

   git clone https://github.com/Topreach/chinalowcost.git /opt/chinalowcost-source

2. Install the reviewed scripts as root-owned files. The installed deploy script remains fixed until deliberately reviewed and replaced; application releases do not silently replace the privileged deploy helper.

   install -m 0750 -o root -g root /opt/chinalowcost-source/work/deploy/release.sh /usr/local/sbin/chinalowcost-release
   install -m 0750 -o root -g root /opt/chinalowcost-source/work/deploy/forced-deploy-command.sh /usr/local/sbin/chinalowcost-deploy-command
   bash /opt/chinalowcost-source/work/deploy/install-release-layout.sh

   This updates the service definition but does not restart the currently running application. Existing code remains the first rollback target. Database paths must resolve inside /opt/chinalowcost/data.

3. Install the maintenance page in /opt/chinalowcost/public-maintenance/maintenance.html (readable by Nginx). Adapt work/deploy/nginx-maintenance.conf inside the existing chinalowcost.com HTTPS server block. Keep the existing Cloudflare Origin certificate and other sites intact. Add the documented maintenance.flag guard inside the existing location / proxy block. Run nginx -t, then systemctl reload nginx. The deploy helper refuses to run without this guard.

4. Confirm persistent .env has PORT=3100 and correct DATABASE_FILE/UPLOAD_DIRECTORY values. Do not paste or print the file publicly. Relative ./data paths also work through the release's data symlink. Configure TRUSTED_PROXY_CIDRS only for actual trusted proxies; do not blindly trust forwarded client headers. Cloudflare may require its verified proxy ranges/Nginx real-IP configuration as part of your existing perimeter setup.

## First controlled release from SSH

Get a full commit SHA whose GitHub Application checks passed. Then run:

   bash /usr/local/sbin/chinalowcost-release FULL_40_CHARACTER_COMMIT_SHA

The helper locks deployments, fetches main, verifies commit ancestry, prepares a new release, installs locked dependencies with scripts disabled, builds and tests it as the application user, and checks startup against a private database snapshot with provider calls/background jobs disabled. The existing application continues running during preparation.

It then enables maintenance, stops the old process gracefully, takes a pre-migration database snapshot, switches the code symlink and starts the candidate. Background notification/WhatsApp jobs stay paused under maintenance. After readiness passes, public traffic and background jobs resume. Expect a short maintenance window, not a guarantee of zero downtime. The page tells customers to check an existing payment before paying again.

If startup fails before traffic is reopened, the script stops the candidate, restores the pre-release database snapshot and switches to the previous code. It health-checks the old service before removing maintenance. A failed restore/start leaves maintenance enabled for operator intervention. Do not automatically restore an old database after customers have resumed writing; doing so would lose newer orders and account changes. Later application issues require a reviewed forward fix or a planned compatible code rollback.

## GitHub Actions release button

After the first SSH release is verified, create the GitHub production environment and these environment secrets:

- SSH_HOST: 173.249.34.3
- SSH_PORT: 2222
- SSH_USER: root (or a separately configured deploy account)
- SSH_PRIVATE_KEY: a dedicated deployment key, not your personal everyday SSH key.
- SSH_KNOWN_HOSTS: the verified SSH known_hosts entry for [173.249.34.3]:2222. Do not use an unverified ssh-keyscan result as the trust source.

For the dedicated root deployment key, restrict its authorized_keys line with:

   restrict,command="/usr/local/sbin/chinalowcost-deploy-command" PUBLIC_DEPLOY_KEY

This key can invoke only the validated fixed deployment command. Keep your normal SSH access separately. Protect main with required Application checks and reviews as appropriate; optionally require production environment approval. CI and deployment actions are pinned to official action commit hashes, and dependency update PRs are configured.

Open GitHub > Actions > Release to Contabo > Run workflow, selecting main. The workflow tests the exact commit, then calls the fixed server helper over strict-host-verified SSH. There is no deployment on every ordinary push. No production environment secrets or SSH access have been configured by the local file changes alone.

## After each release

Verify sign-in for each role, an approved quotation and test payment, inventory behavior, notification preferences and one worker task. Confirm the revision file, service status, private file permissions and public HTTPS behavior. Monitor logs without printing tokens or complete provider responses. Keep encrypted off-server backups and perform a restore drill; pre-release snapshots on the VPS are not disaster recovery.

The code is not certified perfect. Read Implementation-Status.md and complete real provider/device/operator acceptance before enabling live payments. Never switch test and live against the same database.
