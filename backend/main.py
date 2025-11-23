import uuid
import json
import shutil
import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage
from datetime import datetime
from typing import Dict, List
import httpx
from dotenv import load_dotenv

# Load env vars
load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

from graph_app import app as lg_app
from state import AgentState
from models import ChatRequest, ChatResponse, AccountPlan
from llm_clients import api_key
from openai import OpenAI

client = OpenAI(api_key=api_key)

api = FastAPI()

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# naive in-memory session store for demo
SESSIONS: Dict[str, AgentState] = {}
SESSION_FILE = "sessions.json"

def load_sessions():
    global SESSIONS
    try:
        if os.path.exists(SESSION_FILE):
            with open(SESSION_FILE, "r") as f:
                data = json.load(f)
                # Reconstruct AgentState objects
                for k, v in data.items():
                    # Reconstruct messages
                    if "messages" in v:
                        msgs = []
                        for m in v["messages"]:
                            if m["type"] == "human":
                                msgs.append(HumanMessage(content=m["content"]))
                            elif m["type"] == "ai":
                                msgs.append(AIMessage(content=m["content"]))
                        v["messages"] = msgs
                    
                    # Reconstruct Plan
                    if "plan" in v and v["plan"]:
                        v["plan"] = AccountPlan(**v["plan"])
                        
                    SESSIONS[k] = v
            print(f"Loaded {len(SESSIONS)} sessions from disk.")
    except Exception as e:
        print(f"Error loading sessions: {e}")

def save_sessions():
    try:
        serializable_sessions = {}
        for k, v in SESSIONS.items():
            state_copy = v.copy()
            # Serialize messages
            if "messages" in state_copy:
                serialized_msgs = []
                for m in state_copy["messages"]:
                    serialized_msgs.append({"type": m.type, "content": m.content})
                state_copy["messages"] = serialized_msgs
            
            # Serialize Plan
            if "plan" in state_copy and state_copy["plan"]:
                state_copy["plan"] = state_copy["plan"].model_dump()
                
            serializable_sessions[k] = state_copy
            
        with open(SESSION_FILE, "w") as f:
            json.dump(serializable_sessions, f, indent=2)
    except Exception as e:
        print(f"Error saving sessions: {e}")

# Load sessions on startup
import os
from langchain_core.messages import AIMessage
load_sessions()

def get_clean_content(msg_content: str) -> str:
    """Extracts the 'reply' field from JSON output if present, otherwise returns raw text."""
    try:
        # Try parsing as JSON directly
        data = json.loads(msg_content)
        if isinstance(data, dict) and "reply" in data:
            return data["reply"]
    except:
        pass
    
    # Try finding JSON block if direct parse fails (e.g. markdown)
    try:
        start = msg_content.find('{')
        end = msg_content.rfind('}')
        if start != -1 and end != -1:
            json_raw = msg_content[start:end+1]
            data = json.loads(json_raw)
            if isinstance(data, dict) and "reply" in data:
                return data["reply"]
    except:
        pass

    return msg_content

def new_account_plan(user_id: str, company: str, goal: str) -> AccountPlan:
    now = datetime.utcnow().isoformat()
    return AccountPlan(
        id=str(uuid.uuid4()),
        userId=user_id,
        company=company,
        goal=goal,
        title=None,
        createdAt=now,
        updatedAt=now,
        version=1,
        sections=[],
    )

