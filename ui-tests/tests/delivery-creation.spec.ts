import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage, DeliveryDetails } from '../pages/DashboardPage';

test.describe('Scenario 1: Delivery Creation Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    const email = process.env.BUSINESS_EMAIL || 'business1@sandbox.test';
    const password = process.env.BUSINESS_PASSWORD || 'Password123!';
    await loginPage.login(email, password);
    await loginPage.assertLoggedIn();
  });

  test('Business successfully creates and publishes a delivery', async ({ page }) => {
    const validDelivery: DeliveryDetails = {
      pickupName: 'Ade Stores Lekki',
      pickupPhone: '08012345678',
      pickupAddress: 'Block 12 Admiralty Way, Lekki Phase 1, Lagos',
      dropoffName: 'Babajide Fashola',
      dropoffPhone: '08098765432',
      dropoffAddress: 'Plot 4, Commercial Avenue, Yaba, Lagos',
      packageDescription: 'Office Electronics and Supplies',
      packageWeight: '2.5',
    };

    // Calculate expected fee: 1500 + 200 * 2.5 = 2000 NGN
    const expectedFeePattern = /2,000\.00/;

    // Fill form and submit
    await dashboardPage.fillDeliveryForm(validDelivery);
    await dashboardPage.submitDelivery();

    // Verify success banner appears with correct confirmation
    await dashboardPage.assertDeliverySuccessMessage('created. Fee ₦2,000.00');

    // Extract created delivery ID from the success message
    const bannerText = await dashboardPage.deliverySuccessBanner.textContent();
    const idMatch = bannerText?.match(/Delivery\s+(del_[a-f0-9]+)\s+created/);
    expect(idMatch).toBeTruthy();
    const deliveryId = idMatch![1];

    // Verify newly created delivery row is visible in the deliveries table
    const row = await dashboardPage.getDeliveryRowById(deliveryId);
    await expect(row).toBeVisible();

    // Verify row contents: dropoff address, formatted fee, and published status 'pending'
    await expect(row).toContainText('Plot 4, Commercial Avenue, Yaba, Lagos');
    await expect(row).toContainText('₦2,000.00');
    await expect(row.getByTestId('delivery-status')).toHaveText('pending');
  });
});
