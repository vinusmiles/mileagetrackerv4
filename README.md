# MileageMate

A simple website to track fuel fills, mileage (km/L) and fuel spend for two-wheelers and four-wheelers. Plain HTML, CSS and JavaScript, hosted on GitHub Pages. No build step.

**Current status: Phase 2.** Sign-in (Google, and optionally mobile number with SMS OTP) and cloud storage in Cloud Firestore. Until you fill in `js/firebase-config.js`, the site keeps working in "this device only" mode.

Smart fuel entry (`#/smart`) lets you add a receipt photo and/or an odometer photo, then review and save. **The photo reader is still a labelled demo: it does not read the photos.** Real reading arrives in Stage 2 through a secure backend.

## Folder structure

```
mileagemate/
├── index.html            App shell: top bar, navigation, dialog
├── firestore.rules       Security rules to paste into Firebase
├── css/styles.css        All styles (mobile first, light and dark)
├── assets/icon.svg       App icon
├── js/
│   ├── app.js            Starts the app; hash router (#/history, #/fuel/new …)
│   ├── firebase-config.js  Your Firebase web settings (public, not secret)
│   ├── auth.js           Google and phone sign-in, sign-out, error messages
│   ├── sync.js           Copy this device's data into your account
│   ├── cloud/firebase.js Loads the Firebase SDK (pinned version) only when configured
│   ├── backends/         local.js (this device) and firestore.js (cloud)
│   ├── store.js          Data layer used by every screen; talks to a backend
│   ├── demo-data.js      Clearly marked sample vehicles and fills
│   ├── format.js         ₹, km, litres, DD-MM-YYYY formatting
│   ├── ui.js             Shared UI helpers (dialog, toasts, odometer digits, form errors)
│   ├── charts.js         Small SVG bar chart, no library
│   ├── smart/            Smart fuel entry
│   │   ├── config.js     Which photo reader to use, size limits
│   │   ├── extractor.js  One entry point; providers are swappable
│   │   ├── providers/mock.js  Stage 1 demo reader (does not read photos)
│   │   ├── schema.js     Cleans any provider's result; unreadable → null + review
│   │   ├── checks.js     Review checks (arithmetic, fuel type, odometer, dates)
│   │   ├── duplicates.js Possible-duplicate detection
│   │   └── images.js     File checks, resize to 1600 px, strips photo metadata
│   ├── core/             Pure logic, no browser code, fully tested
│   │   ├── calc.js       Mileage, intervals, monthly totals, price/total maths
│   │   ├── validate.js   Vehicle and fuel entry checks
│   │   ├── dates.js      Local-date helpers
│   │   └── model.js      Vehicle types, fuel types and units
│   └── views/            One file per screen
│       ├── dashboard.js  Overview and per-vehicle dashboard
│       ├── vehicles.js   List, add, edit, delete vehicles
│       ├── fuel-form.js  Add and edit fuel entries
│       ├── history.js    Filters, totals, monthly chart, all fills
│       ├── smart.js      Smart fuel entry: photos → review → save
│       ├── login.js      Sign-in screen
│       ├── settings.js   Sample data, delete all data
│       └── shared.js     Pieces used by several screens
├── tests/
│   ├── calc.test.js      Test cases for the calculations and validation
│   ├── smart.test.js     Test cases for photo-reading results, checks, duplicates
│   ├── store.test.js     Test cases for the data layer (saving, deleting, importing)
│   ├── harness.js        Tiny test runner (no install needed)
│   ├── run-node.js       Run tests with Node
│   └── index.html        Run tests in any browser
├── package.json          Only for `npm test`; the site does not need Node
└── .gitignore
```

## Run it on your computer

The app uses JavaScript modules, which browsers refuse to load from a double-clicked file (`file://`). Serve the folder instead:

- **VS Code:** install the *Live Server* extension, right-click `index.html`, choose *Open with Live Server*.
- **Python:** in this folder run `python -m http.server 8000`, then open http://localhost:8000/

## Run the tests

- In a browser: open `tests/` on your local server or on the live site (for example `https://<username>.github.io/mileagemate/tests/`).
- With Node 18 or newer: `npm test` (nothing to install).

## Put it on GitHub Pages (short version)

1. In GitHub Desktop: *File → New repository*, name it `mileagemate`, choose this folder's parent, create. Or copy these files into a new repository folder.
2. Commit all files and click *Publish repository* (untick *Keep this code private* if you are on a free plan and want Pages).
3. On github.com open the repository → *Settings → Pages* → *Source: Deploy from a branch* → branch `main`, folder `/ (root)` → *Save*.
4. After a minute the site is at `https://<username>.github.io/mileagemate/`.

