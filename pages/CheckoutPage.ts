import { expect, Page } from '@playwright/test';
import BasePage from './BasePage';

export default class CheckoutPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    async fillCheckoutForm(
        firstname: string,
        lastname: string,
        company: string,
        streetaddress: string,
        apaddress: string,
        towncity: string,
        postcode: string,
        phone: string,
        email: string,
    ) {
        const fields = {
            '#billing_first_name': firstname,
            '#billing_last_name': lastname,
            '#billing_company': company,
            '#billing_address_1': streetaddress,
            '#billing_address_2': apaddress,
            '#billing_city': towncity,
            '#billing_postcode': postcode,
            '#billing_phone': phone,
            '#billing_email': email,
        };

        await this.fillForm(fields);
    }

    async placeOrder() {
        // Click place order and wait for navigation or page change to reduce flakiness
        await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {}),
            this.clickElement('#place_order'),
        ]);
    }

    async fillCardDetails(cardNumber: string, expiryDate: string, cvc: string) {
        // Look for common Stripe iframe attributes (name, src, title) and wait longer if needed
        const iframeSelector = 'iframe[name*="__privateStripeFrame"], iframe[src*="stripe"], iframe[title*="Stripe"]';
        const iframeLocator = this.page.locator(iframeSelector).first();
        await iframeLocator.waitFor({ state: 'visible', timeout: 90000 });

        // Switch to the iframe and try multiple common placeholders for Stripe elements
        const cardFrame = await iframeLocator.contentFrame();
        if (!cardFrame) throw new Error('Unable to access card iframe content frame');

        // Try primary placeholders, fall back to common alternatives
        const attempts = [
            async () => {
                await cardFrame.getByPlaceholder('1234 1234 1234 1234').fill(cardNumber);
                await cardFrame.getByPlaceholder('MM / YY').fill(expiryDate);
                await cardFrame.getByPlaceholder('CVC').fill(cvc);
            },
            async () => {
                await cardFrame.locator('input[name="cardnumber"]').fill(cardNumber);
                await cardFrame.locator('input[name="exp-date"]').fill(expiryDate);
                await cardFrame.locator('input[name="cvc"]').fill(cvc);
            },
        ];

        let lastError: any = null;
        for (const attempt of attempts) {
            try {
                // each attempt may throw if selector not found
                // give small timeout buffer for actions
                await attempt();
                lastError = null;
                break;
            } catch (e) {
                lastError = e;
            }
        }

        if (lastError) {
            throw new Error('Failed to fill card details in Stripe iframe: ' + lastError);
        }
    }

    async expectOrderReceived() {
        await expect(this.page.getByRole('heading', { name: 'Order received' })).toBeVisible();
        await expect(this.page.getByText('Thank you. Your order has been received.')).toBeVisible();
    }

    async expectCardError(message: string) {
        // Wait for the iframe to be visible
        const iframeLocator = this.page.locator('iframe[name*="__privateStripeFrame"]').first();
        await iframeLocator.waitFor({ state: 'visible', timeout: 50000 });

        // Switch to the iframe and verify the error message
        const cardFrame = await iframeLocator.contentFrame();
        await expect(cardFrame?.getByText(message)).toBeVisible();
    }
}