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
        // Click place order and wait for navigation or order confirmation to reduce flakiness
        await this.clickElement('#place_order');

        // Wait for either navigation or for order confirmation elements to appear
        const waitForNav = this.page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {});
        const waitForHeading = this.page.getByRole('heading', { name: 'Order received' }).waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
        const waitForText = this.page.getByText('Thank you. Your order has been received.').waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});

        // Wait for any of these to complete
        await Promise.race([waitForNav, waitForHeading, waitForText]);
    }

    async fillCardDetails(cardNumber: string, expiryDate: string, cvc: string) {
        // More robust approach: scan all frames for Stripe card inputs and fill them.
        const timeout = 90000;
        const start = Date.now();
        let cardFrame: any = null;

        while (Date.now() - start < timeout) {
            for (const f of this.page.frames()) {
                try {
                    // look for common placeholders/selectors inside the frame
                    const hasPlaceholder = (await f.locator('input[placeholder="1234 1234 1234 1234"]').count()) > 0;
                    const hasNameInputs = (await f.locator('input[name="cardnumber"]').count()) > 0;
                    if (hasPlaceholder || hasNameInputs) {
                        cardFrame = f;
                        break;
                    }
                } catch (e) {
                    // ignore cross-origin/frame access issues until a correct one is found
                }
            }
            if (cardFrame) break;
            await this.page.waitForTimeout(500);
        }

        if (!cardFrame) {
            throw new Error('Unable to find Stripe card frame within timeout');
        }

        // Try filling using common selectors
        const attempts = [
            async () => {
                await cardFrame.locator('input[placeholder="1234 1234 1234 1234"]').fill(cardNumber);
                await cardFrame.locator('input[placeholder="MM / YY"]').fill(expiryDate);
                await cardFrame.locator('input[placeholder="CVC"]').fill(cvc);
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
                await attempt();
                lastError = null;
                break;
            } catch (e) {
                lastError = e;
            }
        }

        if (lastError) {
            throw new Error('Failed to fill card details in Stripe frame: ' + lastError);
        }
    }

    async expectOrderReceived() {
        await expect(this.page.getByRole('heading', { name: 'Order received' })).toBeVisible();
        await expect(this.page.getByText('Thank you. Your order has been received.')).toBeVisible();
    }

    async expectCardError(message: string) {
        // Search frames for the error message inside Stripe frame or on page
        const timeout = 60000;
        const start = Date.now();
        let found = false;

        // First check page-level messages
        try {
            if ((await this.page.getByText(message).count()) > 0) {
                await expect(this.page.getByText(message)).toBeVisible();
                return;
            }
        } catch (e) {
            // ignore
        }

        while (Date.now() - start < timeout && !found) {
            for (const f of this.page.frames()) {
                try {
                    const loc = f.getByText ? f.getByText(message) : f.locator(`text=${message}`);
                    if (loc && (await loc.count()) > 0) {
                        await expect(loc).toBeVisible();
                        found = true;
                        break;
                    }
                } catch (e) {
                    // ignore frame access errors
                }
            }
            if (found) break;
            await this.page.waitForTimeout(500);
        }

        if (!found) throw new Error('Card error message not found: ' + message);
    }
}