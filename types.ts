
export type ProjectStatus = 'active' | 'archived' | 'on_hold';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  repository_url?: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignees: string[];
  dueDate: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  issueId?: string;
  projectName: string;
  action: string;
  timestamp: string;
  user: string;
  details?: any;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
}
