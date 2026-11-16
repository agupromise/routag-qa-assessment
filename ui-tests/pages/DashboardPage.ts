import { Page, Locator, expect } from '@playwright/test';

export interface DeliveryDetails {
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  dropoffName: string;
  dropoffPhone: string;
  dropoffAddress: string;
  packageDescription: string;
  packageWeight: string | number;
}

export class DashboardPage {
  readonly page: Page;
  
  // Wallet section
  readonly walletBalance: Locator;
  readonly walletHeld: Locator;
  readonly topupInput: Locator;
  readonly topupSubmitButton: Locator;
  readonly topupError: Locator;

  // Delivery form inputs
  readonly pickupNameInput: Locator;
  readonly pickupPhoneInput: Locator;
  readonly pickupAddressInput: Locator;
  readonly dropoffNameInput: Locator;
  readonly dropoffPhoneInput: Locator;
  readonly dropoffAddressInput: Locator;
  readonly packageDescriptionInput: Locator;
  readonly packageWeightInput: Locator;
  readonly deliverySubmitButton: Locator;

  // Feedback alerts
  readonly deliverySuccessBanner: Locator;
  readonly deliveryErrorBanner: Locator;

  // Field error messages
  readonly pickupNameError: Locator;
  readonly pickupPhoneError: Locator;
  readonly pickupAddressError: Locator;
  readonly dropoffNameError: Locator;
  readonly dropoffPhoneError: Locator;
  readonly dropoffAddressError: Locator;
  readonly packageDescriptionError: Locator;
  readonly packageWeightError: Locator;

  // Deliveries Table
  readonly deliveryRows: Locator;

  constructor(page: Page) {
    this.page = page;

    // Wallet
    this.walletBalance = page.getByTestId('wallet-balance');
    this.walletHeld = page.getByTestId('wallet-held');
    this.topupInput = page.getByTestId('topup-amount');
    this.topupSubmitButton = page.getByTestId('topup-submit');
    this.topupError = page.getByTestId('topup-error');

    // Delivery inputs
    this.pickupNameInput = page.getByTestId('pickup-name');
    this.pickupPhoneInput = page.getByTestId('pickup-phone');
    this.pickupAddressInput = page.getByTestId('pickup-address');
    this.dropoffNameInput = page.getByTestId('dropoff-name');
    this.dropoffPhoneInput = page.getByTestId('dropoff-phone');
    this.dropoffAddressInput = page.getByTestId('dropoff-address');
    this.packageDescriptionInput = page.getByTestId('package-description');
    this.packageWeightInput = page.getByTestId('package-weight');
    this.deliverySubmitButton = page.getByTestId('delivery-submit');

    // Banners
    this.deliverySuccessBanner = page.getByTestId('delivery-success');
    this.deliveryErrorBanner = page.getByTestId('delivery-error');

    // Field Errors
    this.pickupNameError = page.getByTestId('pickup-name-error');
    this.pickupPhoneError = page.getByTestId('pickup-phone-error');
    this.pickupAddressError = page.getByTestId('pickup-address-error');
    this.dropoffNameError = page.getByTestId('dropoff-name-error');
    this.dropoffPhoneError = page.getByTestId('dropoff-phone-error');
    this.dropoffAddressError = page.getByTestId('dropoff-address-error');
    this.packageDescriptionError = page.getByTestId('package-description-error');
    this.packageWeightError = page.getByTestId('package-weight-error');

    // Table
    this.deliveryRows = page.getByTestId('delivery-row');
  }

  async fillDeliveryForm(details: DeliveryDetails) {
    await this.pickupNameInput.fill(details.pickupName);
    await this.pickupPhoneInput.fill(details.pickupPhone);
    await this.pickupAddressInput.fill(details.pickupAddress);
    await this.dropoffNameInput.fill(details.dropoffName);
    await this.dropoffPhoneInput.fill(details.dropoffPhone);
    await this.dropoffAddressInput.fill(details.dropoffAddress);
    await this.packageDescriptionInput.fill(details.packageDescription);
    await this.packageWeightInput.fill(String(details.packageWeight));
  }

  async submitDelivery() {
    await this.deliverySubmitButton.click();
  }

  async assertDeliverySuccessMessage(expectedSnippet?: string) {
    await expect(this.deliverySuccessBanner).toBeVisible();
    if (expectedSnippet) {
      await expect(this.deliverySuccessBanner).toContainText(expectedSnippet);
    }
  }

  async assertMissingFieldsValidationErrors() {
    await expect(this.pickupNameError).toHaveText('Pickup name is required');
    await expect(this.pickupPhoneError).toHaveText('Pickup phone is required');
    await expect(this.pickupAddressError).toHaveText('Pickup address is required');
    await expect(this.dropoffNameError).toHaveText('Drop-off name is required');
    await expect(this.dropoffPhoneError).toHaveText('Drop-off phone is required');
    await expect(this.dropoffAddressError).toHaveText('Drop-off address is required');
    await expect(this.packageDescriptionError).toHaveText('Package description is required');
    await expect(this.packageWeightError).toHaveText('Weight is required');
  }

  async getDeliveryRowById(deliveryId: string): Promise<Locator> {
    return this.page.locator(`tr[data-testid="delivery-row"][data-id="${deliveryId}"]`);
  }

  async assertDeliveryStatus(deliveryId: string, expectedStatus: string) {
    const row = await this.getDeliveryRowById(deliveryId);
    await expect(row).toBeVisible();
    const statusBadge = row.getByTestId('delivery-status');
    await expect(statusBadge).toHaveText(expectedStatus);
  }
}
