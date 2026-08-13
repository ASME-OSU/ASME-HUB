# Security model

The ASME Officer Hub is hosted on public GitHub Pages. Its access-phrase screen
reduces accidental discovery, but it is not authentication and cannot protect
data or secrets delivered to a browser.

## Required boundaries

- Never reuse the Hub phrase for another account or system.
- Never place credentials, API keys, private tokens, member rows, raw form
  responses, account numbers, transactions, receipts, or other sensitive data
  in this repository or a public feed.
- SharePoint, Google, banking, and fundraising destinations must enforce their
  own account permissions. A link in the Hub does not grant access.
- The Hub settings writer may update only non-sensitive links, labels, and
  aggregate-data configuration. Its URL and verification value are visible in
  the public client, so it must never be treated as secure authorization.
- Public dashboard feeds must return aggregate values only. The Hub's
  leaderboard query intentionally excludes the member-name column.

If member-level data must appear inside the Hub, migrate it to a server-backed
host with Microsoft Entra ID or Google authentication and authorization.

Report suspected exposure privately to the ASME OSU technology lead and rotate
affected credentials before discussing the incident in a public issue.
