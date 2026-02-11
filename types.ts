
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
  role?: 'superadmin' | 'member' | 'user';
  confirmed_at?: string;
  created_at?: string;
  permissions?: {
    dashboard: boolean;
    projects: boolean;
    settings: boolean;
    teams: boolean;
    ai: boolean;
    tasks: boolean;
    whiteboards: boolean;
    history: boolean;
    docs: boolean;
    video_calls: boolean;
    reports: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  settings: {
    modules: {
      tasks: boolean;
      whiteboards: boolean;
      ai: boolean;
      docs: boolean;
      history: boolean;
    }
  };
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'lead' | 'member';
}

export interface IssueAttachment {
  id: string;
  issueId: string;
  projectId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  createdBy: string;
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
  attachments?: IssueAttachment[];
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

export interface Whiteboard {
  id: string;
  projectId: string;
  name: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

export type DocType = 'draft' | 'scope' | 'technical' | 'meeting' | 'requirements';

export interface ProjectDoc {
  id: string;
  projectId: string;
  taskId?: string;
  title: string;
  content: string;
  type: DocType;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  projectId?: string;
  issueId?: string;
  title: string;
  description?: string;
  remindAt: string;
  isSent: boolean;
  channels: ('email' | 'push' | 'whatsapp')[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  id: string;
  key: string;
  value: any;
  updatedAt: string;
}
