# Routag QA Assessment - Bug Reports

**Target Application:** Routag Delivery & Wallet Sandbox v1.0.0  
**Environment:** Local Sandbox (`http://localhost:4000`), Node.js v24.12.0 / Express, Windows 11  
**Tester:** QA Engineer (Assessment Candidate)  
**Date:** November 2026  

---

## Bug Report 1: Duplicate Courier Accept Requests Cause Multiple Wallet Holds (Double-Hold Defect)

### Title
Duplicate `POST /api/v1/courier/deliveries/:id/accept` requests repeatedly deduct delivery fee from business wallet and inflate held escrow balance.

### Environment
- **Application:** Routag QA Sandbox v1.0.0
- **Base URL:** `http://localhost:4000`
- **Component:** Courier API & Wallet Escrow Service (`server.js` lines 253–268)
- **Client Tools:** Node.js HTTP / Playwright / Postman

### Severity & Priority
- **Severity:** Critical
- **Priority:** High
- **Justification:** Critical severity and High priority because duplicate network requests or retries silently deduct real funds multiple times from a customer's wallet without authorization.

### Steps to Reproduce
1. Reset sandbox database to clean seed state via `POST /api/v1/reset`.
2. Authenticate as Business 1 (`business1@sandbox.test` / `Password123!`). Check wallet balance: `NGN 50,000.00`, Held: `NGN 0.00`.
3. Create a quote for a 2.0 kg package: `POST /api/v1/deliveries/quote` (Fee = `1500 + 200 * 2 = NGN 1,900.00`).
4. Create delivery (`POST /api/v1/deliveries`) and publish it (`POST /api/v1/deliveries/:id/publish`). Status becomes `pending`.
5. Authenticate as Courier 1 (`courier1@sandbox.test` / `Password123!`).
6. Send the initial acceptance request:  
   `POST /api/v1/courier/deliveries/:id/accept`  
   *Observed Wallet:* Balance = `NGN 48,100`, Held = `NGN 1,900`.
7. Re-send the exact same acceptance request with Courier 1 credentials (simulating a mobile network retry, app reconnect, or rapid double-tap):  
   `POST /api/v1/courier/deliveries/:id/accept`
8. Query business wallet via `GET /api/v1/wallet` and transactions via `GET /api/v1/transactions`.

### Expected Result
The acceptance endpoint must be idempotent. If a delivery has already been assigned to the requesting courier, the API should return `200 OK` with current delivery details without charging the business wallet again, or return `409 Conflict` (`Delivery is already assigned`). Business available balance must remain `NGN 48,100` and held must remain `NGN 1,900`.

### Actual Result
The API returns `HTTP 200 OK` and executes the debit/hold block again:
```javascript
// server.js lines 256-263
const alreadyMine = d.status === 'assigned' && d.courier_id === req.user.id;
if (d.status !== 'pending' && !alreadyMine) ... // passes because alreadyMine is true!
const amt = kobo(d.fee);
db.wallets[d.business_id] -= amt; // Deducts 1900 AGAIN
db.held[d.business_id] += amt;    // Adds 1900 AGAIN
tx(d.business_id, 'hold', amt, d.id);
```
- Available balance drops from `NGN 48,100` to `NGN 46,200`.
- Held escrow increases from `NGN 1,900` to `NGN 3,800`.
- Two duplicate `hold` transactions are registered in `db.transactions`.
- When delivery completes, only one `amt` (`NGN 1,900`) is released from `db.held`, leaving `NGN 1,900` permanently trapped in escrow.

### Evidence
**1st Accept Call Response:**
```json
HTTP/1.1 200 OK
{
  "id": "del_8f1876f8a40e",
  "business_id": "biz_1",
  "status": "assigned",
  "fee": 1900,
  "currency": "NGN",
  "courier_id": "cou_1"
}
```
*Business Wallet after 1st Accept:* `{"balance": 48100, "held": 1900, "currency": "NGN"}`

**2nd Accept Call Response (Duplicate):**
```json
HTTP/1.1 200 OK
{
  "id": "del_8f1876f8a40e",
  "business_id": "biz_1",
  "status": "assigned",
  "fee": 1900,
  "currency": "NGN",
  "courier_id": "cou_1"
}
```
*Business Wallet after 2nd Accept (Defect Manifested):*
```json
{
  "balance": 46200,
  "held": 3800,
  "currency": "NGN"
}
```

---