@api.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # conversation/session id: for now use planId or user-based
    # If conversationId is provided (even if "new-..."), use it.
    # If planId is provided, use it.
    # Fallback to user-based session ONLY if neither is present (legacy/default).
    session_id = req.conversationId or req.planId or f"session-{req.userId}"
    
    print(f"DEBUG: Chat Request - Session ID: {session_id} (PlanID: {req.planId}, ConvID: {req.conversationId})")

    state = SESSIONS.get(session_id, AgentState())
    state["user_id"] = req.userId
    state.setdefault("messages", [])

    # Ensure there is a plan in state; later you can create explicitly on "New Plan"
    if "plan" not in state or state["plan"] is None:
        # naive: infer company & goal from first message later with GPT;
        # for now, make empty placeholders:
        state["plan"] = new_account_plan(req.userId, company="", goal="")

    # append user message
    state["messages"].append(HumanMessage(content=req.message))

    # Clear previous research result to ensure we don't use stale data
    state["research_result"] = None
    
    # Update attached files if provided
    if req.fileIds:
        current_files = state.get("attached_files", [])
        new_files_to_add_to_state = []
        file_contents = []
        
        for fid in req.fileIds:
            # We want to inject content for ALL files sent in this request, 
            # whether they are new or existing (re-mentioned).
            
            existing_file = next((f for f in current_files if f["id"] == fid), None)
            
            try:
                if existing_file:
                    filename = existing_file.get("filename") or existing_file.get("name")
                    # Fetch content again to ensure it's in the immediate context
                    content_resp = client.files.content(fid)
                    file_text = content_resp.text
                    file_contents.append(f"File: {filename}\nContent:\n{file_text}\n---")
                else:
                    # New file - fetch metadata and content
                    f_info = client.files.retrieve(fid)
                    filename = f_info.filename
                    new_files_to_add_to_state.append({"id": fid, "filename": filename})
                    
                    content_resp = client.files.content(fid)
                    file_text = content_resp.text
                    file_contents.append(f"File: {filename}\nContent:\n{file_text}\n---")
            except Exception as e:
                print(f"DEBUG: Could not retrieve content for file {fid}: {e}")
        
        if new_files_to_add_to_state:
            state["attached_files"] = current_files + new_files_to_add_to_state
        
        # Append file contents to the user message so the LLM can see it
        if file_contents:
            combined_content = "\n\n".join(file_contents)
            # We modify the last message (which is the user message we just appended)
            last_msg = state["messages"][-1]
            if isinstance(last_msg, HumanMessage):
                last_msg.content += f"\n\n[Attached Files Content]\n{combined_content}"

    # Reset loop control flags
    state["steps_in_current_turn"] = 0
    state["continue_after_pause"] = False

    # run graph (conversation -> maybe research -> conversation)
    new_state = await lg_app.ainvoke(state)

    # store session
    SESSIONS[session_id] = new_state
    
    # If a plan exists, also store the session under the plan ID
    # This ensures that if the frontend switches to using planId, the history is preserved
    plan = new_state.get("plan")
    if plan and plan.id:
        SESSIONS[plan.id] = new_state

    # Persist to disk
    save_sessions()

    messages = new_state.get("messages", [])
    # last assistant message:
    last_ai = [m for m in messages if m.type == "ai"]
    if not last_ai:
        # Fallback if something went wrong
        reply = "I'm sorry, I couldn't generate a response."
    else:
        reply = get_clean_content(last_ai[-1].content)

    plan = new_state.get("plan")
    if plan:
        print(f"DEBUG: Returning plan version {plan.version} to frontend.")
    
    # Determine research status
    need_research = new_state.get("need_research", False)
    last_action = new_state.get("last_action", "NONE")
    continue_after_pause = new_state.get("continue_after_pause", False)
    
    if need_research or continue_after_pause:
        research_status = "researching"
    elif last_action == "CALL_RESEARCH":
        # If we just came back from research (or decided to call it but loop finished),
        # but need_research is False, it means research is done.
        research_status = "done"
    else:
        research_status = "idle"

    new_version_created = new_state.get("new_version_created", False)

    # Construct progress object
    progress = None
    research_plan = new_state.get("research_plan")
    research_plan_approved = new_state.get("research_plan_approved", False)
    research_result = new_state.get("research_result")
    
    # Only show progress if we are executing
    if research_plan and new_state.get("research_mode") == "multi" and research_plan_approved:
        current_idx = new_state.get("current_task_index", 0)
        total = len(research_plan)
        
        # Determine label
        label = "Researching..."
        if current_idx < total:
            task = research_plan[current_idx]
            task_desc = task.get("task") if isinstance(task, dict) else str(task)
            label = f"Step {current_idx + 1}/{total}: {task_desc}"
        else:
            label = "Synthesizing results..."
            
        progress = {
            "current_step": current_idx + 1,
            "total_steps": total,
            "label": label,
            "visual": "progress_bar",
            "tasks": research_plan,
            "conflicts": research_result.get("conflicts", []) if research_result else []
        }
    elif new_state.get("research_mode") == "single" and research_result:
        # Single step research completion
        progress = {
            "current_step": 1,
            "total_steps": 1,
            "label": "Research Complete",
            "visual": "check",
            "tasks": [research_result.get("query", "Research Task")],
            "conflicts": research_result.get("conflicts", [])
        }

    # Prepare messages for frontend (clean JSON from AI messages)
    frontend_messages = []
    for m in messages:
        content = m.content
        if m.type == "ai":
            content = get_clean_content(content)
        frontend_messages.append({"role": m.type, "content": content})

    # Pass proposed plan if it exists but is NOT approved yet
    proposed_plan = None
    if research_plan and not research_plan_approved:
        proposed_plan = research_plan

    attached_files = new_state.get("attached_files", [])

    resp = ChatResponse(
        reply=reply,
        plan=plan,
        messages=frontend_messages,
        researchStatus=research_status,
        newVersionCreated=new_version_created,
        progress=progress,
        researchPlan=proposed_plan,
        attachedFiles=attached_files
    )
    return resp

