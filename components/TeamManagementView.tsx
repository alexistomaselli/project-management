
import React, { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Settings,
    Trash2,
    UserPlus,
    FolderPlus,
    CheckCircle2,
    XCircle,
    LayoutDashboard,
    Layers,
    Settings as SettingsIcon,
    Users as UsersIcon,
    Sparkles,
    CheckSquare,
    Palette,
    History as HistoryIcon,
    BookOpen,
    Shield,
    Layout,
    Edit2,
    Clock,
    UserCheck,
    Video
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Team, Profile, Project } from '../types';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

const TeamManagementView: React.FC<{ searchQuery?: string; profile: Profile | null }> = ({ searchQuery = '', profile }) => {
    const [view, setView] = useState<'teams' | 'directory' | 'roles'>('teams');
    const [teams, setTeams] = useState<Team[]>([]);
    const [rolePermissions, setRolePermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [autoAssignProjects, setAutoAssignProjects] = useState(true);

    // Directory State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [newUserData, setNewUserData] = useState({ full_name: '', email: '' });
    const [editingUser, setEditingUser] = useState<Profile | null>(null);

    // UI States for dropdowns
    const [activeDropdown, setActiveDropdown] = useState<'members' | 'projects' | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [teamProjects, setTeamProjects] = useState<Project[]>([]);
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);

    const { showToast, confirmAction } = useVisualFeedback();

    useEffect(() => {
        fetchTeams();
        fetchAllData();
        fetchRolePermissions();
    }, []);

    const fetchRolePermissions = async () => {
        const { data } = await supabase.from('role_permissions').select('*');
        if (data) setRolePermissions(data);
    };

    const fetchTeams = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
        if (error) {
            showToast('Error', 'No se pudieron cargar los equipos', 'error');
        } else {
            setTeams(data || []);
        }
        setLoading(false);
    };

    const fetchAllData = async () => {
        const { data: profiles } = await supabase.from('profiles').select('*');
        const { data: projects } = await supabase.from('projects').select('*');
        if (profiles) setAllProfiles(profiles);
        if (projects) setAllProjects(projects);
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim() || !profile) return;

        try {
            const { data: team, error } = await supabase
                .from('teams')
                .insert([{ name: newTeamName.trim() }])
                .select()
                .single();

            if (error) throw error;

            if (team) {
                // Auto-add creator
                await supabase.from('team_members').insert([{ team_id: team.id, user_id: profile.id, role: 'admin' }]);

                // Auto-assign ALL projects if toggled
                if (autoAssignProjects && allProjects.length > 0) {
                    const projectLinks = allProjects.map(p => ({ team_id: team.id, project_id: p.id }));
                    await supabase.from('project_teams').insert(projectLinks);
                }

                showToast('Equipo Creado', `Equipo "${team.name}" listo con ${autoAssignProjects ? allProjects.length : 0} proyectos asignados.`, 'success');
                setNewTeamName('');
                setIsCreateModalOpen(false);
                fetchTeams();
            }
        } catch (error: any) {
            showToast('Error', error.message, 'error');
        }
    };

    const handleCreateUser = async () => {
        if (!newUserData.email.trim()) return;

        showToast('Enviando...', 'Estamos generando la invitación oficial...', 'info');

        try {
            const { data, error } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: newUserData.email.trim(),
                    full_name: newUserData.full_name.trim()
                }
            });

            if (error) throw error;

            showToast('Invitación Enviada', `Se ha enviado un correo a ${newUserData.email}`, 'success');
            setNewUserData({ full_name: '', email: '' });
            setIsUserModalOpen(false);
            fetchAllData();
        } catch (error: any) {
            console.error('Error inviting user:', error);
            showToast('Error', 'No se pudo enviar la invitación. Verifica si el usuario ya existe o intenta de nuevo.', 'error');
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser || !editingUser.full_name?.trim()) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: editingUser.full_name.trim(),
                permissions: editingUser.permissions
            })
            .eq('id', editingUser.id);

        if (error) {
            showToast('Error', 'No se pudo actualizar el perfil', 'error');
        } else {
            showToast('Perfil Actualizado', 'Los datos y permisos se guardaron correctamente', 'success');
            setIsEditUserModalOpen(false);
            setEditingUser(null);
            fetchAllData();
        }
    };

    const handleUpdateRolePermissions = async (role: string, newPerms: any) => {
        const { error } = await supabase
            .from('role_permissions')
            .update({ permissions: newPerms })
            .eq('role', role);

        if (error) {
            showToast('Error', 'No se pudieron actualizar los permisos del rol', 'error');
        } else {
            showToast('Rol Actualizado', `Permisos base del rol "${role}" actualizados con éxito.`, 'success');
            fetchRolePermissions();
        }
    };

    const toggleModule = async (team: Team, module: string) => {
        const newSettings = { ...team.settings };
        if (!newSettings.modules) newSettings.modules = { tasks: true, whiteboards: true, ai: true, docs: true, history: true };

        // @ts-ignore
        newSettings.modules[module] = !newSettings.modules[module];

        const { error } = await supabase
            .from('teams')
            .update({ settings: newSettings })
            .eq('id', team.id);

        if (error) {
            showToast('Error', error.message, 'error');
        } else {
            setTeams(teams.map(t => t.id === team.id ? { ...t, settings: newSettings } : t));
        }
    };

    const fetchTeamDetails = async (team: Team) => {
        setSelectedTeam(team);

        // Fetch members
        const { data: members } = await supabase
            .from('team_members')
            .select('*, profiles(*)')
            .eq('team_id', team.id);
        setTeamMembers(members || []);

        // Fetch projects
        const { data: tProjects } = await supabase
            .from('project_teams')
            .select('*, projects(*)')
            .eq('team_id', team.id);
        setTeamProjects(tProjects?.map(tp => tp.projects) || []);
    };

    const addMember = async (userId: string) => {
        if (!selectedTeam) return;
        const { error } = await supabase
            .from('team_members')
            .insert([{ team_id: selectedTeam.id, user_id: userId }]);

        if (error) {
            showToast('Error', 'Usuario ya está en el equipo o error de conexión', 'error');
        } else {
            fetchTeamDetails(selectedTeam);
        }
    };

    const assignProject = async (projectId: string) => {
        if (!selectedTeam) return;
        const { error } = await supabase
            .from('project_teams')
            .insert([{ team_id: selectedTeam.id, project_id: projectId }]);

        if (error) {
            showToast('Error', 'Proyecto ya asignado o error de conexión', 'error');
        } else {
            fetchTeamDetails(selectedTeam);
        }
    };

    const removeMember = async (membershipId: string) => {
        const { error } = await supabase.from('team_members').delete().eq('id', membershipId);
        if (!error && selectedTeam) fetchTeamDetails(selectedTeam);
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Users className="animate-bounce text-indigo-500" /></div>;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between">
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                    <button
                        onClick={() => setView('teams')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'teams' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Estructura de Equipos
                    </button>
                    <button
                        onClick={() => setView('directory')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'directory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Directorio de Usuarios
                    </button>
                    <button
                        onClick={() => setView('roles')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'roles' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Permisos por Rol
                    </button>
                </div>

                <div className="flex gap-4">
                    {view === 'teams' ? (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Equipo
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsUserModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95"
                        >
                            <UserPlus className="w-5 h-5" />
                            Crear Perfil
                        </button>
                    )}
                </div>
            </div>

            {view === 'teams' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Team List */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Equipos Activos</h3>
                        {teams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(team => (
                            <div
                                key={team.id}
                                onClick={() => fetchTeamDetails(team)}
                                className={`p-5 rounded-[2rem] border transition-all cursor-pointer group ${selectedTeam?.id === team.id
                                    ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 text-white'
                                    : 'bg-white border-slate-100 hover:border-indigo-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTeam?.id === team.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'
                                            }`}>
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold underline-offset-4 group-hover:underline">{team.name}</span>
                                    </div>
                                    <Shield className={`w-4 h-4 ${selectedTeam?.id === team.id ? 'text-white' : 'text-slate-300'}`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Team Details & Config */}
                    <div className="lg:col-span-2 space-y-8">
                        {selectedTeam ? (
                            <div className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-black text-slate-900">{selectedTeam.name}</h3>
                                    <div className="flex gap-2">
                                        {['tasks', 'whiteboards', 'ai', 'docs', 'history'].map(mod => {
                                            const isEnabled = selectedTeam.settings?.modules?.[mod as keyof typeof selectedTeam.settings.modules] ?? true;
                                            return (
                                                <button
                                                    key={mod}
                                                    onClick={() => toggleModule(selectedTeam, mod)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 opacity-50'
                                                        }`}
                                                >
                                                    {mod}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Members */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Miembros</h4>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveDropdown(activeDropdown === 'members' ? null : 'members')}
                                                    className={`p-2 rounded-xl transition-all ${activeDropdown === 'members' ? 'bg-indigo-100 text-indigo-600' : 'text-indigo-600 hover:bg-indigo-50'}`}
                                                >
                                                    <UserPlus className="w-5 h-5" />
                                                </button>

                                                {activeDropdown === 'members' && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white shadow-2xl rounded-2xl border border-slate-100 p-2 z-50 animate-slide-up max-h-60 overflow-y-auto">
                                                            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Agregar Miembro</p>
                                                            {allProfiles.filter(p => !teamMembers.some(m => m.user_id === p.id)).length > 0 ? (
                                                                allProfiles.filter(p => !teamMembers.some(m => m.user_id === p.id)).map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            addMember(p.id);
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-bold transition-colors"
                                                                    >
                                                                        {p.full_name || p.email}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <p className="px-4 py-6 text-center text-xs text-slate-400 font-medium italic">No hay más usuarios disponibles</p>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {teamMembers.length > 0 ? teamMembers.map(m => (
                                                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group/member">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">
                                                            {(m.profiles?.full_name || m.profiles?.email || '?')[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{m.profiles?.email}</span>
                                                    </div>
                                                    <button onClick={() => removeMember(m.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )) : (
                                                <p className="text-center py-6 text-xs text-slate-400 italic font-medium">Sin miembros asignados</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Projects */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Proyectos</h4>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveDropdown(activeDropdown === 'projects' ? null : 'projects')}
                                                    className={`p-2 rounded-xl transition-all ${activeDropdown === 'projects' ? 'bg-indigo-100 text-indigo-600' : 'text-indigo-600 hover:bg-indigo-50'}`}
                                                >
                                                    <FolderPlus className="w-5 h-5" />
                                                </button>

                                                {activeDropdown === 'projects' && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white shadow-2xl rounded-2xl border border-slate-100 p-2 z-50 animate-slide-up max-h-60 overflow-y-auto">
                                                            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Asignar Proyecto</p>
                                                            {allProjects.filter(p => !teamProjects.some(tp => tp.id === p.id)).length > 0 ? (
                                                                allProjects.filter(p => !teamProjects.some(tp => tp.id === p.id)).map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            assignProject(p.id);
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-bold transition-colors"
                                                                    >
                                                                        {p.name}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <p className="px-4 py-6 text-center text-xs text-slate-400 font-medium italic">Todos los proyectos asignados</p>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {teamProjects.length > 0 ? teamProjects.map(p => (
                                                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group/proj">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 bg-white shadow-sm rounded flex items-center justify-center text-[10px] font-black">{p.name[0]}</div>
                                                        <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (selectedTeam) {
                                                                await supabase.from('project_teams').delete().eq('team_id', selectedTeam.id).eq('project_id', p.id);
                                                                fetchTeamDetails(selectedTeam);
                                                            }
                                                        }}
                                                        className="text-slate-300 hover:text-rose-600 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )) : (
                                                <p className="text-center py-6 text-xs text-slate-400 italic font-medium">Sin proyectos vinculados</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[3rem] p-20">
                                <Layout className="w-20 h-20 mb-4 opacity-10" />
                                <p className="font-bold">Selecciona un equipo para configurar</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : view === 'roles' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {rolePermissions.map((rp) => (
                        <div key={rp.role} className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <Shield className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 capitalize">{rp.role}</h3>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Permisos Base del Rol</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                                    { id: 'projects', label: 'Proyectos', icon: Layers },
                                    { id: 'tasks', label: 'Tareas', icon: CheckSquare },
                                    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
                                    { id: 'whiteboards', label: 'Pizarras', icon: Palette },
                                    { id: 'history', label: 'Historial', icon: HistoryIcon },
                                    { id: 'docs', label: 'Docs', icon: BookOpen },
                                    { id: 'video_calls', label: 'Videollamadas', icon: Video },
                                    { id: 'settings', label: 'Configuración', icon: SettingsIcon }
                                ].map((perm) => {
                                    const isEnabled = rp.permissions[perm.id];
                                    return (
                                        <button
                                            key={perm.id}
                                            onClick={() => {
                                                const newPerms = { ...rp.permissions, [perm.id]: !isEnabled };
                                                handleUpdateRolePermissions(rp.role, newPerms);
                                            }}
                                            className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${isEnabled
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <perm.icon className="w-4 h-4" />
                                                <span className="text-xs font-black uppercase tracking-tighter">{perm.label}</span>
                                            </div>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                    <strong className="text-slate-600">Nota:</strong> Estos permisos se aplican automáticamente a todos los <span className="capitalize">{rp.role}s</span>. Los permisos específicos definidos en el perfil de un usuario individual tienen prioridad sobre estos valores base.
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol Sistema</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Alta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {allProfiles.filter(p =>
                                p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                                                {(user.full_name || user.email)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{user.full_name || 'Sin nombre'}</p>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Perfil Activo</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-medium text-slate-600">{user.email}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${user.role === 'superadmin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        {user.confirmed_at ? (
                                            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-lg w-fit">
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">Confirmado</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-fit">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">Pendiente</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-sm text-slate-400">{new Date(user.created_at || '').toLocaleDateString()}</td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => {
                                                setEditingUser(user);
                                                setIsEditUserModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div >
            )}

            {/* Create Team Modal */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                        <div className="bg-white rounded-[3rem] p-10 w-full max-w-md relative z-10 shadow-2xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Plus className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Nuevo Equipo</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión Estructural</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del equipo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Marketing, Desarrollo..."
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>

                                <label className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer group hover:bg-white hover:border-indigo-200 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={autoAssignProjects}
                                        onChange={e => setAutoAssignProjects(e.target.checked)}
                                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">Asociar todos los proyectos</p>
                                        <p className="text-[10px] text-slate-400">Vincular {allProjects.length} proyectos actuales automáticamente.</p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button onClick={handleCreateTeam} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Crear Equipo</button>
                                <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create User Modal */}
            {
                isUserModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} />
                        <div className="bg-white rounded-[3rem] p-10 w-full max-w-md relative z-10 shadow-2xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><UserPlus className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Nuevo Colaborador</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Directorio Central</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del usuario"
                                        value={newUserData.full_name}
                                        onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email</label>
                                    <input
                                        type="email"
                                        placeholder="usuario@email.com"
                                        value={newUserData.email}
                                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button onClick={handleCreateUser} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Crear Perfil</button>
                                <button onClick={() => setIsUserModalOpen(false)} className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit User Modal */}
            {
                isEditUserModalOpen && editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditUserModalOpen(false)} />
                        <div className="bg-white rounded-[3rem] p-10 w-full max-w-md relative z-10 shadow-2xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Edit2 className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Editar Perfil</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{editingUser.email}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={editingUser.full_name || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Permisos de Acceso</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                                            { id: 'projects', label: 'Proyectos', icon: Layers },
                                            { id: 'tasks', label: 'Tareas', icon: CheckSquare },
                                            { id: 'ai', label: 'AI Assistant', icon: Sparkles },
                                            { id: 'whiteboards', label: 'Pizarras', icon: Palette },
                                            { id: 'history', label: 'Historial', icon: HistoryIcon },
                                            { id: 'docs', label: 'Docs', icon: BookOpen },
                                            { id: 'video_calls', label: 'Videollamadas', icon: Video },
                                            { id: 'settings', label: 'Configuración', icon: SettingsIcon },
                                            { id: 'teams', label: 'Equipos', icon: UsersIcon }
                                        ].map((perm) => {
                                            const isEnabled = editingUser.permissions?.[perm.id as keyof typeof editingUser.permissions] ?? false;
                                            return (
                                                <button
                                                    key={perm.id}
                                                    onClick={() => {
                                                        const newPerms = {
                                                            dashboard: true, projects: true, settings: false, teams: false,
                                                            ai: false, tasks: true, whiteboards: true, history: false, docs: false,
                                                            ...editingUser.permissions,
                                                            [perm.id]: !isEnabled
                                                        };
                                                        setEditingUser({ ...editingUser, permissions: newPerms });
                                                    }}
                                                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isEnabled
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                        : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                                                        }`}
                                                >
                                                    <perm.icon className="w-4 h-4" />
                                                    <span className="text-[11px] font-bold">{perm.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button onClick={handleUpdateUser} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Guardar Cambios</button>
                                <button onClick={() => setIsEditUserModalOpen(false)} className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TeamManagementView;
