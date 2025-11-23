import { useEffect, useState, useRef } from "react";
import { Plus, FileText, MoreVertical, Trash2, Copy, AlertTriangle, X } from "lucide-react";
import { cn } from "../lib/utils";
import { storageService } from "../services/storageService";
import { useAuth } from "../hooks/useAuth";
import { AccountPlan } from "../types";

interface SidebarProps {
  isOpen: boolean;
  selectedPlanId: string | null;
  onSelectPlan: (id: string | null) => void;
  refreshTrigger?: number;
}

export function Sidebar({ isOpen, selectedPlanId, onSelectPlan }: SidebarProps) {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState<AccountPlan[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      setPlans(storageService.getPlansForUser(currentUser.id));
    }
  }, [currentUser, selectedPlanId]); // Refresh when selection changes (e.g. after duplicate)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, planId: string, planName: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setPlanToDelete({ id: planId, name: planName });
  };

  const confirmDelete = () => {
    if (planToDelete) {
      storageService.deletePlan(planToDelete.id);
      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
      if (selectedPlanId === planToDelete.id) {
        onSelectPlan(null);
      }
      setPlanToDelete(null);
    }
  };

  const handleDuplicate = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    setActiveMenuId(null);

    const newPlan = storageService.duplicatePlan(planId);
    if (newPlan && currentUser) {
      setPlans(storageService.getPlansForUser(currentUser.id));
      // Optionally select the new plan
      // onSelectPlan(newPlan.id); 
    }
  };

  const toggleMenu = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === planId ? null : planId);
  };

  if (!isOpen) return null;

  return (
    <>
      <aside className="flex w-64 flex-col border-r border-white/10 bg-surface transition-all duration-300 ease-in-out relative">
        <div className="p-4">
          <button
            onClick={() => onSelectPlan(null)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="mb-6">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              My Research Projects
            </h3>
            <div className="space-y-1 pb-20">
              {plans.length === 0 ? (
                <p className="px-2 text-sm text-text-muted italic">No plans yet</p>
              ) : (
                plans.map((plan) => (
                  <div key={plan.id} className="relative group">
                    <button
                      onClick={() => onSelectPlan(plan.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors pr-8",
                        selectedPlanId === plan.id
                          ? "bg-white/10 text-primary"
                          : "text-text hover:bg-white/5"
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <div className="flex-1 truncate">
                        <div className="font-medium truncate">{plan.title || plan.company}</div>
                        <div className="text-xs text-text-muted">v{plan.version} • {new Date(plan.updatedAt).toLocaleDateString()}</div>
                      </div>
                      {/* {selectedPlanId === plan.id && <ChevronRight className="h-4 w-4 opacity-50" />} */}
                    </button>

                    {/* Three dots menu button */}
                    <button
                      onClick={(e) => toggleMenu(e, plan.id)}
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-muted hover:text-text hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity",
                        activeMenuId === plan.id && "opacity-100 bg-white/10 text-text"
                      )}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === plan.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-white/10 bg-surface shadow-xl z-50 py-1"
                      >
                        <button
                          onClick={(e) => handleDuplicate(e, plan.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text hover:bg-white/5"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, plan.id, plan.title || plan.company)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-surface border border-white/10 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 text-red-500">
                <div className="rounded-full bg-red-500/10 p-2">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Research Project</h3>
              </div>
              <button
                onClick={() => setPlanToDelete(null)}
                className="text-text-muted hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-text-muted">
                Are you sure you want to delete the account plan for <span className="font-semibold text-white">{planToDelete.name}</span>?
              </p>
              <p className="mt-2 text-sm text-text-muted">
                This action cannot be undone. All research data and chat history associated with this plan will be permanently removed.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPlanToDelete(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-text hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface"
              >
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
