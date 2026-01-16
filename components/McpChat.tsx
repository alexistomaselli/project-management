
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { mcpTools } from '../services/mcpTools';
import { Project, Task, Activity, Message, ProjectStatus, TaskStatus } from '../types';

interface McpChatProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activities: Activity[];
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
}

const McpChat: React.FC<McpChatProps> = ({ 
  projects, setProjects, 
  tasks, setTasks, 
  activities, setActivities 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Hola! Soy tu asistente de NovaProject. Puedo ayudarte a gestionar proyectos, tareas y ver el historial en lenguaje natural a través de mi servidor MCP. ¿En qué puedo ayudarte hoy?', 
      timestamp: new Date() 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleMcpAction = async (call: any) => {
    const { name, args } = call;
    console.log('Executing tool:', name, args);

    switch (name) {
      case 'list_projects':
        return projects.map(p => `- ${p.name} (${p.status}): ${p.progress}%`).join('\n');

      case 'get_project_details': {
        const proj = projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
        if (!proj) return `Project "${args.projectName}" not found.`;
        const pTasks = tasks.filter(t => t.projectId === proj.id);
        return `Project: ${proj.name}\nStatus: ${proj.status}\nProgress: ${proj.progress}%\nTasks:\n${pTasks.map(t => `  - [${t.status}] ${t.title}`).join('\n')}`;
      }

      case 'update_project_status': {
        const projIndex = projects.findIndex(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
        if (projIndex === -1) return `Project "${args.projectName}" not found.`;
        
        const newStatus = args.newStatus as ProjectStatus;
        const oldStatus = projects[projIndex].status;
        
        setProjects(prev => {
          const updated = [...prev];
          updated[projIndex] = { ...updated[projIndex], status: newStatus };
          return updated;
        });

        const newActivity: Activity = {
          id: `a${Date.now()}`,
          projectId: projects[projIndex].id,
          projectName: projects[projIndex].name,
          action: `Changed status from ${oldStatus} to ${newStatus}`,
          timestamp: new Date().toISOString(),
          user: 'AI Assistant'
        };
        setActivities(prev => [newActivity, ...prev]);

        return `Successfully updated ${projects[projIndex].name} to ${newStatus}.`;
      }

      case 'get_recent_updates': {
        let list = activities;
        if (args.projectName) {
          list = list.filter(a => a.projectName.toLowerCase().includes(args.projectName.toLowerCase()));
        }
        return list.slice(0, 5).map(a => `[${new Date(a.timestamp).toLocaleDateString()}] ${a.user} ${a.action} en ${a.projectName}`).join('\n');
      }

      case 'add_project_task': {
        const proj = projects.find(p => p.name.toLowerCase().includes(args.projectName.toLowerCase()));
        if (!proj) return `Project "${args.projectName}" not found.`;

        const newTask: Task = {
          id: `t${Date.now()}`,
          projectId: proj.id,
          title: args.taskTitle,
          status: TaskStatus.TODO,
          assignee: args.assignee || 'Unassigned',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        setTasks(prev => [...prev, newTask]);

        const newActivity: Activity = {
          id: `a${Date.now()}`,
          projectId: proj.id,
          projectName: proj.name,
          action: `Added task: "${args.taskTitle}"`,
          timestamp: new Date().toISOString(),
          user: 'AI Assistant'
        };
        setActivities(prev => [newActivity, ...prev]);

        return `Added task "${args.taskTitle}" to project ${proj.name}.`;
      }

      default:
        return 'Function not implemented.';
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMsg: Message = { 
      role: 'user', 
      content: inputValue, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: inputValue,
        config: {
          systemInstruction: 'You are the NovaProject MCP Server interface. You manage projects and tasks. When a user asks to see, list, or update items, you MUST use the provided tools. Be professional, concise, and helpful. Always confirm actions.',
          tools: [{ functionDeclarations: mcpTools }],
        },
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        let toolResults = [];
        for (const call of response.functionCalls) {
          const result = await handleMcpAction(call);
          toolResults.push(result);
        }

        const secondResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: [
            { text: inputValue },
            { text: `System result from tools: ${toolResults.join('\n\n')}` }
          ],
          config: {
            systemInstruction: 'Synthesize the tool results into a friendly natural language response for the user.',
          }
        });

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: secondResponse.text || 'Action completed successfully.',
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.text || 'I processed your request but no specific action was taken.',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hubo un error al procesar tu solicitud MCP. Por favor intenta de nuevo.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center animate-pulse">
              <i className="fa-solid fa-brain text-white"></i>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
          </div>
          <div>
            <h3 className="text-white font-bold leading-none">MCP Agent</h3>
            <span className="text-slate-400 text-xs font-medium">Online & Ready</span>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          <i className="fa-solid fa-gear"></i>
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
            }`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              <div className={`text-[10px] mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escribe un comando MCP (ej. 'Muestra proyectos')..."
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-24 shadow-sm transition-all"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button 
              onClick={handleSendMessage}
              disabled={isTyping}
              className="w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center shadow-lg shadow-blue-600/20"
            >
              <i className="fa-solid fa-arrow-up"></i>
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['Proyectos activos', 'Nuevas tareas', 'Últimos cambios'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputValue(suggestion)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-all flex-shrink-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default McpChat;
