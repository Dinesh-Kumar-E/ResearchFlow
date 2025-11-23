import { useState, useRef, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { ChatInterface } from "../components/ChatInterface";
import { ArtifactCanvas } from "../components/ArtifactCanvas";
import { useAuth } from "../hooks/useAuth";
import { User as UserIcon, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Logo from "../components/Logo";

export default function AppLayout() {
  const { currentUser, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planVersion, setPlanVersion] = useState(0);

  // Resizable panels state
  const [chatWidthPercent, setChatWidthPercent] = useState(50); // Default 50%
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handlePlanUpdate = () => {
    setPlanVersion((v) => v + 1);
  };

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const newPercent = (newWidth / containerRect.width) * 100;

      // Clamp between 20% and 80%
      if (newPercent >= 20 && newPercent <= 80) {
        setChatWidthPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden text-text">
      {/* Top Navbar */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-surface px-4 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-md p-2 hover:bg-white/5 text-text-muted hover:text-text transition-colors"
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h1 className="text-lg font-semibold text-white tracking-tight">ResearchFlow</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/10">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Avatar" className="h-6 w-6 rounded-full" />
            ) : (
              <UserIcon className="h-5 w-5 text-text-muted" />
            )}
            <span className="text-sm font-medium text-text">{currentUser?.name}</span>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-2 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-white/10 bg-surface`}>
          <Sidebar
            isOpen={true} // Always render internal content, hide via container width
            onSelectPlan={setSelectedPlanId}
            selectedPlanId={selectedPlanId}
            refreshTrigger={planVersion}
          />
        </div>

        {/* Resizable Area */}
        <div ref={containerRef} className="flex flex-1 min-w-0 relative">
          {/* Center Chat */}
          <main
            style={{ width: `${chatWidthPercent}%` }}
            className="flex flex-col border-r border-white/10 bg-background min-w-[300px]"
          >
            <ChatInterface
              selectedPlanId={selectedPlanId}
              onPlanCreated={(newId: string) => setSelectedPlanId(newId)}
              onPlanUpdated={handlePlanUpdate}
            />
          </main>

          {/* Drag Handle */}
          <div
            className="w-1 cursor-col-resize hover:bg-primary active:bg-primary-dark transition-colors bg-white/5 z-20 flex items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <div className="h-8 w-0.5 bg-white/20 rounded-full" />
          </div>

          {/* Right Canvas */}
          <aside className="flex-1 flex-col overflow-y-auto bg-surface/50 xl:flex min-w-[300px]">
            <ArtifactCanvas planId={selectedPlanId} refreshTrigger={planVersion} />
          </aside>
        </div>
      </div>
    </div>
  );
}
