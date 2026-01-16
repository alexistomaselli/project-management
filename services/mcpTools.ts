
import { FunctionDeclaration, Type } from '@google/genai';

export const mcpTools: FunctionDeclaration[] = [
  {
    name: 'list_projects',
    description: 'Returns a list of all active projects in the system.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_project_details',
    description: 'Get detailed information and tasks for a specific project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: {
          type: Type.STRING,
          description: 'The exact name or part of the name of the project.',
        },
      },
      required: ['projectName'],
    },
  },
  {
    name: 'update_project_status',
    description: 'Change the status of an existing project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: {
          type: Type.STRING,
          description: 'Name of the project to update.',
        },
        newStatus: {
          type: Type.STRING,
          description: 'The new status: Active, Completed, On Hold, or Planning.',
        },
      },
      required: ['projectName', 'newStatus'],
    },
  },
  {
    name: 'get_recent_updates',
    description: 'Retrieve the recent activity log or history for the entire platform or a specific project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: {
          type: Type.STRING,
          description: 'Optional project name to filter updates.',
        },
      },
    },
  },
  {
    name: 'add_project_task',
    description: 'Create a new task within a specific project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: {
          type: Type.STRING,
          description: 'Project to add the task to.',
        },
        taskTitle: {
          type: Type.STRING,
          description: 'Title of the new task.',
        },
        assignee: {
          type: Type.STRING,
          description: 'Person assigned to the task.',
        },
      },
      required: ['projectName', 'taskTitle'],
    },
  }
];
