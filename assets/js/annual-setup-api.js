// OAuth credentials stay in this closure and are never included in saved Hub data.
const GIS_URL = "https://accounts.google.com/gsi/client";
const MIN_TOKEN_LIFETIME = 360000;
let identityLoading;
function loadIdentity() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (!identityLoading) identityLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_URL; script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); identityLoading = null; reject(new Error("Google sign-in could not load. Check your connection and try again.")); };
    document.head.append(script);
  });
  return identityLoading;
}
export function createAnnualSetupClient(config = {}, environment = {}) {
  const identity = environment.identity || (() => globalThis.google?.accounts?.oauth2);
  const fetcher = environment.fetch || globalThis.fetch.bind(globalThis);
  const now = environment.now || Date.now;
  const ready = /^[\w.-]+\.apps\.googleusercontent\.com$/.test(config.clientId || "") && /^[\w-]+$/.test(config.deploymentId || "") && Array.isArray(config.scopes) && config.scopes.length > 0 && config.scopes.every(scope => typeof scope === "string" && scope.startsWith("https://www.googleapis.com/auth/"));
  let token = "", expiresAt = 0, pending = false, loadError = null;
  if (ready && !environment.identity) loadIdentity().catch(error => { loadError = error; });
  function connect() {
    if (!ready) return Promise.reject(new Error("The maintainer must finish connecting Google Annual Setup first."));
    if (pending) return Promise.reject(new Error("Google sign-in is already open."));
    if (!identity()) {
      if (loadError) { loadError = null; loadIdentity().catch(error => { loadError = error; }); }
      return Promise.reject(new Error("Google sign-in is loading. Wait a moment, then choose Sign in again."));
    }
    token = ""; expiresAt = 0; pending = true;
    return new Promise((resolve, reject) => {
      const fail = message => { pending = false; reject(new Error(message)); };
      try {
        const client = identity().initTokenClient({
          client_id: config.clientId, scope: config.scopes.join(" "), include_granted_scopes: false,
          hint: "asmeohiostate@gmail.com",
          callback: result => {
            pending = false;
            if (result.error || !result.access_token) { reject(new Error("Google sign-in was not completed. Choose Sign in and approve the required permissions.")); return; }
            if (!identity().hasGrantedAllScopes(result, ...config.scopes)) { reject(new Error("Annual Setup needs all listed Google permissions. Sign in again to approve them.")); return; }
            token = result.access_token; expiresAt = now() + Number(result.expires_in) * 1000; resolve();
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
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 390000);
    try {
      const response = await fetcher(`https://script.googleapis.com/v1/scripts/${encodeURIComponent(config.deploymentId)}:run`, {
        method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
        body: JSON.stringify({function: functionName, parameters, devMode: false}), signal: abort.signal, credentials: "omit", redirect: "error"
      });
      const payload = await response.json();
      if (response.status === 401) { token = ""; throw new Error("Google sign-in expired. Choose Sign in again. If setup had started, reopen the same year to resume."); }
      if (!response.ok) throw new Error(response.status === 403 ? "Google denied access. Use the chapter account. The maintainer may need to check the shared Cloud project, permissions and API deployment." : "Annual Setup could not be reached. Reopen the same year to resume if setup had started.");
      if (payload.error) throw new Error(payload.error.details?.[0]?.errorMessage || payload.error.message || "Annual Setup reported an error. Reopen the same year to resume.");
      if (payload.done !== true || !Object.hasOwn(payload.response || {}, "result")) throw new Error("Google did not return a completed setup result. Reopen the same year to resume; do not create a different year.");
      return payload.response.result;
    } catch (error) {
      if (error.name === "AbortError" || error instanceof TypeError) throw new Error("The connection stopped before setup was confirmed. Files may already exist. Sign in and reopen the same year to resume.");
      throw error;
    } finally { clearTimeout(timer); }
  }
  return {ready, connect, call};
}
