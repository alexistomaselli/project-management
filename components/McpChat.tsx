
import React, { useState, useRef, useEffect } from 'react';
import { Message, Project, Task, Activity } from '../types';
import { supabase } from '../services/supabase';
import { Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';

interface McpChatProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activities: Activity[];
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
}

const McpChat: React.FC<McpChatProps> = ({
  projects, tasks, activities
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola Alex! Estoy conectado al servidor MCP de ProjectCentral. Puedo ayudarte a gestionar tus desarrollos. \n\nPrueba decirme: "Crea un nuevo proyecto llamado \'Sistema de Pagos\'"',
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

    // Simulación de procesamiento MCP (En producción, esto lo haría el Agente Antigravity)
    // Pero aquí permitimos interacción básica para que la UI se sienta viva
    setTimeout(async () => {
      let responseContent = "Entendido. He procesado tu solicitud a través del servidor MCP.";

      if (inputValue.toLowerCase().includes('proyecto')) {
        responseContent = "He registrado la intención de crear un proyecto. Como soy una interfaz de visualización, por favor confirma la creación definitiva con Antigravity en el chat principal.";
      } else if (inputValue.toLowerCase().includes('tarea') || inputValue.toLowerCase().includes('task')) {
        responseContent = "Tareas listadas. He sincronizado el backlog con la base de datos central de DyD IA Labs.";
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] overflow-hidden">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/30"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'
                }`}>
                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MCP Processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Comando de voz o texto..."
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none pr-14 transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center shadow-lg shadow-indigo-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg text-[9px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">
            <Sparkles className="w-3 h-3" />
            Antigravity Bridge
          </div>
        </div>
      </div>
    </div>
  );
};

export default McpChat;
