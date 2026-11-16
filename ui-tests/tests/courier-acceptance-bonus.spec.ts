import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Bonus Scenario: End-to-End Status Update upon Courier API Acceptance', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test('UI reflects assigned status and held escrow balance after courier accepts via API', async ({ page, request }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // 1. Log in as Business on Web Dashboard
    await loginPage.goto();
    const bizEmail = process.env.BUSINESS_EMAIL || 'business1@sandbox.test';
    const bizPassword = process.env.BUSINESS_PASSWORD || 'Password123!';
    await loginPage.login(bizEmail, bizPassword);
    await loginPage.assertLoggedIn();

    // 2. Create and publish delivery on UI
    const weight = 1.0;
    const expectedFee = 1500 + 200 * weight; // 1,700 NGN
    await dashboardPage.fillDeliveryForm({
      pickupName: 'Ade Logistics Hub',
      pickupPhone: '08012345678',
      pickupAddress: '15 Broad Street, Lagos Island',
      dropoffName: 'Folake Ademola',
      dropoffPhone: '08098765432',
      dropoffAddress: '8 Allen Avenue, Ikeja, Lagos',
      packageDescription: 'Document Pack',
      packageWeight: weight,
    });
    await dashboardPage.submitDelivery();
    await dashboardPage.assertDeliverySuccessMessage('created. Fee ₦1,700.00');

    // Extract delivery ID
    const bannerText = await dashboardPage.deliverySuccessBanner.textContent();
    const idMatch = bannerText?.match(/Delivery\s+(del_[a-f0-9]+)\s+created/);
    expect(idMatch).toBeTruthy();
    const deliveryId = idMatch![1];

    // Confirm initial published status on table is 'pending'
    const deliveryRow = await dashboardPage.getDeliveryRowById(deliveryId);
    await expect(deliveryRow.getByTestId('delivery-status')).toHaveText('pending');

    // 3. Drive Courier acceptance via API using Playwright APIRequestContext
    const courierEmail = process.env.COURIER_EMAIL || 'courier1@sandbox.test';
    const courierPassword = process.env.COURIER_PASSWORD || 'Password123!';

    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: courierEmail, password: courierPassword },
    });
    expect(loginRes.status()).toBe(200);
    const courierAuth = await loginRes.json();
    const courierToken = courierAuth.token;

    // Courier accepts the delivery
    const acceptRes = await request.post(`/api/v1/courier/deliveries/${deliveryId}/accept`, {
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    expect(acceptRes.status()).toBe(200);
    const acceptData = await acceptRes.json();
    expect(acceptData.status).toBe('assigned');

    // 4. Verify UI reflects the change (using Playwright auto-waiting assertions without fixed sleep)
    // The dashboard auto-refreshes every 5s; Playwright expects will poll up to timeout
    await expect(deliveryRow.getByTestId('delivery-status')).toHaveText('assigned', { timeout: 10000 });

    // 5. Verify the wallet held balance on UI reflects the held delivery fee
    await expect(dashboardPage.walletHeld).toContainText('1,700.00', { timeout: 10000 });
  });
});
