
import { Project, ProjectStatus, Task, TaskStatus, Activity } from './types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Apollo Rebrand',
    description: 'Complete overhaul of corporate identity and digital assets.',
    status: ProjectStatus.ACTIVE,
    deadline: '2024-06-15',
    progress: 65
  },
  {
    id: 'p2',
    name: 'Mars Logistics App',
    description: 'Supply chain optimization tool for international shipping.',
    status: ProjectStatus.PLANNING,
    deadline: '2024-09-20',
    progress: 10
  },
  {
    id: 'p3',
    name: 'Q3 Security Audit',
    description: 'Internal security assessment and penetration testing.',
    status: ProjectStatus.ON_HOLD,
    deadline: '2024-08-01',
    progress: 45
  }
];

export const INITIAL_TASKS: Task[] = [
  { id: 't1', projectId: 'p1', title: 'Design new logo', status: TaskStatus.DONE, assignee: 'Elena R.', dueDate: '2024-04-10' },
  { id: 't2', projectId: 'p1', title: 'Update brand guidelines', status: TaskStatus.IN_PROGRESS, assignee: 'Marco V.', dueDate: '2024-05-01' },
  { id: 't3', projectId: 'p2', title: 'Draft API architecture', status: TaskStatus.TODO, assignee: 'Sam T.', dueDate: '2024-05-15' },
  { id: 't4', projectId: 'p3', title: 'Review firewall logs', status: TaskStatus.DONE, assignee: 'Sam T.', dueDate: '2024-04-12' },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  { id: 'a1', projectId: 'p1', projectName: 'Apollo Rebrand', action: 'Created task "Update brand guidelines"', timestamp: '2024-04-24T10:30:00Z', user: 'Elena R.' },
  { id: 'a2', projectId: 'p3', projectName: 'Q3 Security Audit', action: 'Changed status to "On Hold"', timestamp: '2024-04-23T14:15:00Z', user: 'Admin' },
  { id: 'a3', projectId: 'p1', projectName: 'Apollo Rebrand', action: 'Marked "Design new logo" as Done', timestamp: '2024-04-22T09:00:00Z', user: 'Elena R.' }
];
