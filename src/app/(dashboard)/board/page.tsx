import { PersonalBoard } from '@/components/features/personal-board/personal-board';
import { WeeklyGoalsWidget } from '@/components/features/weekly-goals/weekly-goals-widget';
import { QuickCapture } from '@/components/features/personal-notes/quick-capture';
import { PersonalNotesWidget } from '@/components/features/personal-notes/personal-notes-widget';

export const dynamic = 'force-dynamic';

export default function BoardPage() {
  return (
    <div className="flex flex-col gap-6">
      <QuickCapture />
      <div>
        <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mb-3">Minha Semana</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyGoalsWidget />
          <PersonalNotesWidget />
        </div>
      </div>
      <div className="border-t border-border/50" />
      <PersonalBoard />
    </div>
  );
}
