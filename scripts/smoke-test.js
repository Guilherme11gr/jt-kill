const { chromium } = require('playwright');

(async () => {
  console.log('Starting Smoke Test...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];

  try {
    // 1. Landing Page
    console.log('Testing Landing Page...');
    await page.goto('http://localhost:3000');
    if (await page.title() !== 'Jira Killer') {
      errors.push('Landing Page: Incorrect title');
    }

    // 2. Projects Page (Create)
    console.log('Testing Projects Page...');
    await page.goto('http://localhost:3000/projects');

    // Check if we are on projects page
    const projectsTitle = await page.getByRole('heading', { name: 'Projetos' }).isVisible();
    if (!projectsTitle) errors.push('Projects Page: Heading not found');

    // Create Project
    await page.getByRole('button', { name: 'Novo Projeto' }).first().click();
    await page.fill('input[id="name"]', 'Smoke Test Project');
    await page.fill('input[id="key"]', 'SMOKE');
    await page.fill('input[id="modules"]', 'test, smoke');
    await page.getByRole('button', { name: 'Criar Projeto' }).click();

    // Check if created
    await page.waitForTimeout(2000); // Wait for refresh
    const projectCard = await page.getByText('Smoke Test Project').isVisible();
    if (!projectCard) errors.push('Projects Page: Project creation failed or not visible');

    // 3. Tasks Page (Create - Expected to fail based on code analysis)
    console.log('Testing Tasks Page...');
    await page.goto('http://localhost:3000/tasks');

    await page.getByRole('button', { name: 'Nova Task' }).click();
    // Use a short timeout to see if modal appears (it shouldn't based on our analysis)
    try {
      await page.waitForSelector('role=dialog', { timeout: 2000 });
      console.log('Tasks Page: Modal appeared (Unexpected success?)');
    } catch (e) {
      errors.push('Tasks Page: "Nova Task" button did not open a dialog (Expected failure as functionality is missing)');
    }

    // 4. Scribe Page
    console.log('Testing Scribe Page...');
    await page.goto('http://localhost:3000/scribe');
    const scribeTitle = await page.getByText('AI Scribe').isVisible();
    if (!scribeTitle) errors.push('Scribe Page: Title not found');

    // 5. Settings Page
    console.log('Testing Settings Page...');
    await page.goto('http://localhost:3000/settings');
    const settingsTitle = await page.getByText('Configurações').isVisible();
    if (!settingsTitle) errors.push('Settings Page: Title not found');

  } catch (err) {
    errors.push(`Critical Script Error: ${err.message}`);
  } finally {
    await browser.close();

    console.log('\n--- Smoke Test Report ---');
    if (errors.length === 0) {
      console.log('SUCCESS: All checks passed!');
    } else {
      console.log('FAILURES FOUND:');
      errors.forEach(e => console.log(`- ${e}`));
    }
  }
})();
