import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Play, CheckCircle2, Circle, Paperclip, X, File as FileIcon, Mic, Square, Volume2, Pause, AlertTriangle, ShieldCheck } from "lucide-react";
import botIcon from "../../asserts/icon.png";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mermaid } from "./Mermaid";
import { AgenticLoader } from "./ui/AgenticLoader";
import { cn } from "../lib/utils";
import { apiClient } from "../services/apiClient";
import { storageService } from "../services/storageService";
import { useAuth } from "../hooks/useAuth";
import { ChatMessage, AccountPlan, ResearchProgress, ResearchTask } from "../types";

interface ChatInterfaceProps {
  selectedPlanId: string | null;
  onPlanCreated?: (planId: string) => void;
  onPlanUpdated?: () => void;
}

interface AttachedFile {
  id: string;
  filename: string;
}

function ResearchStepList({ progress, startTime }: { progress: ResearchProgress | null, startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!progress) {
    return (
      <div className="flex items-center gap-3 py-2">
        <AgenticLoader text="Initializing Research Agents..." />
        <span className="text-xs text-text-muted font-mono ml-auto">({formatTime(elapsed)})</span>
      </div>
    );
  }

  const tasks = progress.tasks || [];
  const currentStepIndex = progress.current_step - 1;

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex justify-between items-center text-xs text-text-muted border-b border-white/10 pb-2">
        <span className="font-medium">Researching...</span>
        <span className="font-mono">{formatTime(elapsed)}</span>
      </div>

      <div className="space-y-2">
        {tasks.map((task, idx) => {
          const taskName = typeof task === 'string' ? task : task.task;
          let status: 'pending' | 'current' | 'completed' = 'pending';

          if (idx < currentStepIndex) status = 'completed';
          else if (idx === currentStepIndex) status = 'current';

          return (
            <div key={idx} className="flex items-start gap-2.5 text-sm">
              <div className="mt-0.5 flex-shrink-0">
                {status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {status === 'current' && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {status === 'pending' && (
                  <Circle className="w-4 h-4 text-white/20" />
                )}
              </div>
              <span className={cn(
                "leading-tight transition-colors duration-300",
                status === 'completed' ? "text-text-muted" :
                  status === 'current' ? "text-primary font-medium" : "text-white/30"
              )}>
                {taskName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompletedResearch({ progress }: { progress: ResearchProgress }) {
  const tasks = progress.tasks || [];

  return (
    <div className="w-full max-w-md bg-surface border border-white/10 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-green-500">
          <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider">Research Completed</span>
        </div>
      </div>

      <div className="space-y-1.5 pl-1">
        {tasks.map((task, idx) => {
          const taskName = typeof task === 'string' ? task : task.task;
          return (
            <div key={idx} className="flex items-center gap-2 text-xs text-text-muted">
              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
              <span className="line-clamp-1">{taskName}</span>
            </div>
          )
        })}
      </div>
    </div>
  );
}

function ResearchPlanPreview({ plan, onStart }: { plan: ResearchTask[], onStart: () => void }) {
  return (
    <div className="w-full max-w-md bg-surface border border-white/10 rounded-lg shadow-sm overflow-hidden mt-2">
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
        <span className="text-xs font-semibold text-text uppercase tracking-wider">Deep Search Plan</span>
        <span className="text-xs text-text-muted">{plan.length} steps</span>
      </div>
      <div className="p-3 space-y-2">
        {plan.map((task, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm text-text">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {idx + 1}
            </span>
            <span className="leading-tight pt-0.5">{typeof task === 'string' ? task : task.task}</span>
          </div>
        ))}
      </div>
      <div className="bg-white/5 px-4 py-3 border-t border-white/10 flex gap-2">
        <button
          onClick={onStart}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
        >
          <Play className="w-4 h-4" />
          Start Deep Search
        </button>
      </div>
      <div className="px-4 pb-2 text-center">
        <span className="text-[10px] text-text-muted">Want changes? Just ask in chat (e.g. "Remove step 2")</span>
      </div>
    </div>
  );
}

export function ChatInterface({ selectedPlanId, onPlanCreated, onPlanUpdated }: ChatInterfaceProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState<ResearchProgress | null>(null);
  const [researchStartTime, setResearchStartTime] = useState<number>(0);
  const [proposedPlan, setProposedPlan] = useState<ResearchTask[] | null>(null);
  const [currentPlan, setCurrentPlan] = useState<AccountPlan | null>(null);
  const [tempConversationId, setTempConversationId] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [availableFiles, setAvailableFiles] = useState<AttachedFile[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandFilter, setSlashCommandFilter] = useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [viewingConflictsFor, setViewingConflictsFor] = useState<ResearchProgress | null>(null);

  const slashCommands = [
    { command: "/map", description: "Generate a visual map or mind map of research findings" },
    { command: "/tabulate", description: "Display research data in tabular format" },
  ];
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Cleanup speech synthesis on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      let finalTranscript = "";

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // We want to append to the existing input value, but only the new part.
        // This is tricky with React state updates in a callback.
        // A simpler approach for this demo: 
        // When recording starts, we capture the current input value?
        // Or we just append the *final* transcript to the input when it arrives.

        if (finalTranscript) {
          setInputValue(prev => {
            // To avoid appending the same final transcript multiple times if onresult fires often
            // We reset finalTranscript after appending?
            // Actually, let's just use the transcript directly.
            // But we need to know what was there before.
            // Let's just append to the end.
            return prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript;
          });
          finalTranscript = "";
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleSpeak = async (text: string, messageId: string) => {
    if (speakingMessageId === messageId) {
      if (isPaused) {
        if (audioRef.current) {
          audioRef.current.play();
        } else {
          window.speechSynthesis.resume();
        }
        setIsPaused(false);
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
        } else {
          window.speechSynthesis.pause();
        }
        setIsPaused(true);
      }
    } else {
      handleStopSpeak();
      
      setIsGeneratingAudio(messageId);
      
      // Try Deepgram first via backend
      const audioBlob = await apiClient.speakText(text);
      
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setSpeakingMessageId(null);
          setIsPaused(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
        
        audio.onpause = () => setIsPaused(true);
        audio.onplay = () => setIsPaused(false);
        
        try {
          await audio.play();
          setSpeakingMessageId(messageId);
        } catch (e) {
          console.error("Audio playback failed", e);
        }
        setIsGeneratingAudio(null);
      } else {
        // Fallback to browser TTS
        setIsGeneratingAudio(null);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
          setSpeakingMessageId(null);
          setIsPaused(false);
        };
        utterance.onpause = () => setIsPaused(true);
        utterance.onresume = () => setIsPaused(false);

        window.speechSynthesis.speak(utterance);
        setSpeakingMessageId(messageId);
        setIsPaused(false);
      }
    }
  };

  const handleStopSpeak = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    setIsPaused(false);
    setIsGeneratingAudio(null);
  };

  useEffect(() => {
    if (selectedPlanId && currentUser) {
      const plans = storageService.getPlansForUser(currentUser.id);
      const plan = plans.find((p) => p.id === selectedPlanId);
      setCurrentPlan(plan || null);
      setTempConversationId(""); // Clear temp ID when a plan is selected

      // Load chat history from backend
      apiClient.getChatHistory(selectedPlanId).then((data) => {
        if (data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // Fallback if no history found on backend (e.g. server restart)
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Hello! I'm ResearchFlow. ${plan ? `We are working on **${plan.company}** (v${plan.version}).` : "Start by asking me to create a new research project."}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setAvailableFiles(data.attachedFiles || []);
      });
    } else {
      setCurrentPlan(null);
      setAvailableFiles([]);
      // Generate a new temp conversation ID for this "New Plan" session
      // This ensures the backend creates a fresh session instead of reusing the user's default one
      setTempConversationId(`new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      setMessages([
        {
          id: "welcome-new",
          role: "assistant",
          content: "Hello! I'm ResearchFlow. I can help you research companies and build comprehensive research projects. What company would you like to start with?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [selectedPlanId, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isResearching, researchProgress, proposedPlan]);

  const handleSendMessage = async (overrideMessage?: string, isHidden: boolean = false) => {
    const messageContent = overrideMessage || inputValue;
    if (!messageContent.trim() || !currentUser) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    const currentAttachedFiles = [...attachedFiles];

    if (!isHidden) {
      // Optimistic update
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setAttachedFiles([]); // Clear attached files
      setResearchProgress(null);
      setProposedPlan(null); // Clear previous proposal if any
      setResearchStartTime(Date.now());
    }

    setIsResearching(true);

    // Ensure we have a conversation ID if we are in "New Plan" mode
    // This prevents the race condition where tempConversationId might be empty on first render
    let activeConversationId = tempConversationId;
    if (!selectedPlanId && !activeConversationId) {
      activeConversationId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setTempConversationId(activeConversationId);
    }

    try {
      const response = await apiClient.sendChatMessage({
        userId: currentUser.id,
        planId: selectedPlanId,
        message: userMessage.content,
        conversationId: selectedPlanId ? undefined : activeConversationId,
        fileIds: currentAttachedFiles.map(f => f.id),
      });

      // Update messages with the full history returned from backend
      // This ensures we are in sync with the server state
      if (response.assistantMessages && response.assistantMessages.length > 0) {
        setMessages(response.assistantMessages);
      }

      // Update Plan if changed
      if (response.updatedPlan) {
        setCurrentPlan(response.updatedPlan);
        storageService.savePlan(response.updatedPlan);

        // Notify parent to refresh other components
        if (onPlanUpdated) {
          onPlanUpdated();
        }

        // If this was a new plan (we didn't have a selectedPlanId), we might want to select it
        if (!selectedPlanId && response.updatedPlan.id) {
          if (onPlanCreated) {
            onPlanCreated(response.updatedPlan.id);
          } else {
            // Fallback if prop not provided
            window.location.reload();
          }
        }
      }

      setIsResearching(response.researchStatus === "researching");
      if (response.progress) {
        setResearchProgress(response.progress);
      }

      // If research just finished (was researching, now idle/done), append completion marker
      // We detect this if we were researching, and the response status is NOT researching
      if (isResearching && response.researchStatus !== "researching" && researchProgress) {
        // Append the completion state to the LAST assistant message
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.role === "assistant") {
            lastMsg.researchProgress = researchProgress;
          }
          return newMsgs;
        });
      }

      if (response.researchPlan) {
        setProposedPlan(response.researchPlan);
      }

      // Auto-continue if researching
      if (response.researchStatus === "researching") {
        setTimeout(() => handleSendMessage("[CONTINUE_RESEARCH]", true), 100);
      } else {
        // If not researching, trigger update to refresh sidebar files
        if (onPlanUpdated) onPlanUpdated();
      }

    } catch (error) {
      console.error("Error sending message:", error);
      setIsResearching(false);
      setResearchProgress(null);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please ensure the backend is running.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle slash command autocomplete navigation
    if (showSlashCommands) {
      const filteredCommands = slashCommands.filter(cmd =>
        cmd.command.toLowerCase().includes(slashCommandFilter.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredCommands[selectedCommandIndex]) {
          handleSlashCommandSelect(filteredCommands[selectedCommandIndex].command);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashCommands(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mentionQuery === null) {
        handleSendMessage();
      }
    }
  };

  const handleSlashCommandSelect = (command: string) => {
    const textBeforeCursor = inputValue.substring(0, textareaRef.current?.selectionStart || 0);
    const lastSlash = textBeforeCursor.lastIndexOf('/');
    const before = inputValue.substring(0, lastSlash);
    const after = inputValue.substring(textareaRef.current?.selectionStart || 0);

    setInputValue(`${before}${command} ${after}`);
    setShowSlashCommands(false);
    setSlashCommandFilter("");

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPosition = before.length + command.length + 1;
      textareaRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Detect slash commands
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const lastSlash = textBeforeCursor.lastIndexOf('/');

    if (lastSlash !== -1 && (lastSlash === 0 || textBeforeCursor[lastSlash - 1] === ' ' || textBeforeCursor[lastSlash - 1] === '\n')) {
      const commandText = textBeforeCursor.substring(lastSlash + 1);
      if (!commandText.includes(' ') && !commandText.includes('\n')) {
        setSlashCommandFilter(commandText);
        setShowSlashCommands(true);
        setSelectedCommandIndex(0);
        return;
      }
    }

    // Also check for @ mentions (existing functionality)
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      if (cursor > lastAt) {
        const query = val.substring(lastAt + 1, cursor);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionIndex(lastAt);
          setShowSlashCommands(false);
          return;
        }
      }
    }

    setMentionQuery(null);
    setMentionIndex(-1);
    setShowSlashCommands(false);
  };

  const handleMentionSelect = (file: AttachedFile) => {
    if (mentionIndex === -1) return;

    const fname = file.filename || (file as any).name || "file";
    const before = inputValue.substring(0, mentionIndex);
    const after = inputValue.substring(mentionIndex + (mentionQuery?.length || 0) + 1);

    setInputValue(`${before}@${fname} ${after}`);
    setMentionQuery(null);
    setMentionIndex(-1);

    // Add to attached files if not present
    if (!attachedFiles.find(f => f.id === file.id)) {
      setAttachedFiles(prev => [...prev, file]);
    }

    textareaRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await apiClient.uploadFile(file);
        setAttachedFiles((prev) => [...prev, { id: result.id, filename: result.filename }]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      // You might want to show a toast here
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header Context */}
      {currentPlan && (
        <div className="border-b border-white/10 bg-surface px-4 py-2 text-xs text-text-muted">
          {/* Working on: <span className="font-semibold text-gray-700">{currentPlan.company}</span> (v{currentPlan.version}) */}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => {
          // Filter out auto-generated control messages
          if (msg.role === "user" && msg.content.trim() === "[CONTINUE_RESEARCH]") {
            return null;
          }

          // Check if assistant message is empty and has no attachments
          const isLastMessage = messages.indexOf(msg) === messages.length - 1;
          const hasAttachments = msg.researchProgress || (proposedPlan && isLastMessage);
          const isEmptyAssistant = msg.role === "assistant" && !msg.content.trim();

          if (isEmptyAssistant && !hasAttachments) {
            return null;
          }

          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-full gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 overflow-hidden">
                  <img src={botIcon} alt="Bot" className="h-5 w-5 object-contain" />
                </div>
              )}

              <div className="flex flex-col gap-2 max-w-[80%]">
                {/* Only render text bubble if there is content */}
                {msg.content.trim() && (
                  <div className="group relative">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm",
                        msg.role === "user"
                          ? "bg-primary text-white"
                          : "bg-surface border border-white/10 text-text"
                      )}
                    >
                      {msg.isResearching ? (
                        <div className="mb-3">
                          <AgenticLoader text="Deep Research in Progress..." />
                        </div>
                      ) : null}

                      <div className={cn("prose prose-sm max-w-none dark:prose-invert", msg.role === "user" ? "prose-invert" : "text-text")}>
                        <Markdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code(props) {
                              const {children, className, node, ...rest} = props
                              const match = /language-(\w+)/.exec(className || '')
                              if (match && match[1] === 'mermaid') {
                                return <Mermaid chart={String(children).replace(/\n$/, '')} />
                              }
                              return (
                                <code {...rest} className={className}>
                                  {children}
                                </code>
                              )
                            },
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse border border-white/20" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => (
                              <thead className="bg-primary/10" {...props} />
                            ),
                            tbody: ({ node, ...props }) => (
                              <tbody className="divide-y divide-white/10" {...props} />
                            ),
                            tr: ({ node, ...props }) => (
                              <tr className="hover:bg-white/5" {...props} />
                            ),
                            th: ({ node, ...props }) => (
                              <th className="px-4 py-2 text-left text-xs font-semibold text-primary uppercase tracking-wider border border-white/20" {...props} />
                            ),
                            td: ({ node, ...props }) => (
                              <td className="px-4 py-2 text-sm text-text border border-white/20" {...props} />
                            ),
                          }}
                        >
                          {msg.content}
                        </Markdown>
                      </div>
                    </div>

                    {/* TTS Controls */}
                    {msg.role === "assistant" && !msg.isResearching && (
                      <div className={cn(
                        "absolute -bottom-6 left-0 flex items-center gap-1 transition-opacity",
                        speakingMessageId === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        {speakingMessageId === msg.id ? (
                          <>
                            <button
                              onClick={() => handleSpeak(msg.content, msg.id)}
                              className="p-1 text-text-muted hover:text-primary rounded hover:bg-white/5"
                              title={isPaused ? "Resume" : "Pause"}
                            >
                              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={handleStopSpeak}
                              className="p-1 text-text-muted hover:text-red-400 rounded hover:bg-white/5"
                              title="Stop"
                            >
                              <Square className="w-3 h-3 fill-current" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSpeak(msg.content, msg.id)}
                              className="p-1 text-text-muted hover:text-primary rounded hover:bg-white/5"
                              title="Read aloud"
                              disabled={isGeneratingAudio === msg.id}
                            >
                              {isGeneratingAudio === msg.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Volume2 className="w-3 h-3" />
                              )}
                            </button>
                            {isGeneratingAudio === msg.id && (
                              <span className="text-[10px] text-text-muted animate-pulse">(Hold on)</span>
                            )}
                          </div>
                        )}

                        {/* Conflict Indicator */}
                        {msg.researchProgress && (
                          <>
                            {msg.researchProgress.conflicts && msg.researchProgress.conflicts.length > 0 ? (
                              <button
                                onClick={() => setViewingConflictsFor(msg.researchProgress!)}
                                className="p-1 text-yellow-500 hover:bg-yellow-500/10 rounded transition-colors"
                                title="View Conflicts"
                              >
                                <AlertTriangle className="w-3 h-3" />
                              </button>
                            ) : (
                              <div
                                className="p-1 text-green-500/50 cursor-help"
                                title="No noticeable conflicts found in the data"
                              >
                                <ShieldCheck className="w-3 h-3" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Render Proposed Plan if this is the last message and we have one */}
                {msg.role === "assistant" && proposedPlan && isLastMessage && (
                  <ResearchPlanPreview
                    plan={proposedPlan}
                    onStart={() => handleSendMessage("Start deep search")}
                  />
                )}

                {/* Render Completed Research if attached to message */}
                {msg.researchProgress && (
                  <CompletedResearch progress={msg.researchProgress} />
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-text-muted border border-white/10">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          );
        })}

        {isResearching && (
          <div className="flex w-full gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 overflow-hidden">
              <img src={botIcon} alt="Bot" className="h-5 w-5 object-contain" />
            </div>
            <div className="bg-surface border border-white/10 rounded-2xl px-4 py-3 text-sm shadow-sm flex items-center gap-3 w-full max-w-md">
              <ResearchStepList progress={researchProgress} startTime={researchStartTime} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Conflicts Modal */}
      {viewingConflictsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">Data Conflicts Detected</h3>
              </div>
              <button 
                onClick={() => setViewingConflictsFor(null)}
                className="p-1 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-text-muted mb-4">
                The research agent found conflicting information from different sources. Please review these discrepancies:
              </p>
              <div className="space-y-3">
                {viewingConflictsFor.conflicts?.map((conflict, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-text leading-relaxed">{conflict}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 bg-white/5 border-t border-white/10 text-right">
              <button 
                onClick={() => setViewingConflictsFor(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className="border-t border-white/10 bg-surface p-4 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-2 bg-white/5 rounded-md px-2 py-1 text-xs text-text border border-white/10">
                <FileIcon className="w-3 h-3 text-text-muted" />
                <span className="max-w-[150px] truncate">{file.filename}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-text-muted hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mention Suggestions */}
        {mentionQuery !== null && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden z-20">
            {(() => {
              // Combine available files and currently attached files, deduplicated
              const allFiles = [...availableFiles];
              attachedFiles.forEach(f => {
                if (!allFiles.find(af => af.id === f.id)) {
                  allFiles.push(f);
                }
              });

              const filtered = allFiles.filter(f => {
                const fname = f.filename || (f as any).name || "";
                return fname.toLowerCase().includes((mentionQuery || "").toLowerCase());
              });

              if (filtered.length === 0) return null;

              return filtered.map(f => (
                <button
                  key={f.id}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm flex items-center gap-2 text-text"
                  onClick={() => handleMentionSelect(f)}
                >
                  <FileIcon className="w-3 h-3 text-primary" />
                  <span className="truncate">{f.filename || (f as any).name}</span>
                </button>
              ));
            })()}
          </div>
        )}

        <div className="relative flex items-end gap-2 rounded-xl border border-white/10 bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary transition-all duration-200">
          {/* Slash Command Autocomplete */}
          {showSlashCommands && (() => {
            const filteredCommands = slashCommands.filter(cmd =>
              cmd.command.toLowerCase().includes(slashCommandFilter.toLowerCase())
            );

            if (filteredCommands.length === 0) return null;

            return (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-primary/30 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md z-50">
                {filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.command}
                    onClick={() => handleSlashCommandSelect(cmd.command)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors flex flex-col",
                      idx === selectedCommandIndex
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "hover:bg-white/5 border-l-2 border-l-transparent"
                    )}
                  >
                    <span className="font-mono text-primary font-semibold">{cmd.command}</span>
                    <span className="text-xs text-text-muted mt-1">{cmd.description}</span>
                  </button>
                ))}
                <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-[10px] text-text-muted text-center">
                  Use ↑↓ to navigate • Enter to select • Esc to dismiss
                </div>
              </div>
            );
          })()}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to research a company or update the plan..."
            className="flex-1 resize-none border-0 bg-transparent p-2 text-sm focus:ring-0 max-h-32 text-text placeholder:text-text-muted"
            rows={1}
            style={{ minHeight: "44px" }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isResearching}
            className="mb-1 rounded-lg p-2 text-text-muted hover:bg-white/5 hover:text-text transition-colors disabled:opacity-50"
            title="Attach files"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>

          <button
            onClick={toggleRecording}
            disabled={isUploading || isResearching}
            className={cn(
              "mb-1 rounded-lg p-2 transition-colors disabled:opacity-50",
              isRecording
                ? "text-red-400 bg-red-500/10 hover:bg-red-500/20 animate-pulse"
                : "text-text-muted hover:bg-white/5 hover:text-text"
            )}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
          </button>

          <button
            onClick={() => handleSendMessage()}
            disabled={(!inputValue.trim() && attachedFiles.length === 0) || isResearching || isUploading}
            className="mb-1 rounded-lg bg-primary p-2 text-white hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 text-center text-xs text-text-muted">
          AI can make mistakes. Review generated plans carefully.
        </div>
      </div>
    </div>
  );
}