## Bug Report 2: Repeated Invocations of Courier Deliver Endpoint Generates Duplicate Payouts (Infinite Payout Defect)

### Title
Invoking `POST /api/v1/courier/deliveries/:id/deliver` on an already delivered parcel repeatedly credits courier wallet with 80% fee payout without restriction.

### Environment
- **Application:** Routag QA Sandbox v1.0.0
- **Base URL:** `http://localhost:4000`
- **Component:** Delivery Settlement & Payout Engine (`server.js` lines 280–299)
- **Client Tools:** Node.js HTTP / Playwright / Postman

### Severity & Priority
- **Severity:** Critical
- **Priority:** High
- **Justification:** Critical severity and High priority because any malicious or bugged courier client can endlessly siphon funds out of the company treasury by calling deliver repeatedly.

### Steps to Reproduce
1. Complete standard journey up to pickup for delivery `del_xxx` (fee = `NGN 1,900`, courier payout = 80% = `NGN 1,520`).
2. Retrieve valid 4-digit security code via `GET /api/v1/deliveries/:id/code`.
3. Courier completes delivery:  
   `POST /api/v1/courier/deliveries/:id/deliver` with body `{"code": "5428"}`.  
   *Courier Wallet:* `balance: 1,520`, 1 transaction of type `payout`.
4. Courier sends another `POST /api/v1/courier/deliveries/:id/deliver` request with the same code.
5. Query `GET /api/v1/transactions` and `GET /api/v1/wallet` for Courier.

### Expected Result
Delivery is a terminal state. Once marked `delivered`, subsequent delivery requests must be rejected with `HTTP 409 Conflict` (`Delivery is already completed`), or return idempotent `200 OK` without creating duplicate financial transactions or wallet balance increments.

### Actual Result
Line 284 explicitly allows `delivered` status:
```javascript
if (!['assigned', 'picked_up', 'delivered'].includes(d.status))
  return err(res, 409, 'invalid_status', ...);
```
While business debit is guarded by `if (d.status !== 'delivered')`, the courier payout is executed unconditionally:
```javascript
const payout = Math.round(amt * 0.8);
db.wallets[req.user.id] += payout;
tx(req.user.id, 'payout', payout, d.id);
```
Every invocation credits `NGN 1,520` into the courier's wallet and records another `payout` transaction in the ledger. Additionally, lines 296 and 297 trigger duplicate `delivery.delivered` webhook dispatches on every call.

### Evidence
**Courier Transactions Ledger after 2 Invocations:**
```json
[
  {
    "id": "txn_8a92f012de91",
    "owner": "cou_1",
    "type": "payout",
    "amount": 1520,
    "reference": "del_8f1876f8a40e",
    "created_at": "2026-11-15T21:10:46.809Z"
  },
  {
    "id": "txn_55a0095e3e23",
    "owner": "cou_1",
    "type": "payout",
    "amount": 1520,
    "reference": "del_8f1876f8a40e",
    "created_at": "2026-11-15T21:10:46.803Z"
  }
]
```
*Courier Wallet Balance:* Increased to `NGN 3,040.00` (doubled payout for a single delivery).

---

## Supplementary Defect Discoveries (Value-Add)

1. **BUG-03 (Major / Medium): Business Cancellation of Assigned Delivery Omits Refund Transaction Record**
   - **Endpoint:** `POST /api/v1/deliveries/:id/cancel`
   - **Details:** When a business cancels an assigned order, line 245 calls `release(d, false)`. This restores the wallet balance but skips `tx(bid, 'refund', amt, d.id)`. The business ledger reflects a `hold` without any corresponding `refund` entry, breaking accounting auditability.
2. **BUG-04 (Major / Medium): Negative Wallet Top-Up Accepted by API**
   - **Endpoint:** `POST /api/v1/wallet/top-up`
   - **Details:** The API validates `amount <= 1000000` but fails to check `amount > 0`. Submitting `{"amount": -500}` succeeds with `HTTP 201 Created` and reduces wallet balance.
3. **BUG-05 (Minor / Low): Boundary Flaw in Balance Check (`<=` instead of `<`)**
   - **Endpoint:** `POST /api/v1/courier/deliveries/:id/accept`
   - **Details:** Line 260 checks `if (db.wallets[d.business_id] <= amt)`. If a business has an exact balance matching the delivery fee (e.g. NGN 1,900), the request is incorrectly rejected with `402 insufficient_funds`.
