import { useState } from 'react';
import { SubmissionValidation } from './SubmissionValidation';
import { SubmissionHistory } from './SubmissionHistory';
import { ChallengeManagement } from './ChallengeManagement';
import { UserManagement } from './UserManagement';
import { cn } from '../../utils/cn';

const tabs = [
  { id: 'submissions', label: 'Soumissions' },
  { id: 'history', label: 'Historique' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'users', label: 'Utilisateurs' },
] as const;

type TabId = typeof tabs[number]['id'];

export function AdminDashboard() {
  const [currentTab, setCurrentTab] = useState<TabId>('submissions');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="min-w-max flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                currentTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[calc(100vh-12rem)]">
        {currentTab === 'submissions' && <SubmissionValidation />}
        {currentTab === 'history' && <SubmissionHistory />}
        {currentTab === 'challenges' && <ChallengeManagement />}
        {currentTab === 'users' && <UserManagement />}
      </div>
    </div>
  );
}