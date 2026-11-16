# Vastrack QA Engineer Assessment - Routag Test Suite

Comprehensive quality assurance deliverable for the **Routag** logistics and wallet platform, submitted for the Vastrack QA Engineer (Mid-Level) assessment.

---

## Deliverables Summary

| Deliverable | File / Directory | Description |
|---|---|---|
| **Task A: Test Design & Manual Testing** | [`test-cases.xlsx`](./test-cases.xlsx) | 25 prioritized test cases covering end-to-end journey, boundary limits, escrow mechanics, idempotency, and security. 12 cases executed against the live sandbox with pass/fail and evidence. |
| **Task B: API Testing** | [`postman/`](./postman/) | Postman Collection v2.1.0 (`Routag_QA_Assessment.postman_collection.json`) and Environment (`Routag_Sandbox.postman_environment.json`) covering 11 sequential requests with automated assertions. |
| **Task C: UI Automation** | [`ui-tests/`](./ui-tests/) | Playwright + TypeScript test suite implementing Page Object Model (POM), data-testid locators, config from environment variables, no fixed sleeps, covering Scenario 1, Scenario 2, and the Bonus scenario. |
| **Task D: Bug Reporting** | [`bug-reports.md`](./bug-reports.md) | In-depth bug reports on two critical real financial vulnerabilities discovered in the sandbox code, plus supplementary findings. |
| **Task E: QA Reasoning** | [`answers.md`](./answers.md) | Concise answers (strictly ≤ 150 words each) on release testing prioritization, double-debit wallet testing, and CI/CD test architecture. |

---

## ⚡ Quickstart: Run All Tests in Under 5 Minutes

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### Step 1: Start the Routag Sandbox
In a terminal window:
```bash
# Clone or navigate to the sandbox directory
cd path/to/QA-Assessment-Nov-2026/sandbox

# Install dependencies and start server
npm install
npm start
```
The sandbox will be listening at `http://localhost:4000`.

*(Optional: Reset data to seed state at any time by sending `curl -X POST http://localhost:4000/api/v1/reset`)*

---

### Step 2: Run the Playwright UI Automation Suite (Task C)
In a second terminal:
```bash
# Navigate to the UI automation directory
cd ui-tests

# Install dependencies
npm install

# Install Playwright browser binary
npx playwright install chromium

# Run all test scenarios (headless)
npm test
```

To run with visible browser UI:
```bash
npm run test:headed
```

To view the generated HTML report:
```bash
npm run report
```

---

### Step 3: Run the Postman API Collection (Task B)

#### Option 1: Via Postman App
1. Open the Postman Desktop App.
2. Click **Import** and select:
   - `postman/Routag_QA_Assessment.postman_collection.json`
   - `postman/Routag_Sandbox.postman_environment.json`
3. Select the **Routag QA Sandbox Environment** from the environment dropdown.
4. Open the Collection Runner and click **Run Routag Delivery & Wallet API Test Suite**.

#### Option 2: Via Newman CLI
```bash
npx newman run postman/Routag_QA_Assessment.postman_collection.json -e postman/Routag_Sandbox.postman_environment.json
```

---

## Key Assumptions Made

1. **Escrow Hold vs Settlement Timing:** Assumed based on Lagos courier business flows that delivery fees should be held upon courier acceptance (`assigned`) and settled/debited only upon verified handover via security code (`delivered`).
2. **Terminal State Immutability:** Assumed that once a delivery reaches `delivered` or `cancelled`, all mutating transitions must be blocked. Multiple completion calls must be rejected with `HTTP 409 Conflict` to prevent repeated payouts.
3. **Idempotency Scope:** Assumed financial transactions (holds, charges, payouts, refunds) require strict idempotency keys so network retries do not trigger duplicate debits.
4. **Phone Number Standards:** Assumed Nigerian phone numbers follow E.164 (`+234...`) or national 11-digit format starting with `070`, `080`, `081`, `090`, or `091`.
5. **Couriers Lack Dashboard Access:** Confirmed from the brief and code that couriers operate solely via API/mobile app, while businesses interact with both the dashboard and API.

---

## What I Would Do With More Time

1. **Comprehensive Concurrency / Stress Testing:**
   - Author a **k6** or **Artillery** load test simulating 50 concurrent couriers attempting to accept the same high-value delivery simultaneously, proving that atomic database locking or transaction isolation eliminates race conditions.
2. **Contract & Schema Testing:**
   - Integrate **Pact** or automated OpenAPI validation against `openapi.json` to automatically detect schema drift between backend releases and frontend expectations.
3. **Webhook Mocking & E2E Validation:**
   - Stand up a local mock webhook server (e.g. WireMock or MSW) within the Playwright / Newman test cycle to assert that asynchronous webhook payloads arrive with correct signatures and retry policies.
4. **Cross-Browser & Visual Regression Testing:**
   - Expand the Playwright configuration to run matrix tests across Firefox, WebKit, and mobile viewport emulation (Pixel 7 / iPhone 14), with Percy or Playwright screenshot diffing for visual regression detection.
5. **Full CI/CD Pipeline Configuration:**
   - Provide a complete `.github/workflows/qa-ci.yml` pipeline file demonstrating automated execution of the sandbox, database seeding, API tests, and UI tests with artifact archiving on every PR.

---

## AI Disclosure Statement

In accordance with the assessment rules, AI assistance was utilized as a pair-programming and formatting tool during this assessment. 

**What AI assisted with:**
- Assisting with boilerplate script generation for Excel formatting (`exceljs`) and JSON structures for Postman.
- Providing initial drafts for test case wording and CI/CD reasoning.

**What I analyzed and verified myself:**
- **Codebase Architecture & Vulnerability Hunting:** Personally investigated `server.js` and `app.js`, isolating the exact root causes of the duplicate courier acceptance double-hold bug (`server.js:256`), infinite payout bug (`server.js:284, 293`), and missing refund audit trail.
- **Manual Verification & Evidence Capture:** Executed test probes against the live running server at `http://localhost:4000`, recording real HTTP headers, status codes, and database state transitions.
- **UI Test Design & POM Implementation:** Validated all element locators (`data-testid`), designed clean POM classes, ensured zero fixed sleeps, and verified that all 5 Playwright tests pass reliably against Chromium.
- **Reasoning & Defense:** I fully understand and stand behind every single test case, architectural decision, and bug report in this submission, and am prepared to explain and defend every detail during the follow-up technical interview.
