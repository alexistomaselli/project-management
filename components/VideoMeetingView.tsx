import React, { useEffect } from 'react';
import { Video, Loader2, Info } from 'lucide-react';
import { Profile, Team } from '../types';

interface VideoMeetingViewProps {
    profile: Profile | null;
    userTeam: Team | null;
}

const VideoMeetingView: React.FC<VideoMeetingViewProps> = ({ profile, userTeam }) => {
    const roomName = userTeam
        ? `Dydialabs-${userTeam.id.split('-')[0]}`
        : `Dydialabs-Lobby-${profile?.id.split('-')[0]}`;

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="space-y-8 animate-fadeIn h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Video className="w-8 h-8 text-indigo-600" />
                        Sala de Videollamadas
                    </h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Conexión segura y gratuita vía Jitsi Meet
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-[600px] bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 relative group">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none z-0">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500/20" />
                    <p className="font-bold text-sm tracking-widest opacity-20 uppercase">Iniciando Sala Segura...</p>
                </div>

                <iframe
                    src={`https://meet.jit.si/${roomName}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","fullscreen","frameratesetting","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`}
                    allow="camera; microphone; display-capture; autoplay; clipboard-write"
                    className="w-full h-full relative z-10 border-none"
                    title="Jitsi Meet Video Content"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                        <Info className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1">Privacidad Total</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Las llamadas están encriptadas y no se almacenan datos en nuestros servidores.</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shrink-0">
                        <Video className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1">Multiusuario</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Invita a todo tu equipo. No hay límite de participantes en la plataforma.</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shrink-0">
                        <Loader2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1">Sin Instalación</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Funciona directamente en el navegador sin necesidad de descargar nada.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoMeetingView;
