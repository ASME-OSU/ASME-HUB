# Connect Annual Setup directly to Hub Step 2

Maintainer setup reference, October 15, 2026. The intended officer flow is to sign in with Google inside Step 2, load the approved saved workspace, answer the annual goal question, then create or reopen the year's files. Results return directly to the Hub. Officers do not need an annual setup tab or copy/paste transfer for this route. Google's account/consent popup is still required.

**Chapter-account acceptance, October 15, 2026:** the shared standard Cloud project, five OAuth scopes, approved browser origins and owner-only API deployment were configured. From `http://localhost:8080`, Google sign-in loaded the saved Practice workspace and reopened its existing 2027–2028 files; all seven returned URLs matched the original receipt and persisted after a Hub reload. All manual reviews remained unpassed. This checks the reopen path, not a fresh annual creation or production activation. Verify the published origin after release; retain the detailed acceptance privately.

## 1. Use one standard Google Cloud project

The chapter-account maintainer selects or creates one chapter-controlled **standard** Cloud project. Record its project number privately. In the existing standalone Annual Provisioner Apps Script project, open **Project Settings → Google Cloud Project → Change project**, enter that project number and choose **Set project**. Review the existing deployment/configuration before changing its association; changing Cloud projects requires reauthorization. The browser OAuth client below must belong to this same project. A default Apps Script Cloud project is insufficient. See [Google's Cloud project instructions](https://developers.google.com/apps-script/guides/cloud-platform-projects#switch-to-a-different-standard-cloud-project).

In that Cloud project's **APIs & Services → Library**, enable **Google Apps Script API** and the **Google Drive API**, **Google Sheets API** and **Google Forms API** backing services used by the script. API execution cannot rely on an interactive editor run to enable missing services; a missing backing service can produce “Permission denied while enabling APIs.” The API executable and client must share this project. Use user OAuth, not a service account. The token must cover the complete script scope list, including scopes outside the selected function. See [Google's API execution requirements](https://developers.google.com/apps-script/api/how-tos/execute#requirements).

## 2. Configure consent and a browser OAuth client

In the same Cloud project, open **Google Auth platform** and configure **Branding**, **Audience** and **Data Access** with approved chapter details. If using an External app in testing, add `asmeohiostate@gmail.com` under **Audience → Test users**. Consumer Gmail is not a Workspace internal audience. Declare the manifest scopes listed below and record any unresolved Google authorization/verification requirement; do not describe a warning or test-user entry as verification. See [Google's consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent).

Create an **OAuth client ID → Web application**. Set these **Authorized JavaScript origins**:

| Use | Origin |
|---|---|
| Published Hub | `https://asme-osu.github.io` |
| Local preview on port 8080 | `http://localhost:8080` |
| Additional localhost origin Google recommends for testing | `http://localhost` |

Origins contain scheme and host, plus the local port, with no `/ASME-HUB/` path. Use the matching origin when opening the preview; `127.0.0.1` is a different origin. This browser token flow does not require a redirect URI. Copy only the client ID ending in `.apps.googleusercontent.com` into Hub configuration. Never copy a client secret into repository/browser code. See [Google's browser-client instructions](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).

## 3. Deploy the existing script as an owner-only API executable

As `asmeohiostate@gmail.com`, install/read back the reviewed standalone source and [manifest](appsscript.json.example). Preserve existing script properties, saved workspace purpose, run receipts, locks and deployment records. Preserve the existing self-only web-app settings if that deployment is retained. For API execution, include the separate manifest entry:

```json
"executionApi": { "access": "MYSELF" }
```

In Apps Script choose **Deploy → New deployment → Select type → API Executable**. Set **Who has access → Only myself**, then deploy the reviewed version. `MYSELF` permits the deploying user, so the chapter account must deploy it as well as own the project. This API entry has its own access setting; a self-only web app alone does not configure API execution. See [Google's API deployment procedure](https://developers.google.com/apps-script/api/how-tos/execute#step_2_deploy_the_script_as_an_api_executable) and [manifest access definition](https://developers.google.com/apps-script/manifest/web-app-api-executable#executionapi).

Under **Deploy → Manage deployments**, select this API executable and record its **Deployment ID** and version. The REST endpoint is:

```text
POST https://script.googleapis.com/v1/scripts/{deploymentId}:run
```

Use the API executable deployment ID, not the Apps Script project ID or the web app's `/exec` URL/ID. The current [REST method reference](https://developers.google.com/apps-script/api/reference/rest/v1/scripts/run#http-request) explicitly names `deploymentId` in both the endpoint and path parameter. The Hub sends `devMode: false`, so saving source does not update the deployed version. Deliberately update the API deployment to a reviewed version when source changes.

## 4. Set the public Hub connection values

In `ASME_HUB_CONFIG.annualProvisioner`, add this `api` object, replacing only the two identifier placeholders with verified values:

```js
api: {
  clientId: "REPLACE_WITH_WEB_CLIENT_ID.apps.googleusercontent.com",
  deploymentId: "REPLACE_WITH_API_EXECUTABLE_DEPLOYMENT_ID",
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/forms",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

The full configuration path is **`ASME_HUB_CONFIG.annualProvisioner.api`**, with exactly `clientId`, `deploymentId` and `scopes`. The five scopes above match `oauthScopes` in `appsscript.json.example`: Drive files/folders, Sheets, Forms, script/trigger operations and chapter-account email identification. Compare the installed project's **Overview → Project OAuth Scopes** too. If the reviewed installed manifest changes, reconcile this list and consent configuration before release; do not remove a required scope to bypass consent.

Client and deployment IDs are connection identifiers, not credentials. Tokens, OAuth client secrets, passwords and private workspace IDs do not belong in this public configuration. Workspace roots/settings remain in the existing private `ANNUAL_PROVISIONER_CONFIG` property and its approved setup process.

## 5. Verify the direct flow and existing guards

The browser client uses [Google Identity Services' token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) from a user sign-in action. It keeps the short-lived token in memory only: no local/session storage, progress/links exports, service-worker cache, URL or log storage. It sends the bearer token only to the Google API call. On expiration, reconnect through the Google popup; no refresh token or client secret is stored.

The Hub client permits only `getAnnualSetupConfig` and `runAnnualSetup`. That client allowlist is not the server authorization boundary: the API deployment remains owner-only, and server chapter-account checks remain essential. Keep these existing protections:

- Active and effective Google user must be the chapter account; an account hint does not authorize a different user.
- Approved workspace identity/revision and Real/Practice purpose must match; separate roots/settings cannot be relabeled between modes.
- Files retain private chapter ownership; settings retain the exact twenty-column schema.
- One designated operator reuses the same year/workspace; script locks, saved intents and completed-run verification prevent duplicate/reset attempts.
- Closed intake, Points TESTING and inactive/noncurrent settings remain the safe setup baseline. Setup never grants a review pass, funding approval or launch authority.

First test loading the saved configuration in the intended chapter profile. Perform any create/reopen acceptance only in a named, approved isolated Practice workspace: verify returned year, purpose, seven identities and readable summary; reload the Hub and check saved results; repeat the same year to verify reuse. Retain the observed deployment/version, origin, account, result and limits privately. Local mocked tests do not substitute for this live acceptance.

If Google denies access, check account, shared Cloud project, consent/scopes, exact authorized origin and API deployment before retrying. If the connection stops after creation begins, files may already exist: preserve the same year/workspace and resume there. Do not create another year/project, open sharing, remove chapter guards or switch LIVE to force success. Launch approval remains a separate operation.
