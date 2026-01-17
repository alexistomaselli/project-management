
import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '../types';
import { MoreHorizontal, AlertCircle, Clock, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface KanbanViewProps {
    tasks: Task[];
    onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
    onSelectTask: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; label: string; icon: any; color: string }[] = [
    { id: 'todo', label: 'Por Hacer', icon: Circle, color: 'text-slate-400' },
    { id: 'in_progress', label: 'En Progreso', icon: Clock, color: 'text-amber-500' },
    { id: 'review', label: 'En Revisión', icon: AlertCircle, color: 'text-indigo-500' },
    { id: 'done', label: 'Completado', icon: CheckCircle2, color: 'text-emerald-500' },
];

const KanbanView: React.FC<KanbanViewProps> = ({ tasks, onUpdateTaskStatus, onSelectTask }) => {
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId) return;

        onUpdateTaskStatus(draggableId, destination.droppableId as TaskStatus);
    };

    const getTaskPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-rose-100 text-rose-600 border-rose-200';
            case 'high': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'medium': return 'bg-amber-100 text-amber-600 border-amber-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full min-h-[70vh]">
                {COLUMNS.map((column) => (
                    <div key={column.id} className="flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <column.icon className={`w-5 h-5 ${column.color}`} />
                                <h3 className="font-bold text-slate-800 tracking-tight">{column.label}</h3>
                                <span className="bg-slate-200/50 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {tasks.filter(t => t.status === column.id).length}
                                </span>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-indigo-50/30' : ''
                                        }`}
                                >
                                    <div className="space-y-3 p-1">
                                        <AnimatePresence>
                                            {tasks
                                                .filter((task) => task.status === column.id)
                                                .map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`mb-3 outline-none ${snapshot.isDragging ? 'z-50' : ''}`}
                                                            >
                                                                <motion.div
                                                                    layout
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                                    onClick={() => onSelectTask(task.id)}
                                                                    className={`group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer ${snapshot.isDragging ? 'rotate-3 scale-105 shadow-xl border-indigo-200' : 'border-slate-100 active:scale-95'
                                                                        }`}
                                                                >
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-start justify-between">
                                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getTaskPriorityColor(task.priority)}`}>
                                                                                {task.priority}
                                                                            </span>
                                                                        </div>

                                                                        <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                                                            {task.title}
                                                                        </h4>

                                                                        {task.description && (
                                                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                                                {task.description}
                                                                            </p>
                                                                        )}

                                                                        <div className="flex items-center justify-between pt-2">
                                                                            <div className="flex -space-x-2">
                                                                                {task.assignees?.map((assignee, i) => (
                                                                                    <div
                                                                                        key={i}
                                                                                        className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                                                                        title={assignee}
                                                                                    >
                                                                                        {assignee.charAt(0)}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <div className="text-[10px] font-medium text-slate-400">
                                                                                ID: {task.id.substring(0, 5)}...
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                        </AnimatePresence>
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
};

export default KanbanView;
