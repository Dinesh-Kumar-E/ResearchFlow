import { cn } from "../../lib/utils";

export function AgenticLoader({ className, text = "Orchestrating Agents..." }: { className?: string, text?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 flex-shrink-0">
        {/* Central Hub */}
        <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-primary rounded-full z-10 shadow-[0_0_10px_currentColor] animate-pulse" />
        
        {/* Outer Ring */}
        <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_8s_linear_infinite]" />
        
        {/* Orbiting Nodes & Connections */}
        <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
           {/* Node 1 */}
           <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_5px_currentColor]" />
           {/* Node 2 */}
           <div className="absolute bottom-2 right-1 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_5px_currentColor]" />
           {/* Node 3 */}
           <div className="absolute bottom-2 left-1 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_currentColor]" />
           
           {/* Connecting Lines */}
           <svg className="absolute inset-0 w-full h-full text-primary/40" viewBox="0 0 40 40">
              <line x1="20" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="1" />
              <line x1="20" y1="20" x2="34" y2="32" stroke="currentColor" strokeWidth="1" />
              <line x1="20" y1="20" x2="6" y2="32" stroke="currentColor" strokeWidth="1" />
           </svg>
        </div>
      </div>
      
      <div className="flex flex-col justify-center">
        <span className="text-xs font-medium text-primary animate-pulse">{text}</span>
        <span className="text-[10px] text-white/50">Distributing tasks to research nodes...</span>
      </div>
    </div>
  );
}
