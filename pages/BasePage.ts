import { Page, Locator, expect } from '@playwright/test';

export default abstract class BasePage {
    protected constructor(protected page: Page) {}

    // Common method to type into any input field
    protected async typeIntoLocator(locator: string, value: string) {
        await this.page.locator(locator).type(value, { delay: 100 });
    }

    // Common method to click any element
    protected async clickElement(locator: string, options: { timeout?: number } = {}) {
        const { timeout = 25000 } = options;
        await this.page.locator(locator).click({ timeout });
    }

    // Common method to verify text content
    protected async verifyText(locator: string, expectedText: string, exact: boolean = false) {
        const loc = this.page.locator(locator).first();
        if (exact) {
            await expect(loc).toHaveText(expectedText);
        } else {
            // Use contains for partial matching and normalize whitespace
            await expect(loc).toContainText(expectedText);
        }
    }

    protected async verifyTextWithOptions(
        locator: string,
        expectedText: string,
        options: {
            exact?: boolean;
            normalizeWhitespace?: boolean;
            timeout?: number;
        } = {},
    ) {
        const { exact = false, normalizeWhitespace = true, timeout = 5000 } = options;

        if (normalizeWhitespace) {
            const loc = this.page.locator(locator).first();
            await expect(loc).toHaveText(new RegExp(expectedText.replace(/\s+/g, '\\s+')), {
                timeout,
            });
        } else if (exact) {
            const loc = this.page.locator(locator).first();
            await expect(loc).toHaveText(expectedText, { timeout });
        } else {
            const loc = this.page.locator(locator).first();
            await expect(loc).toContainText(expectedText, { timeout });
        }
    }

    // Common method to verify element visibility
    protected async verifyElementVisible(locator: string, options: { timeout?: number } = {}) {
        const { timeout = 25000 } = options;
        const loc = this.page.locator(locator).first();
        await expect(loc).toBeVisible({ timeout });
    }

    // Common method to capture screenshots
    public async captureScreenshot(screenshotName: string, fullPage: boolean = false) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await this.page.screenshot({
            path: `screenshots/${screenshotName}-${timestamp}.png`,
            fullPage,
        });
    }

    // Common method to fill out a form with multiple fields
    protected async fillForm(fields: { [key: string]: string }) {
        for (const [locator, value] of Object.entries(fields)) {
            await this.typeIntoLocator(locator, value);
        }
    }

    // Common method to navigate to a URL
    protected async navigate(url: string) {
        await this.page.goto(url);
    }

    // Common method to get text content
    protected async getTextContent(locator: string): Promise<string | null> {
        return await this.page.locator(locator).first().textContent();
    }
}
