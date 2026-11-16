# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: courier-acceptance-bonus.spec.ts >> Bonus Scenario: End-to-End Status Update upon Courier API Acceptance >> UI reflects assigned status and held escrow balance after courier accepts via API
- Location: tests\courier-acceptance-bonus.spec.ts:9:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('wallet-held')
Expected substring: "1,700.00"
Received string:    "₦3,400.00"
Timeout: 10000ms

Call log:
  - Expect "toContainText" getByTestId('wallet-held') with timeout 10000ms
  - waiting for getByTestId('wallet-held')
    23 × locator resolved to <span id="held" data-testid="wallet-held">₦3,400.00</span>
       - unexpected value "₦3,400.00"

```

```yaml
- text: ₦3,400.00
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { LoginPage } from '../pages/LoginPage';
  3  | import { DashboardPage } from '../pages/DashboardPage';
  4  | 
  5  | test.describe('Bonus Scenario: End-to-End Status Update upon Courier API Acceptance', () => {
  6  |   let loginPage: LoginPage;
  7  |   let dashboardPage: DashboardPage;
  8  | 
  9  |   test('UI reflects assigned status and held escrow balance after courier accepts via API', async ({ page, request }) => {
  10 |     loginPage = new LoginPage(page);
  11 |     dashboardPage = new DashboardPage(page);
  12 | 
  13 |     // 1. Log in as Business on Web Dashboard
  14 |     await loginPage.goto();
  15 |     const bizEmail = process.env.BUSINESS_EMAIL || 'business1@sandbox.test';
  16 |     const bizPassword = process.env.BUSINESS_PASSWORD || 'Password123!';
  17 |     await loginPage.login(bizEmail, bizPassword);
  18 |     await loginPage.assertLoggedIn();
  19 | 
  20 |     // 2. Create and publish delivery on UI
  21 |     const weight = 1.0;
  22 |     const expectedFee = 1500 + 200 * weight; // 1,700 NGN
  23 |     await dashboardPage.fillDeliveryForm({
  24 |       pickupName: 'Ade Logistics Hub',
  25 |       pickupPhone: '08012345678',
  26 |       pickupAddress: '15 Broad Street, Lagos Island',
  27 |       dropoffName: 'Folake Ademola',
  28 |       dropoffPhone: '08098765432',
  29 |       dropoffAddress: '8 Allen Avenue, Ikeja, Lagos',
  30 |       packageDescription: 'Document Pack',
  31 |       packageWeight: weight,
  32 |     });
  33 |     await dashboardPage.submitDelivery();
  34 |     await dashboardPage.assertDeliverySuccessMessage('created. Fee ₦1,700.00');
  35 | 
  36 |     // Extract delivery ID
  37 |     const bannerText = await dashboardPage.deliverySuccessBanner.textContent();
  38 |     const idMatch = bannerText?.match(/Delivery\s+(del_[a-f0-9]+)\s+created/);
  39 |     expect(idMatch).toBeTruthy();
  40 |     const deliveryId = idMatch![1];
  41 | 
  42 |     // Confirm initial published status on table is 'pending'
  43 |     const deliveryRow = await dashboardPage.getDeliveryRowById(deliveryId);
  44 |     await expect(deliveryRow.getByTestId('delivery-status')).toHaveText('pending');
  45 | 
  46 |     // 3. Drive Courier acceptance via API using Playwright APIRequestContext
  47 |     const courierEmail = process.env.COURIER_EMAIL || 'courier1@sandbox.test';
  48 |     const courierPassword = process.env.COURIER_PASSWORD || 'Password123!';
  49 | 
  50 |     const loginRes = await request.post('/api/v1/auth/login', {
  51 |       data: { email: courierEmail, password: courierPassword },
  52 |     });
  53 |     expect(loginRes.status()).toBe(200);
  54 |     const courierAuth = await loginRes.json();
  55 |     const courierToken = courierAuth.token;
  56 | 
  57 |     // Courier accepts the delivery
  58 |     const acceptRes = await request.post(`/api/v1/courier/deliveries/${deliveryId}/accept`, {
  59 |       headers: { Authorization: `Bearer ${courierToken}` },
  60 |     });
  61 |     expect(acceptRes.status()).toBe(200);
  62 |     const acceptData = await acceptRes.json();
  63 |     expect(acceptData.status).toBe('assigned');
  64 | 
  65 |     // 4. Verify UI reflects the change (using Playwright auto-waiting assertions without fixed sleep)
  66 |     // The dashboard auto-refreshes every 5s; Playwright expects will poll up to timeout
  67 |     await expect(deliveryRow.getByTestId('delivery-status')).toHaveText('assigned', { timeout: 10000 });
  68 | 
  69 |     // 5. Verify the wallet held balance on UI reflects the held delivery fee
> 70 |     await expect(dashboardPage.walletHeld).toContainText('1,700.00', { timeout: 10000 });
     |                                            ^ Error: expect(locator).toContainText(expected) failed
  71 |   });
  72 | });
  73 | 
```