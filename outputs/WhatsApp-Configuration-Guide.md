# WhatsApp configuration

The prototype starts in **Demo preview** mode with dummy number **+234 000 000 0000**. It never generates an external chat link for that number.

Sign in as the Manager, open **Admin → WhatsApp settings (A23)**, and edit the business number. The setting is stored locally and shared by customer contact buttons.

Customer buttons appear on Product detail (C07), Tracking (C16) and Support (C18). Clicking opens a preview of the prepared message. Product enquiries include the product name, SKU and selected quantity. Support/order enquiries omit customer addresses, phone numbers and payment details.

When you have the actual business number, enter it in international format, choose **Live chat link**, and save. A dummy or malformed number cannot enable live links. You can disable contact buttons with the checkbox. A live link opens WhatsApp with a draft; the customer reviews and sends it themselves. Nothing is automatically sent.

This is click-to-chat configuration only. Automated notifications, synchronized admin inbox, approved templates, message receipts and incoming-message webhooks remain unconnected and require a secure server integration with WhatsApp Business Platform. No credentials or API keys belong in this local prototype.

Manager access is required to change settings in the preview. Production must enforce this permission server-side. Browser-local settings may be cleared with a business-data reset or cleared browser storage.
