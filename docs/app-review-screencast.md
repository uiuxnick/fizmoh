# App Review screencast — what to record

Meta's reviewer sits in California with no account on this platform and no
context. The recording has to show, without narration being required, that each
permission is used for the purpose claimed. One take, 3–5 minutes, screen only.

Record with QuickTime (File → New Screen Recording) or Cmd+Shift+5. Use a
browser window at 1280×800 or larger. Do not blur anything a reviewer needs to
read; do blur nothing else — a heavily redacted video gets rejected.

## Before you start

- Sign in as `platform@fizmoh.cloud` in one window, and have a tenant workspace
  ready in another.
- Have a real WhatsApp number connected. **This is the one thing that will fail
  review today** — every number on the account is a Meta test number, and a
  reviewer who sees +1 555 will not accept it as a working integration.
- Close anything with a customer's real personal data on screen that is not
  needed for the step being shown.

## The sequence

**1. What the product is (20 seconds)**
Open `app.fizmoh.cloud`. Show the marketing page briefly, then sign in. Say
nothing; let the screen show a real product rather than a demo shell.

**2. `business_management` — connecting a business (45 seconds)**
Go to Numbers → Connect with Facebook. Show the Embedded Signup dialog opening,
selecting the business portfolio, and completing. Show the connected number
appearing in the panel with its business name and ID. This is the whole reason
the permission is requested: the business chooses which portfolio to connect,
and the app reads it back.

**3. `whatsapp_business_management` — managing that account (45 seconds)**
On the Numbers screen, show the number's live details — quality rating,
messaging limit, verified name, phone number ID. Then open Templates and show
the template list loaded from the WhatsApp Business Account, and create or
submit one template.

**4. `whatsapp_business_messaging` — a real conversation (60 seconds)**
Open WhatsApp Inbox. Send a message from a real phone to the connected number
and show it arriving. Reply from the panel and show it arriving on the phone.
Show both sides. This is the single most important 60 seconds in the video.

**5. `whatsapp_business_manage_events` — logging an event (30 seconds)**
Show a booking or order being completed in the panel, and the resulting event
being logged against the business account. If no dataset is connected yet, show
the settings screen where the business links its dataset and explain in the
submission text that events are logged on the business's behalf when they do.

**6. `public_profile` — who signed in (15 seconds)**
Show the account menu with the signed-in person's name and picture, as returned
by Facebook Login. That is the entire use: identifying the person connecting the
account.

## What reviewers reject

- A number beginning +1 555 — Meta's own test numbers. Connect a real one first.
- A video that shows the API console instead of the product. They want the user
  journey, not Graph API Explorer.
- Silent screens with nothing happening while something loads. Cut those.
- A permission claimed but never shown in use.
