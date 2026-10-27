// OAuth credentials stay in this closure and are never included in saved Hub data.
const GIS_URL = "https://accounts.google.com/gsi/client";
const MIN_TOKEN_LIFETIME = 360000;
const SIGN_IN_TIMEOUT = 120000;
let identityLoading;
function loadIdentity() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (!identityLoading) identityLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_URL; script.async = true;
    script.onload = () => {
      if (globalThis.google?.accounts?.oauth2) { identityLoading = null; resolve(); }
      else { script.remove(); identityLoading = null; reject(new Error("Google sign-in could not initialize. Check your connection and try again.")); }
    };
    script.onerror = () => { script.remove(); identityLoading = null; reject(new Error("Google sign-in could not load. Check your connection and try again.")); };
    document.head.append(script);
  });
  return identityLoading;
}
export function createAnnualSetupClient(config = {}, environment = {}) {
  const identity = environment.identity || (() => globalThis.google?.accounts?.oauth2);
  const fetcher = environment.fetch || globalThis.fetch.bind(globalThis);
  const now = environment.now || Date.now;
  const schedule = environment.setTimeout || globalThis.setTimeout;
  const cancelTimer = environment.clearTimeout || globalThis.clearTimeout;
  const ready = /^[\w.-]+\.apps\.googleusercontent\.com$/.test(config.clientId || "") && /^[\w-]+$/.test(config.deploymentId || "") && Array.isArray(config.scopes) && config.scopes.length > 0 && config.scopes.every(scope => typeof scope === "string" && scope.startsWith("https://www.googleapis.com/auth/"));
  let token = "", expiresAt = 0, pending = false, loadError = null;
  if (ready && !environment.identity) loadIdentity().catch(error => { loadError = error; });
  function connect() {
    if (!ready) return Promise.reject(new Error("The maintainer must finish connecting Google Annual Setup first."));
    if (pending) return Promise.reject(new Error("Google sign-in is already open."));
    if (!identity()) {
      if (loadError) {
        const error = loadError;
        loadError = null;
        loadIdentity().catch(nextError => { loadError = nextError; });
        return Promise.reject(error);
      }
      return Promise.reject(new Error("Google sign-in is loading. Wait a moment, then choose Sign in again."));
    }
    token = ""; expiresAt = 0; pending = true;
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const fail = message => {
        if (settled) return;
        settled = true; cancelTimer(timer); pending = false; reject(new Error(message));
      };
      timer = schedule(() => fail("Google sign-in did not finish within two minutes. Close any old sign-in popup, allow popups, then choose Sign in again."), SIGN_IN_TIMEOUT);
      try {
        const client = identity().initTokenClient({
          client_id: config.clientId, scope: config.scopes.join(" "), include_granted_scopes: false,
          hint: "asmeohiostate@gmail.com",
          callback: result => {
            if (settled) return;
            if (!result || typeof result !== "object" || result.error || !result.access_token) {
              const messages = {
                access_denied: "Google sign-in was cancelled or permission was declined. Choose Sign in again when ready.",
                admin_policy_enforced: "Google account policy blocked Annual Setup. Ask the account administrator to review access.",
                invalid_client: "Google sign-in is not configured correctly. Ask the maintainer to check the OAuth client.",
                unauthorized_client: "Google has not authorized this sign-in client. Ask the maintainer to check the OAuth configuration."
              };
              fail(messages[result?.error] || "Google sign-in did not return authorization. Try the chapter account again; if this repeats, ask the maintainer to check Google access."); return;
            }
            let granted;
            try { granted = identity().hasGrantedAllScopes(result, ...config.scopes); }
            catch { fail("Google could not confirm Annual Setup permissions. Choose Sign in again."); return; }
            if (!granted) { fail("Annual Setup needs all listed Google permissions. Sign in again to approve them."); return; }
            const lifetime = Number(result.expires_in) * 1000;
            if (typeof result.access_token !== "string" || !result.access_token || !Number.isFinite(lifetime) || lifetime <= MIN_TOKEN_LIFETIME) {
              fail("Google returned an unusable sign-in token. Choose Sign in again."); return;
            }
            settled = true; cancelTimer(timer); pending = false; token = result.access_token; expiresAt = now() + lifetime; resolve();
          },
          error_callback: () => fail("Google sign-in closed or was blocked. Allow the sign-in popup, then try again.")
        });
        client.requestAccessToken({prompt: "select_account"});
      } catch { fail("Google sign-in could not open. Choose Sign in to try again."); }
    });
  }
  async function call(functionName, parameters) {
    if (!["getAnnualSetupConfig", "runAnnualSetup"].includes(functionName)) throw new Error("Unsupported Annual Setup operation.");
    if (!token || !Number.isFinite(expiresAt) || expiresAt - now() < MIN_TOKEN_LIFETIME) { token = ""; throw new Error("Choose Sign in again before continuing Annual Setup."); }
    const requestToken = token;
    const abort = new AbortController();
    const timer = schedule(() => abort.abort(), 390000);
    try {
      const response = await fetcher(`https://script.googleapis.com/v1/scripts/${encodeURIComponent(config.deploymentId)}:run`, {
        method: "POST", headers: {Authorization: `Bearer ${requestToken}`, "Content-Type": "application/json"},
        body: JSON.stringify({function: functionName, parameters, devMode: false}), signal: abort.signal, credentials: "omit", redirect: "error"
      });
      if (response.status === 401) { if (token === requestToken) token = ""; throw new Error("Google sign-in expired. Choose Sign in again. If setup had started, reopen the same year to resume."); }
      if (!response.ok) throw new Error(response.status === 403 ? "Google denied access. Use the chapter account. The maintainer may need to check the shared Cloud project, permissions and API deployment." : "Annual Setup could not be reached. Reopen the same year to resume if setup had started.");
      let payload;
      try { payload = await response.json(); }
      catch (error) {
        if (error?.name === "AbortError") throw error;
        throw new Error("Google returned an unreadable setup response. Reopen the same year to resume if setup had started.");
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Google returned an unreadable setup response. Reopen the same year to resume if setup had started.");
      if (payload.error) throw new Error(payload.error.details?.[0]?.errorMessage || payload.error.message || "Annual Setup reported an error. Reopen the same year to resume.");
      if (payload.done !== true || !Object.hasOwn(payload.response || {}, "result")) throw new Error("Google did not return a completed setup result. Reopen the same year to resume; do not create a different year.");
      return payload.response.result;
    } catch (error) {
      if (error?.name === "AbortError" || error instanceof TypeError) throw new Error("The connection stopped before setup was confirmed. Files may already exist. Sign in and reopen the same year to resume.");
      throw error;
    } finally { cancelTimer(timer); }
  }
  return {ready, connect, call};
}
