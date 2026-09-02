# Contributing

The Hub intentionally uses plain HTML, CSS, and JavaScript so a new officer can
maintain it without a build system.

Before opening a pull request:

1. Run `npm ci`, then `npm run check` (this includes the CSS lint rules).
2. Preview with `python3 -m http.server 8080`.
3. Test the access screen and dashboard at desktop width and at 390 × 844.
4. Verify light and dark themes, keyboard focus, the mobile drawer, search,
   settings preview, resource filtering, and internal navigation.
5. Confirm that no public response contains names, emails, raw attendance rows,
   credentials, tokens, or financial details.
6. Increment the query-string asset versions in `index.html` and `sw.js`, and
   increment `SHELL_CACHE` when changing cached files.

Keep organization-wide changes in the protected Hub Settings Sheet. Do not add
a client-side write secret or an Apps Script deployment that executes public
writes as its owner.
