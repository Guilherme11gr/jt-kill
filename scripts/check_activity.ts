
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    // 1. Find the project "Agenda Aqui"
    const project = await prisma.project.findFirst({
      where: { name: { contains: 'Agenda Aqui', mode: 'insensitive' } }
    });

    if (!project) {
      console.log('Project "Agenda Aqui" not found.');
      return;
    }

    console.log(`Found Project: ${project.name} (${project.id})`);

    // 2. Find tasks in this project
    const tasks = await prisma.task.findMany({
      where: { projectId: project.id },
      select: { id: true, title: true }
    });
    const taskIds = tasks.map(t => t.id);
    console.log(`Found ${taskIds.length} tasks in project.`);

    // 3. Find audit logs for these tasks
    const logs = await prisma.auditLog.findMany({
      where: {
        targetId: { in: taskIds },
        targetType: 'task'
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        organization: true
      }
    });

    // 4. Debug "Alguém" / "Missing Data" issues
    // We'll mimic the raw SQL query to see exactly what columns are coming back null
    const sqlLogs = await prisma.$queryRaw<any[]>`
      SELECT 
        a.id,
        a.user_id,
        a.action,
        a.target_id,
        a.metadata,
        a.created_at,
        u.display_name,
        u.avatar_url,
        t.title as task_title,
        p.name as project_name
      FROM public.audit_logs a
      LEFT JOIN public.user_profiles u ON a.user_id = u.id AND u.org_id = a.org_id
      LEFT JOIN public.tasks t ON a.target_id = t.id
      LEFT JOIN public.projects p ON t.project_id = p.id
      WHERE a.target_type = 'task'
      ORDER BY a.created_at DESC
      LIMIT 10
    `;

    console.log('\n--- DEBUG RAW SQL RESULTS ---');
    sqlLogs.forEach(l => {
      const hasUser = !!l.display_name;
      const hasTask = !!l.task_title;
      const label = (!hasUser || !hasTask) ? ' [MISSING INFO]' : '';
      console.log(`Log ${l.id} ${label}`);
      console.log(`  User: ${l.user_id} -> Name: ${l.display_name}`);
      console.log(`  Task: ${l.target_id} -> Title: ${l.task_title}`);
      console.log(`  Meta: ${JSON.stringify(l.metadata)}`);
    });

    // 5. Inspect specific problematic user (Gepeto)
    const targetUserId = 'b7d65a91-7cb6-4583-b46d-4f64713ffae2';
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`\n--- INSPECTING USER ${targetUserId} ---`);
    console.log(`Checking logs since: ${oneDayAgo.toISOString()}`);

    // Count logs in last 24h
    const recentCount = await prisma.auditLog.count({
      where: {
        userId: targetUserId,
        createdAt: { gte: oneDayAgo }
      }
    });

    console.log(`\n>> ACTIVITY RECORDS IN LAST 24H: ${recentCount}`);

    // Fetch the absolute latest logs (any time) to see when they stopped
    const userLogs = await prisma.auditLog.findMany({
      where: { userId: targetUserId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        createdAt: true,
        targetType: true,
        orgId: true,
        metadata: true
      }
    });

    console.log('\nLast 5 Logs (Any Time):');
    userLogs.forEach(l => {
      console.log(`[${l.createdAt.toISOString()}] ${l.action} (Org: ${l.orgId})`);
      console.log(`   Meta: ${JSON.stringify(l.metadata)}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