@api.put("/api/plans/{plan_id}")
async def update_plan(plan_id: str, plan_data: AccountPlan):
    # Find session associated with this plan
    session_state = SESSIONS.get(plan_id)
    if not session_state:
        # Try finding by iterating (slow but safe)
        for k, v in SESSIONS.items():
            if v.get("plan") and v["plan"].id == plan_id:
                session_state = v
                break
    
    if not session_state:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    # Update the plan in the state
    # We assume the frontend sends the FULL updated plan
    # We should probably bump version here if not already bumped by frontend
    
    current_plan = session_state["plan"]
    
    # If version matches, we just update content. If frontend bumped it, we accept it.
    # But to be safe and maintain history, we should snapshot the OLD plan before overwriting.
    
    # Snapshot current state to history of the NEW plan object (or append to current history)
    # Actually, the incoming plan_data might not have the history populated if frontend doesn't track it.
    # So we should take history from current_plan and append current_plan snapshot.
    
    snapshot = current_plan.model_dump()
    # Remove history from snapshot to avoid infinite recursion/bloat
    if "history" in snapshot:
        del snapshot["history"]
        
    # Update history
    new_history = current_plan.history + [snapshot]
    
    # Apply updates
    plan_data.history = new_history
    # Ensure version is bumped if content changed
    if plan_data.version <= current_plan.version:
        plan_data.version = current_plan.version + 1
        plan_data.updatedAt = datetime.utcnow().isoformat()
        
    session_state["plan"] = plan_data
    save_sessions()
    
    return {"status": "success", "plan": plan_data}

@api.get("/api/history/{session_id}")
async def get_history(session_id: str):
    state = SESSIONS.get(session_id)
    if not state:
        return {"messages": [], "attachedFiles": []}
    
    messages = state.get("messages", [])
    frontend_messages = []
    for m in messages:
        content = m.content
        if m.type == "ai":
            content = get_clean_content(content)
        frontend_messages.append({"role": m.type, "content": content})
        
    return {
        "messages": frontend_messages,
        "attachedFiles": state.get("attached_files", [])
    }

@api.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Save locally first
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Upload to OpenAI
        with open(file_path, "rb") as f:
            response = client.files.create(
                file=f,
                purpose="assistants"
            )
            
        # Clean up local file
        os.remove(file_path)
        
        return {"id": response.id, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class TTSRequest(BaseModel):
    text: str

@api.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    if not DEEPGRAM_API_KEY:
        raise HTTPException(status_code=501, detail="Deepgram API key not configured")
        
    url = "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en"
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"text": req.text}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return Response(content=response.content, media_type="audio/mpeg")
        except Exception as e:
            print(f"Deepgram TTS error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
