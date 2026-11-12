# Google Drive document storage — administrator setup

The six facility documents (NQAS Result, SA Report, SA Checklist, Gap Closure,
Condemned, NOC) are stored in Google Drive. The browser never talks to Google:
every byte is uploaded and streamed through this app, which checks sign-in,
role and block scope on each request. No Drive link, file id or token ever
reaches the browser, an export or a log line.

Pick **one** of the two auth models below, depending on what the department has.

## Which account does the department have?

| You have | Use | Why |
| --- | --- | --- |
| A **personal** `@gmail.com` (or any single Google account the department owns) | **OAuth** (model A) | A service account has no storage quota and cannot own files in a personal Drive. The department's own account owns the files. |
| **Google Workspace** (`your-dept.gov.in` etc.) with a Shared Drive | **Service account** (model B) | The Shared Drive holds the quota; the service account is added to it as a Content manager. |

If in doubt, use model A (OAuth) — it works with both account kinds.

---

## Model A — OAuth with the department's account (personal Google account)

### 1. Google Cloud project

1. Go to <https://console.cloud.google.com/> and create a project, e.g.
   `NQAS Tracker`.
2. **APIs & Services → Library** → enable **Google Drive API**.

### 2. OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** (a personal account cannot use "Internal").
3. App name: `NQAS Tracker`; add the department's support email.
4. **Scopes** → add `.../auth/drive.file` (the app only ever sees files it
   created itself — nothing else in the account is visible to it).
5. **Test users** → add the department account(s) that will connect Drive
   until the app is verified/published.

### 3. OAuth client

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URI** — exactly one. Copy it from the app's redirect
   box (**Admin → Settings → Google Drive → Connection details**); it is the
   address you open the app from, plus the callback route:

   ```
   https://<the-address-you-browse-from>/drive/oauth/callback
   ```

   It is a real page in the app, so Google always lands back inside the app —
   never on a 404. If you ever open the app from a different domain, copy the
   box again and update Google Cloud.
4. Save the **Client ID** and **Client secret**.

### 4. Credentials — enter them in the app (recommended)

**Admin → Settings → Google Drive → Connection details** (State Admin only):
paste the Client ID, the Client secret and the app address, then save and
confirm with your password. The card generates the encryption key itself, shows
a six-row checklist and the redirect URI with a Copy button. Nothing here needs
a restart. See **`docs/drive-admin-guide.md`** for the click-by-click version.

#### Optional: environment variables (fallback while nothing is saved)

| Variable | Value |
| --- | --- |
| `DRIVE_CLIENT_ID` | the OAuth client ID |
| `DRIVE_CLIENT_SECRET` | the OAuth client secret |
| `DRIVE_TOKEN_KEY` | a 32-byte key, base64 — encrypts the credentials at rest (AES-256-GCM). The app creates one automatically when this is unset; if you do set it, changing it forces a Drive reconnect. |
| `APP_ORIGIN` | `https://<your-app-origin>` |

When a variable is set and nothing has been saved on the Admin page, the
matching field shows **From the server environment**; saving a value there
overrides it. `DRIVE_TOKEN_KEY` is the exception — an environment key always
wins and cannot be rotated from the page.

### 5. Connect

1. Click **Connect Google Drive**. Google asks for consent once; approve it.
2. The callback exchanges the code (PKCE), stores the refresh token encrypted,
   creates `Facility Documents`, `_incoming` and `_trash-review` when no root
   folder is set, and runs the document self-test once.
