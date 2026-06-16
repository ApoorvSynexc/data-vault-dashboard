// RestoreCenter — entry point that controls which top-level screen is shown.
//
// Screens:
//   home        → HomePage      — landing dashboard (KPIs, drafts, recent restores, templates)
//   new-restore → NewRestore    — 6-step wizard to create and submit a new restore job
//   progress    → JobProgress   — live progress view for a running restore job
//   completion  → Completion    — success / partial / failure result screen after a job finishes
//   history     → RestoreHistory — full paginated list of past restore jobs
//   templates   → Templates     — saved and pinned restore templates

import { useState } from 'react';
import HomePage from './HomePage';
import NewRestore from './NewRestore';
import JobProgress from './JobProgress';
import RestoreCompletion from './Completion';
import RestoreHistory from './RestoreHistory';
import RestoreTemplates from './Templates';

type Screen = 'home' | 'new-restore' | 'progress' | 'completion' | 'history' | 'templates';

export default function RestoreCenter() {
  const [screen, setScreen] = useState<Screen>('home');

  const goTo = (s: Screen) => setScreen(s);

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {screen === 'home' && (
        <HomePage
          onNewRestore={() => goTo('new-restore')}
          onViewHistory={() => goTo('history')}
          onViewTemplates={() => goTo('templates')}
          onViewJob={() => goTo('completion')}
        />
      )}
      {screen === 'new-restore' && (
        <NewRestore
          onBack={() => goTo('home')}
          onComplete={() => goTo('progress')}
        />
      )}
      {screen === 'progress' && (
        <JobProgress />
      )}
      {screen === 'completion' && (
        <RestoreCompletion />
      )}
      {screen === 'history' && (
        <RestoreHistory />
      )}
      {screen === 'templates' && (
        <RestoreTemplates />
      )}
    </div>
  );
}
