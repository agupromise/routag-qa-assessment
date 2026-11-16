import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Scenario 2: Delivery Form Validation', () => {
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

  test('Validation errors appear when required fields are missing on empty submit', async () => {
    // Attempt submission with completely blank inputs
    await dashboardPage.submitDelivery();

    // Verify all 8 individual required field inline error messages appear
    await dashboardPage.assertMissingFieldsValidationErrors();

    // Verify success banner did not appear
    await expect(dashboardPage.deliverySuccessBanner).not.toBeVisible();
  });

  test('Validation error clears when required field is populated', async () => {
    // Trigger validation errors first
    await dashboardPage.submitDelivery();
    await expect(dashboardPage.pickupNameError).toHaveText('Pickup name is required');

    // Fill pickup name and trigger submission again
    await dashboardPage.pickupNameInput.fill('Ade Mart');
    await dashboardPage.submitDelivery();

    // Pickup name error should be cleared while remaining fields still show errors
    await expect(dashboardPage.pickupNameError).toHaveText('');
    await expect(dashboardPage.pickupPhoneError).toHaveText('Pickup phone is required');
  });

  test('Backend validation error surfaces when invalid phone format is provided', async () => {
    await dashboardPage.fillDeliveryForm({
      pickupName: 'Ade Stores',
      pickupPhone: '12345', // Invalid Nigerian phone format
      pickupAddress: '12 Marina Road, Lagos Island',
      dropoffName: 'Chioma',
      dropoffPhone: '08098765432',
      dropoffAddress: '45 Admiralty Way, Lekki',
      packageDescription: 'Books',
      packageWeight: '1.0',
    });

    await dashboardPage.submitDelivery();

    // The backend error should be caught and rendered in the main delivery error banner
    await expect(dashboardPage.deliveryErrorBanner).toBeVisible();
    await expect(dashboardPage.deliveryErrorBanner).toContainText('pickup.phone must be a valid Nigerian number');
  });
});
