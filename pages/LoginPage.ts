import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class LoginPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    private readonly selectors = {
        usernameId: '#username-92',
        passwordId: '#user_password-92',
        loginButtonId: '#um-submit-btn',
    };

    async login(username: string, password: string) {
        // Try several ways to locate username and password fields to be resilient to markup changes
        const tryFill = async (locators: Array<string | (() => any)>, value: string) => {
            for (const l of locators) {
                try {
                    if (typeof l === 'function') {
                        const locator = l();
                        if (locator && (await locator.count?.()) > 0) {
                            await locator.fill(value);
                            return true;
                        }
                    } else {
                        const locator = this.page.locator(l);
                        if ((await locator.count()) > 0) {
                            await locator.fill(value);
                            return true;
                        }
                    }
                } catch (e) {
                    // ignore and try next
                }
            }
            return false;
        };

        // Username candidates: labelled input, placeholder, common name attribute, fallback ID
        await tryFill([
            () => this.page.getByLabel('Username'),
            () => this.page.getByPlaceholder('Username'),
            'input[name="username"]',
            this.selectors.usernameId,
        ], username);

        // Password candidates
        await tryFill([
            () => this.page.getByLabel('Password'),
            () => this.page.getByPlaceholder('Password'),
            'input[name="password"]',
            this.selectors.passwordId,
        ], password);

        // Click login: try role-based button or fallback ID
        try {
            const btn = this.page.getByRole('button', { name: /log in|login|sign in/i }).first();
            if ((await btn.count()) > 0) {
                await btn.click();
                return;
            }
        } catch (e) {
            // ignore
        }

        await this.clickElement(this.selectors.loginButtonId);
    }
}
