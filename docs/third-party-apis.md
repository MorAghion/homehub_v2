# Third-Party API Research — Israeli Restaurant & Activity Services

Research date: 2026-03-29

## Summary

| Service  | Public API | Auth Method | Integration Path |
|----------|-----------|-------------|-----------------|
| BuyMe    | ❌ None    | N/A         | Deep link / scrape |
| Ontopo   | ⚠️ Partial | OAuth/Token | Web scrape or unofficial |
| Tabit    | ✅ Partner  | API Key     | Partner program |

---

## BuyMe (buyme.co.il)

**What it is:** Israeli gift card / experience voucher marketplace.

**Public API:** None publicly documented.

**Integration options:**
- **Deep links:** `https://buyme.co.il/gift/{id}` — can be opened in browser
- **Web scraping:** HTML is server-rendered; gifts include price, vendor, expiry date
- **Recommended approach:** Store voucher URLs manually, display as webview cards. No automated sync.

**Data we can extract manually:**
- Voucher name, vendor, value, expiry date, redemption URL

---

## Ontopo (ontopo.com)

**What it is:** Restaurant reservation platform used by many Israeli restaurants.

**Public API:** No official public API. Ontopo provides an embeddable widget for restaurants.

**Widget endpoint (observed):**
- `https://ontopo.com/api/v1/availability` — POST with `{ restaurantId, date, partySize }`
- `https://ontopo.com/api/v1/timeslots` — GET

**Auth:** Session cookie or partner token (not public). Requests without a valid session return 401.

**Recommended approach:**
- Display reservation links: `https://ontopo.com/he/il/site/{restaurantId}`
- Manual entry of reservation details after booking
- Future: request partner API access from Ontopo

---

## Tabit (tabit.co.il)

**What it is:** Restaurant POS and reservation management system. Powers many Israeli restaurant chains.

**Public API:** ✅ Yes — Tabit has a documented partner API.

**Base URL:** `https://api.tabit.cloud/v2`

**Auth:** API key header `x-api-key: {key}` — requires partner registration at `partners.tabit.cloud`

**Key endpoints:**
- `GET /organizations` — list of restaurant organizations
- `GET /organizations/{id}/availability` — available time slots
- `POST /reservations` — create a reservation
- `GET /reservations/{id}` — get reservation details
- `DELETE /reservations/{id}` — cancel reservation

**Rate limits:** 60 req/min per key (from docs)

**Data format:** JSON, dates in ISO 8601

**Recommended approach:**
- Register for Tabit partner API key
- Integrate reservation creation/viewing directly in HomeHub Reservations Hub
- Can sync existing reservations by storing `reservationId`

---

## Next Steps

1. **BuyMe:** No automation possible — support manual voucher entry with URL
2. **Ontopo:** Manual reservation entry for now; revisit if Ontopo opens partner program
3. **Tabit:** Register for partner API key at `partners.tabit.cloud` → enables full reservation integration

---

## Other Services to Consider

- **Rest (rest.co.il):** Restaurant reviews + some booking; no public API
- **10bis (10bis.co.il):** Corporate food delivery; closed API (employer integrations only)
- **Pango:** Parking; has mobile SDK but no REST API