3. Optional: to keep files in a folder you choose, create it in the department
   account, copy the id from `https://drive.google.com/drive/folders/<ID>`, and
   paste it into **Root folder ID** → **Save storage settings** → **Check
   folder** (it shows the folder's name).
4. Click **Test upload** — it uploads a tiny probe file and deletes it.
   A green result means the storage layer is live.

The app creates the folder tree on demand under the root:

```
NQAS Tracker                       (root — you created this)
  Facility Documents
    <Block>
      <NIN> - <Facility name>
        NQAS_Result / SA_Report / SA_Checklist / Gap_Closure / Condemned / NOC
          _versions                (files this upload replaced)
  _incoming                        (bulk-upload staging)
  _trash-review                    (removed files, kept per retention setting)
```

---

## Model B — Service account with a Shared Drive (Google Workspace)

### 1. Google Cloud project and Workspace permissions

1. Create the Cloud project and enable the **Google Drive API** (as above).
2. A Workspace admin must allow service-account Drive access:
   **Admin Console → Security → API Controls → Domain-wide delegation** —
   authorise the service account's **Client ID** with scope
   `https://www.googleapis.com/auth/drive`.
   (Domain-wide delegation is not needed if the Shared Drive is shared with
   the service account directly and the tenancy allows it; sharing alone is
   enough for most set-ups.)

### 2. Service account

1. **IAM & Admin → Service Accounts → Create service account**, e.g.
   `nqas-tracker-drive`.
2. Create a key (**Keys → Add key → Create new key → JSON**) and keep the JSON
   safe — it is the credential.
3. Note the service account's **email** and the **private key** inside the JSON.

### 3. Shared Drive

1. Create (or pick) a Shared Drive for the department, e.g. `NQAS Tracker`.
2. Add the service account email as a member with role **Content manager**
   (it needs to create folders and files; it does not need full access).
3. Copy the Shared Drive **id** from its URL.

### 4. Server secrets

| Variable | Value |
| --- | --- |
| `DRIVE_SA_EMAIL` | the service account email |
| `DRIVE_SA_PRIVATE_KEY` | the private key from the JSON (keep `\n` escapes if the dashboard requires it — the app converts them) |
| `DRIVE_SHARED_DRIVE_ID` | the Shared Drive id |
| `DRIVE_TOKEN_KEY` | same as model A (encrypts credentials at rest) |
| `APP_ORIGIN` | `https://<your-app-origin>` |

Then set **Root folder id** in **Admin → Settings → Google Drive** to the
Shared Drive id, and click **Test upload**. No consent screen is needed in
this model.

---

## Day-2 operations (both models)

- **Reconnect** — if Google revokes the connection, the Settings page turns
  red and uploads are blocked with *"Document storage is unavailable: ask the
  administrator to reconnect Google Drive"*. Existing files stay readable.
  Click **Connect / Reconnect** and approve again. Uploads that failed while
  disconnected stay queued for 24 hours and retry by themselves.
- **Pause uploads** — the switch in Settings stops new uploads (e.g. during a
  migration window) without touching stored files.
- **Nightly reconciliation** — a cron job verifies every current document
  still exists in Drive with the same checksum. Anything missing is listed
  under **Document storage health** and as amber *File missing in Drive* in
  Needs attention. Database rows are **never** auto-deleted.
- **Removed files** wait in `_trash-review` for the retention period
  (default 30 days) before permanent deletion; State Admins can restore them.
- **Rotation** — to rotate credentials, create the new client/keys in Google,
  update the environment variables (and `DRIVE_TOKEN_KEY` only if you accept
  that every stored refresh token becomes unreadable), then **Reconnect**.
  There is no token export: rotation is always "reconnect".

---

## Assumptions

1. **Auth model**: both models are implemented; whichever secrets are present
   decide the mode. With no secrets the app simply reports "not connected".
   OAuth (model A) is the default recommendation because it works for a
   personal account and for Workspace without delegation set-up.
2. The deployed origin is stable (one canonical `APP_ORIGIN`) because the
   OAuth redirect URI is fixed at client-creation time.
3. Department policy allows document metadata (file names, sizes, checksums,
   uploader identity) in this app's database — only the *bytes* live in Drive.
4. File-size limits (default 10 MB, hard cap 25 MB per type) and the 90% space
   warning match the department's Drive quota; both are adjustable in Settings.
5. Retention of 30 days for removed files satisfies the department's records
   policy; it is an admin setting, not a hard-coded constant.
6. The nightly reconciliation runs from the platform cron (see
   `src/convex/crons.ts`); no external scheduler is assumed.
7. The app never creates sharing permissions in Drive ("anyone with the
   link", per-user shares). Access is granted exclusively through this app's
   own authentication, so a revoked app role cuts access on the next request.
8. Existing legacy uploads (from the pre-Drive Convex file storage) are moved
   by the idempotent migration job; until a file is migrated it stays readable
   from its old location and is marked `convex` in the database.
