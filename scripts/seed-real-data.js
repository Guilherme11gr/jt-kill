// Native fetch is used

const BASE_URL = 'http://localhost:3000/api';

async function seedData() {
  console.log('🌱 Starting data seed...');

  // 1. Fetch Features
  console.log('Fetching features...');
  const featuresRes = await fetch(`${BASE_URL}/features`);
  if (!featuresRes.ok) throw new Error('Failed to fetch features');
  const featuresData = await featuresRes.json();
  const features = featuresData.data || [];

  if (features.length === 0) {
    console.error('❌ No features found. Please create a feature first.');
    return;
  }

  const featureId = features[0].id;
  console.log(`Using Feature ID: ${featureId} (${features[0].title})`);

  // 2. Define Tasks
  const tasks = [
    { title: 'Designing Database Schema', status: 'DONE', priority: 'HIGH', type: 'TASK' },
    { title: 'Setup Next.js Project', status: 'DONE', priority: 'HIGH', type: 'TASK' },
    { title: 'Implement Auth Middleware', status: 'QA_READY', priority: 'CRITICAL', type: 'TASK' },
    { title: 'Create Task Creation Dialog', status: 'REVIEW', priority: 'HIGH', type: 'TASK' },
    { title: 'Fix API CORS Issues', status: 'DOING', priority: 'MEDIUM', type: 'BUG' },
    { title: 'Refactor Kanban Component', status: 'TODO', priority: 'LOW', type: 'TASK' },
    { title: 'Add Drag and Drop Animations', status: 'TODO', priority: 'MEDIUM', type: 'TASK' },
    { title: 'Write E2E Tests', status: 'BACKLOG', priority: 'HIGH', type: 'TASK' },
    { title: 'Optimize Bundle Size', status: 'BACKLOG', priority: 'LOW', type: 'TASK' },
    { title: 'Fix Mobile Layout Bug', status: 'BACKLOG', priority: 'CRITICAL', type: 'BUG' },
  ];

  // 3. Create Tasks
  console.log(`Creating ${tasks.length} tasks...`);

  for (const task of tasks) {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...task,
        featureId,
        description: `Auto-generated description for ${task.title}. This represents a real-world task context.`,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const taskId = json.data.id;
      console.log(`✅ Created: ${task.title}`);

      // Update status if not BACKLOG (default is usually backlog/todo, so we patch to move it)
      if (task.status !== 'BACKLOG') {
        await fetch(`${BASE_URL}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: task.status }),
        });
        console.log(`   Detailed status to: ${task.status}`);
      }
    } else {
      console.error(`❌ Failed to create: ${task.title}`, await res.text());
    }
  }

  console.log('✨ Seed completed!');
}

seedData().catch(console.error);
