# Customer delivery location and contact

The existing C11 delivery-address form includes Use my location, a required delivery phone number, optional international WhatsApp number, same-phone checkbox and preferred contact method. Numbers are used for order/delivery support; this is not marketing consent or proof that the number belongs to the customer.

Location capture occurs only on a customer click, through browser permission on HTTPS or the native Geolocation plugin. No background tracking is requested. Captured coordinates and accuracy are shown for review; the customer must explicitly confirm the pin before saving it. The destination can always be entered manually, and the pin can be removed. GPS is not proof of an exact building or delivery coverage.

GPS coordinates do not require a Google Maps API key. An unchecked-by-default option permits sharing the location with Google to suggest a street, state and town. Address lookup uses the encrypted Maps key saved in Admin A30 Google services; enable the Geocoding API for that key, with the appropriate Google billing/API configuration and server IP restrictions. The key never reaches the browser or mobile bundle. Provider failures leave manual entry and the captured pin available.

The lookup endpoint requires a customer session, CSRF token, explicit consent and a fresh bounded position; provider calls are rate limited and use a fixed Google HTTPS endpoint. Google error details and keys are not returned. Suggested fields are editable. Existing typed street/postcode values are not overwritten. The customer remains responsible for confirming the actual destination.

Confirmed pins, phone, WhatsApp and preferred contact are saved in the private customer address, saved address book, quotation and order snapshots. Existing role/assignment controls continue to restrict access to order details. Quotes and transport prices still use approved state/town/weight rules, not unverified GPS or a reverse-geocoded suggestion.

This change does not send SMS/WhatsApp messages, verify a phone number, provide an embedded draggable map or implement continuous customer tracking. It captures accurate contact/destination details for the existing support and fulfilment workflows.

Deploy the backend and rebuild/install mobile assets for the new fields to be available everywhere. Check real-device permission acceptance/denial, weak GPS, manual entry, same-phone conversion, other-town entry, saving/reusing addresses, quotation snapshots and assigned-worker visibility before production acceptance.

Provider reference: https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-reverse-geocoding
