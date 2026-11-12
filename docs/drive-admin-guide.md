# Google Drive — admin guide (credentials entered in the app)

The State Admin no longer needs the hosting panel: **Admin → Settings →
Google Drive → Connection details** takes the four values the Drive layer needs.
They are stored on the server (the Client secret encrypted), so a save takes
effect immediately — no restart, no redeploy.

Only a **State Admin** can open the card or call its API; every change asks for
the admin's password again (5 attempts per 15 minutes) and is written to the
audit log with what changed — never the values.

---

## 1. Get the Client ID and secret (Google Cloud)

1. <https://console.cloud.google.com/> → create (or pick) a project.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen**
   - User type **External** (or **Internal** on Workspace),
   - App name `NQAS Tracker`, your support email,
   - Scope `.../auth/drive.file` — the app only ever sees files it created,
   - **Test users**: add the department Google account while the app is in
     Testing (otherwise Google answers *access blocked*).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**,
   - **Authorized redirect URIs**: paste the value shown in the app's
     **redirect box** (it is `<the-address-you-browse-from>/drive/oauth/callback`),
   - **Create**, then copy the **Client ID** and **Client secret**.

## 2. Enter them in the app

1. Sign in as the State Admin → **Admin → Settings → Google Drive**.
2. Fill **Google Client ID** (must end in `.apps.googleusercontent.com`).
3. Paste **Google Client secret** — it is write-only: after saving you only see
   *Saved ✓ · updated <date> by <you>* and a **Replace** button.
4. **App address**: prefilled with the address you are using. It must be the
   `https://` origin — no path, no trailing slash. `http://localhost` is
   accepted only in development. The **redirect box** below it always shows
   the redirect URI for the address you are browsing from — that is the value
   to keep registered in Google Cloud.
5. Press **Save** in the bar that appears, then type **your password** to
   confirm. Saving is a database write only (under 300 ms); the optional
   Google check runs right after and says either *"Google accepted the client
   details"* or the exact reason it did not.
6. The **six-row checklist** turns green in order:
   Client ID · Client secret · App address · Encryption key · Root folder ·
   Google account connected. A row that is ✗ tells you the one thing to do.

The **Encryption key** is created by the app on the first save (32 random
bytes) and lives in its own table, separate from the encrypted values. You
never type it, it is never returned by any API, and **Rotate key** re-encrypts
the stored secret and the Drive token with a new one.

## 3. Connect

1. Press **Connect Google Drive** (enabled once the first four rows pass).
2. Approve access with the department account. The consent screen runs with
   `drive.file`, `access_type=offline`, `prompt=consent`, a single-use random
   `state` bound to your session and PKCE (S256).
3. The callback stores the refresh token encrypted, creates or verifies the
   folders (`Facility Documents`, `_incoming`, `_trash-review`), and runs the
   **document self-test** once: all six documents — SA Report, SA Checklist,
   NQAS Result, Gap Closure Proceeding, Condemned Certificate and Fire NOC —
   each written to `_incoming`, read back (size and type checked) and deleted.
   The panel lists one pass/fail row per document with the cause when it fails.
4. Press **Test upload** for a one-file probe, and **Refresh storage** to read
   the quota (this is the only button that calls Google; the page itself loads
   from the database alone).

If Google answers with a problem, the app explains it in one sentence:
*redirect address rejected* (copy the redirect URI again), *consent cancelled*,
*Client ID or secret rejected*, or *app not verified* (add the account under
Test users / publish the app).

## 4. Day-2

- **Reconnect** — same button; a revoked token shows the red banner, and stored
  files stay readable whenever the token can still be refreshed.
- **Disconnect** — removes only the stored refresh token; the credentials stay.
- **Clear credentials** — only after Disconnect; removes the saved values and
  the encryption key (asks for the password).
- **Rotate key** — re-encrypts the stored secret and token. If the old token
  cannot be re-read the app asks you to reconnect instead of silently failing.
- **If an environment variable is set** (`DRIVE_CLIENT_ID`,
  `DRIVE_CLIENT_SECRET`, `APP_ORIGIN`) it is used only while nothing is saved
  here: the field shows **From the server environment** and stays editable, and
  saving a value on this page overrides it. `DRIVE_TOKEN_KEY` is the exception —
  an environment key always wins and **Rotate key** is disabled.

## 5. Assumptions and limits

- **Resolution order**: value saved in Admin → environment variable → missing.
  Re-read per request (a 30 s cache exists for the upload path; the save,
  connect and settings reads are always fresh), so no restart is ever needed.
- **The Admin page is the source of truth**: saving there overrides the
  environment, so the page always reports what the app is actually using. The
  encryption key is the one deliberate exception (`DRIVE_TOKEN_KEY` wins),
  because rotating it invalidates what is already encrypted.
- **Password re-check** uses Convex Auth's own credential check (the same scrypt
  comparison as sign-in) and works for password accounts. An account that has
  never set a password is told to register once with the same email.
- **Encryption**: AES-256-GCM with a fresh 12-byte IV per value and a
  purpose-scoped AAD (`client-secret`, `refresh-token`), so a ciphertext cannot
  be moved from one field to another. The stored blob is
  `base64url(iv).base64url(ciphertext||tag)`; the key is in a different table.
- **Cache headers**: Convex function calls are POST RPC with no intermediary
  caching; the two HTTP endpoints that serve bytes and the OAuth callback send
  `Cache-Control: private, no-store`.
- **App address trust**: Convex RPC handlers do not expose the request host, so
  the server validates the address format strictly (https or localhost, origin
  only) against the origin the browser sends, and rejects a mismatch when known.
- **Queued uploads**: a browser upload that failed while storage was
  disconnected cannot be resumed server-side (the bytes never left the browser);
  the `facilityDocuments` row is written only after Drive confirms, the
  `driveUploads` row carries a 24-hour expiry, and the user re-attaches the file
  after reconnecting. Nothing is silently lost or duplicated.
- The service-account model still reads only from the environment
  (`DRIVE_SA_EMAIL`, `DRIVE_SA_PRIVATE_KEY`, `DRIVE_SHARED_DRIVE_ID`); this
  guide covers the OAuth model, which is the one the Admin page sets up.
