import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeOnboardingIfRequired } from './onboarding';
import { createProject, PDF_FIXTURE } from './helpers';

// Only the isolated local bootstrap file is read. No traces/screenshots capture credentials.
const fixture = JSON.parse(readFileSync('validation/local-access.json', 'utf8'));
test('Rancher local real browser: login, session, project and synthetic PDF', async ({ page, context }) => {
    await page.goto('/login');
    await expect(page.getByRole('img', { name: 'Rancher', exact: true })).toBeVisible();
    await page.getByLabel('Email', { exact: true }).fill(fixture.email);
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await completeOnboardingIfRequired(page);
    expect((await context.request.get('/api/auth/session')).status()).toBe(200);
    await createProject(page, `Synthetic Rancher browser ${Date.now()}`, PDF_FIXTURE);
    await expect(page.getByText('test.pdf', { exact: true }).first()).toBeVisible({ timeout: 30000 });
    const projectId = new URL(page.url()).pathname.split('/').pop()!;
    const docs = await (await context.request.get(`/api/projects/${projectId}/documents`)).json();
    console.log('Document list shape', Object.keys(docs));
    const documentId = (Array.isArray(docs) ? docs : docs.documents)[0].id;
    const file = await context.request.get(`/api/single-documents/${documentId}/file`);
    expect(file.status()).toBe(200);
    expect((await file.body()).subarray(0, 4).toString()).toBe('%PDF');
    await page.locator('button').filter({ hasText: '···' }).first().click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    expect((await download).suggestedFilename()).toContain('.pdf');
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByText('test.pdf', { exact: true }).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    await expect(page.getByText('test.pdf', { exact: true }).first()).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);

    const org = await page.evaluate(async () => {
        const r = await fetch('/api/orgs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: `Synthetic invitation ${Date.now()}` }) });
        return { status: r.status, body: await r.json() };
    });
    expect(org.status).toBe(201);
    const second = JSON.parse(readFileSync('validation/local-denial-access.json', 'utf8'));
    const invitation = await page.evaluate(async ({ orgId, email }) => {
        const r = await fetch(`/api/orgs/${orgId}/invitations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, role: 'member' }) });
        return { status: r.status, body: await r.json() };
    }, { orgId: org.body.id, email: second.email });
    expect(invitation.status).toBe(201);
    const other = await page.context().browser()!.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002' });
    const recipient = await other.newPage();
    await recipient.goto('/login');
    await recipient.getByLabel('Email', { exact: true }).fill(second.email);
    await recipient.getByLabel('Password', { exact: true }).fill(second.password);
    await recipient.getByRole('button', { name: 'Log in', exact: true }).click();
    await completeOnboardingIfRequired(recipient);
    expect([403, 404]).toContain((await other.request.get(`/api/projects/${projectId}`)).status());
    expect([403, 404]).toContain((await other.request.get(`/api/single-documents/${documentId}/file`)).status());
    const accepted = await recipient.evaluate(async id => {
        const r = await fetch(`/api/user/invitations/${id}/accept`, { method: 'POST' });
        return r.status;
    }, invitation.body.id);
    expect(accepted).toBe(200);
    expect([403, 404]).toContain((await other.request.get(`/api/projects/${projectId}`)).status());
    await other.close();
    await page.reload();
    expect((await context.request.get('/api/auth/session')).status()).toBe(200);
    await page.goto('/assistant');
    const composer = page.getByRole('combobox', { name: 'How can I help?' });
    await composer.fill('Synthetic unavailable model check');
    await composer.press('Enter');
    await expect(page.getByRole('button', { name: 'No models available' })).toBeVisible();
    await expect(page.getByText('Select a model', { exact: true })).toBeVisible();
    const logout = await page.evaluate(async () => (await fetch('/api/auth/logout', { method: 'POST' })).status);
    expect(logout).toBe(204);
    expect((await context.request.get('/api/auth/session')).status()).toBe(401);
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
    console.log('Synthetic PDF download, viewport/keyboard/zoom, invitation acceptance, cross-account denials, missing-model UI and revoked session verified. Captured SMTP only; no models called.');
});
