# Task E: QA Reasoning

### 1. A release is two days away and you have one day of testing time. How do you decide what to test?

When time is compressed, I apply **Risk-Based Testing (RBT)** focused on business impact and blast radius:

1. **Code & PR Analysis**: Review git commits, PR diffs, and Jira tickets for the upcoming release with developers to pinpoint exact code modifications and shared components touched.
2. **Core Revenue & Critical Paths**: Test non-negotiable transactional journeys first—in Routag, wallet deductions, order creation, courier acceptance, and delivery completion. If money movement or order fulfillment fails, nothing else matters.
3. **Regression Smoke & High-Risk Boundaries**: Execute automated smoke and regression suites to catch unintended regressions in adjacent modules.
4. **Defect Verification**: Verify fixes for high-severity defects resolved in this sprint.
5. **Triage & Explicit Trade-offs**: Deprioritize cosmetic UI issues, edge-case form validations, and low-traffic journeys, explicitly communicating residual risks to stakeholders to make an informed go/no-go decision.

*(139 words)*

---

### 2. How would you test the wallet so a business is never debited twice for one delivery?

Preventing duplicate debits requires validating idempotency, concurrency, and ledger integrity across the payment lifecycle:

1. **Idempotency & Replay Testing**: Send duplicate requests with identical `Idempotency-Key` headers across order creation and acceptance endpoints (rapid sequential replays and network timeout retries). Assert that balance is held exactly once.
2. **Concurrency & Race Condition Testing**: Execute parallel requests simultaneously (e.g., using `Promise.all` or k6) for courier acceptance and completion against a single delivery. Verify database locks/transactions prevent race conditions and double holds.
3. **State Machine Transitions**: Test terminal states—ensure re-calling `/deliver` or `/cancel` cannot re-trigger debits or payouts.
4. **Double-Entry Reconciliation**: Audit wallet ledgers: assert that `initial_balance - sum(charges) + sum(refunds) == current_balance`, and that each delivery reference maps to at most one `hold` and one `charge` transaction.

*(134 words)*

---

### 3. How would you put your automated tests into a CI/CD pipeline?

I implement a tiered, shift-left testing strategy within GitHub Actions / GitLab CI:

1. **Pull Request Gate (Fast Feedback, < 3 mins)**: Run linters, unit tests, and API contract/smoke tests (mocked or lightweight ephemeral container). PR merge is blocked on failure.
2. **Ephemeral Staging Deployment**: On merge to `main`, spin up the service stack (database + sandbox) in isolated Docker containers with fresh seed data.
3. **Automated Test Matrix**:
   - **API Integration Tests (Newman/Supertest)**: Run the full API suite verifying status codes, calculations, and wallet ledger integrity (< 2 mins).
   - **Headless UI Tests (Playwright)**: Run critical E2E user journeys across Chromium/Firefox in parallel, capturing screenshots/traces on failure.
4. **Reporting & Quality Gates**: Publish HTML test reports and JUnit XML artifacts. Deploy to production only if 100% of critical paths pass.
5. **Post-Deploy Smoke**: Run synthetic health checks in production.

*(144 words)*