All links are relative and routing uses `#/…`, so the app works under that sub-path with no extra setup. Full deployment and Firebase steps come in Phase 2 and 3.

## Phase 2 setup: Firebase

Do these once in the Firebase console (https://console.firebase.google.com) with your Google account.

1. **Create a project.** Add project → any name (for example `mileagemate`). Google Analytics is not needed.
2. **Register the website.** Project overview → the `</>` (Web) icon → nickname `MileageMate` → Register (skip Firebase Hosting; GitHub Pages hosts the site). Copy `apiKey`, `authDomain`, `projectId` and `appId` from the config shown into `js/firebase-config.js`.
3. **Turn on Google sign-in.** Build → Authentication → Get started → Sign-in method → Google → Enable → choose your support email → Save.
4. **Allow your website address.** Authentication → Settings → Authorized domains → Add domain → `vinusmiles.github.io` (only the domain, no `https://` and no `/mileagetracker/`).
5. **Create the database.** Build → Firestore Database → Create database → **production mode** → location `asia-south1 (Mumbai)`. The location cannot be changed later.
6. **Publish the security rules.** Firestore Database → Rules → replace everything with the contents of `firestore.rules` → Publish.
7. **Deploy and test.** Commit and push. Open the site, sign in with Google. If this browser has data from before, tap **Copy to my account**.

No Firestore indexes are needed: the app only reads each user's own vehicles and each vehicle's entries.

### Check that users are isolated

Firestore Database → Rules → **Rules Playground**: choose *get*, path `users/someone-else/vehicles/x`, turn on *Authenticated* with a different UID → Run. It must say **denied**. Repeat with the same UID in the path and the auth UID: it must be allowed.

### Optional: mobile number + SMS OTP

Phone sign-in only works on the **Blaze (pay-as-you-go) plan with a billing account**, and every SMS is charged at a rate that depends on the country.

1. Upgrade the project to Blaze and **set a budget alert** (for example ₹200 a month) in Google Cloud Billing.
2. Authentication → Sign-in method → Phone → Enable.
3. While testing, add **test phone numbers** with fixed codes on the same screen; they never send a real SMS.
4. Authentication → Settings → **SMS region policy** → allow only India, so bots cannot run up charges on foreign numbers.
5. Set `phone: true` in `js/firebase-config.js`, commit and push.

Abuse protection already in the app: Firebase's invisible reCAPTCHA on every SMS request, Firebase's own rate limits ("too many attempts"), a 30-second wait before resending, and a check that the number is a 10-digit Indian mobile number.

### Sign-in options compared

- **Google:** free, no SMS cost, works everywhere. Recommended default.
- **Phone + SMS OTP:** familiar in India, but needs Blaze billing and costs per SMS.
- **Email:** Firebase has no email OTP code. It offers *email link* sign-in (you click a link in your inbox), which is free but clumsier on phones. Not built; can be added later.

### What is stored, and where

Each user's data lives only under `users/{uid}`. No passwords or OTP codes are stored by MileageMate. A copy of your data is kept in the browser (IndexedDB) so the app opens quickly and works with a weak signal; signing out clears it. Photos from Smart fuel entry are never uploaded or saved.

## How mileage is calculated

Mileage is measured from one full-tank fill to the next:

- distance = odometer at the later full tank − odometer at the earlier full tank
- fuel = every fill after the earlier full tank, up to and including the later one
- mileage = distance ÷ fuel

The fuel bought at the earlier full tank is not counted, because it replaced fuel used before that point. Average mileage is total distance ÷ total fuel across all valid stretches (not an average of averages). Stretches with an odometer reading that goes backwards are skipped and flagged.

## Data model

Stored locally now in the same shape planned for Firestore (`users/{uid}/vehicles/{vehicleId}/fuelEntries/{entryId}`):

- **vehicle:** nickname, type (`two` / `four`), make, model, registration, fuelType (`petrol`, `diesel`; `cng`, `electric` reserved), initialOdometer, createdAt, updatedAt
- **fuel entry:** vehicleId, date (`YYYY-MM-DD`), quantity, unit (`L`, later `kg` / `kWh`), pricePerUnit, totalAmount, station, odometer, fullTank, notes, calculated (which of quantity / price / total was worked out), createdAt, updatedAt

Optional fields saved by Smart fuel entry: time, fuelCompany, location, receiptNumber (text, can contain letters), dashboardRangeKm (reference only, never used as the odometer), source (`manual`, `smart`, `smart-demo`).

Photos are never saved. They are resized in the browser, kept in memory while you review, and released when you save or cancel.
