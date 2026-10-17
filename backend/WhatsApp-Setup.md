# WhatsApp contact and automatic shopping replies

Admin > WhatsApp settings (A23) contains two independent forms. The contact form configures the public click-to-chat number. The automation form configures Meta WhatsApp Cloud API. OpenAI alone cannot send WhatsApp messages.

## Configure automatic replies

1. Enable your existing OpenAI integration in Admin integrations. Its saved encrypted key, model and per-contact/global daily limits are reused; no second OpenAI key is needed.
2. Register a business number with Meta WhatsApp Cloud API and obtain its Phone Number ID, access token with messaging permissions and Meta app secret. Use the supported Graph API version shown in your Meta app (the editable initial value is v23.0). Temporary test tokens expire; production requires an appropriately managed token.
3. Choose a random webhook verification token of at least 16 characters. Enter these values in Admin > WhatsApp settings > Automated WhatsApp replies. Blank credentials preserve saved values. Enter the current Admin password and save; Admin MFA is mandatory. Credentials are encrypted using the existing APP_ENCRYPTION_KEY, which must remain stable.
4. Set Meta callback URL to https://chinalowcost.com/api/whatsapp/webhook and enter the same verification token. Subscribe the app/business account to messages. Keep this callback reachable through Cloudflare without interactive challenges. Meta registration, app permissions and account approval must be completed separately.
5. Enable automation, send a message from an allowed test customer and check Recent automatic reply attempts. Start with Meta test recipients before production. No live acceptance test has been performed by development tools.

Webhook GET verifies the challenge; POST verifies the raw SHA-256 signature and configured Phone Number ID. Only recent incoming text messages trigger replies. Customer messages are stored encrypted in a durable SQLite queue, deduplicated by Meta message ID and deleted after seven days when processing is active. Contact hashes and pause preferences remain. Queue processing is serial, with bounded provider timeouts and existing OpenAI usage limits. OpenAI receives the customer's text plus published product SKU/title/retail price/minimum quantity/stock status; no Meta phone number, private costs, account or order records are added. Customers should avoid sharing sensitive information in chat.

Replies identify the AI assistant. STOP or HUMAN pauses future AI replies; START resumes. Requests mentioning Yoruba, Hausa or Igbo select that language for the reply; other messages default to English. HUMAN is a handoff request, not a guarantee that a worker is online. Staff must monitor handoff statuses and respond through their approved WhatsApp tooling; this app does not include a synchronized staff conversation inbox.

Free-form replies are limited to incoming messages less than 23 hours old, leaving a margin inside the customer service window. No unsolicited campaigns, marketing templates, automated order notifications, media analysis or business-initiated messages are sent by this implementation. These require separate templates, consent and workflow integration.

Accepted means Meta accepted the HTTP request; it does not confirm delivery/read. Unknown network outcomes or interrupted sends become uncertain and are never automatically retried. Check WhatsApp before replying manually. Interrupted/failed AI generation is recorded for review; customers can send a new message. Pausing automation prevents new replies. Only one application process should consume this SQLite queue; multi-instance deployment requires coordinated job leases.

Sources: [Meta webhook verification](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/) and [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).
