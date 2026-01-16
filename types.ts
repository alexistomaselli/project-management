
export enum ProjectStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold',
  PLANNING = 'Planning'
}

export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  BLOCKED = 'Blocked'
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  deadline: string;
  progress: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
}

export interface Activity {
  id: string;
  projectId: string;
  projectName: string;
  action: string;
  timestamp: string;
  user: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
}
