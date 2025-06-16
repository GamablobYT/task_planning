from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import aiohttp
import asyncio
import json
from dotenv import load_dotenv
import os
from google import genai
from google.genai import types
import uuid
from collections import deque

load_dotenv()

app = Flask(__name__)
# Update CORS to allow both localhost:5174 and standard React development port
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000", "http://localhost:5174", "http://127.0.0.1:5174"])

supported_models = ["deepseek-ai/DeepSeek-R1", "deepseek-ai/DeepSeek-R1-0528", "deepseek-ai/DeepSeek-V3-0324", "gemini-2.5-flash-preview-05-20", "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B"]

# Initialize Gemini client once
gemini_api_token = os.environ.get("GEMINI_API_KEY", "")
if gemini_api_token:
    gemini_client = genai.Client(api_key=gemini_api_token)
else:
    gemini_client = None
    print("Warning: GEMINI_API_KEY not found. Gemini models will not be available.")


# Stores the message history for the currently active chat tab in the frontend.
active_chat_history = []

# NEW: Stores the initialInputs used in the last turn for the active chat.
# The key is the model's original index, the value is the initialInputs string.
last_used_initial_inputs = {}

# --- Helper Functions ---

def determine_execution_order(models_list):
    """
    Performs a topological sort to determine the execution order of models based on dependencies.
    """
    n = len(models_list)
    in_degree = [0] * n
    adj = [[] for _ in range(n)]

    for i, model in enumerate(models_list):
        dependencies_1_based = model.get("historySource", {}).get("models", [])
        for dep_index_1_based in dependencies_1_based:
            dep_index_0_based = dep_index_1_based - 1
            if not (0 <= dep_index_0_based < n):
                raise ValueError(f"Model {i} has an invalid dependency index: {dep_index_0_based}")
            # Dependency `dep_index` must run before model `i`
            adj[dep_index_0_based].append(i)
            in_degree[i] += 1

    queue = deque([i for i in range(n) if in_degree[i] == 0])
    execution_order = []

    while queue:
        u = queue.popleft()
        execution_order.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    if len(execution_order) != n:
        raise ValueError("A circular dependency was detected in the models configuration.")

    return execution_order

def build_system_prompt(main_prompt, examples):
    """
    Combines the main system prompt with formatted examples.
    """
    if not examples:
        return main_prompt

    formatted_examples = "\n---\nExamples:"
    for ex in examples:
        user_text = ex.get("user", "")
        assistant_text = ex.get("assistant", "")
        formatted_examples += f"\nUser: {user_text}\nAssistant: {assistant_text}"
    
    return f"{main_prompt}{formatted_examples}"

def build_input_messages(history_source, user_message, chat_history, model_outputs, models_list):
    """
    Constructs the list of messages for a model based on its historySource configuration.
    This version adds a dynamic instruction if the original prompt is omitted.
    """
    messages = []
    # print(model_outputs)
    
    # 1. Add previous chat history if requested
    if history_source.get("history"):
        messages.extend(chat_history)
        
    # 2. Add outputs from dependency models as context
    dependency_outputs_content = []
    model_deps = history_source.get("models", [])
    if model_deps:
        for dep_index in sorted(model_deps):
            dep_output = model_outputs.get(dep_index - 1)
            # print(dep_index, dep_output)
            if dep_output is not None:
                dep_model_name = models_list[dep_index - 1].get("value", f"Model {dep_index - 1}")
                # Frame the context as a simple user message.
                context_block = f"{dep_output}"
                messages.append({"role": "user", "content": ''})
                messages.append({"role": "assistant", "content": f"{context_block}"})

    # 3. Add the main user prompt OR a generated instruction
    if history_source.get("prompt"):
        # The model needs the original user prompt, add it as the final message.
        messages.append({"role": "user", "content": user_message})
    elif model_deps:
        # The model has dependencies but NOT the original prompt.
        # This means it should act on the context it just received.
        # We create a new, final instruction for it.
        instruction = "Based on the context provided in the previous message(s), generate a comprehensive response or perform the requested action according to the system instructions."
        messages.append({"role": "user", "content": instruction})
        
    # If a model has no history, no models, and no prompt, it will receive an empty message list.
    # This is an edge case that the invoke functions should handle (as they do now).
    return messages


# --- API Routes ---

@app.route("/switch-chat", methods=["POST"])
def switch_chat():
    """Clears the active history when switching chats in the frontend."""
    active_chat_history.clear()
    last_used_initial_inputs.clear()
    return jsonify({"message": "Switched to new chat, history cleared."})

@app.route("/send-chat-history", methods=["POST"])
def send_chat_history():
    """Receives and sets the active chat history from the frontend."""
    data = request.get_json()
    history = data.get("messages", [])
    active_chat_history.clear()
    active_chat_history.extend(history)
    print(f"{len(active_chat_history)} messages loaded into active chat history.")
    return jsonify({"message": "Chat history received"})

@app.route("/get-chat-name", methods=["POST"])
def get_chat_name():
    """Generates a short chat title from the first message using Gemini."""
    if not gemini_client:
        return jsonify({"chat_name": "New Chat"})

    data = request.get_json()
    prompt = data.get("message")
    model = "gemini-2.5-flash-preview-05-20"
    try:
        response = gemini_client.models.generate_content(
            model=model,
            config=types.GenerateContentConfig(
                system_instruction="Your job is to create a short 4-5 word Chat Title based on the user's message."
            ),
            contents=prompt
        )
        return jsonify({"chat_name": response.text.strip()})
    except Exception as e:
        print(f"Error generating chat name: {e}")
        return jsonify({"chat_name": "New Chat"})


@app.route("/new-chat", methods=["POST"])
def create_new_chat():
    """Handles the creation of a new chat, primarily for the frontend to get a new ID."""
    chat_id = str(uuid.uuid4())
    # Server-side history is now managed as a single active session, cleared on switch.
    return jsonify({"chat_id": chat_id})

@app.route("/chat", methods=["POST"])
def chat_orchestrator():
    """
    Main chat endpoint that orchestrates multi-model responses based on dependencies.
    """
    data = request.get_json()
    user_message = data.get("message")
    modelsList = data.get("model", [])
    history_present_in_request = "history" in data
    
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
    if not modelsList:
        return jsonify({"error": "At least one model configuration is required"}), 400

    for model_config in modelsList:
        if model_config.get("value") not in supported_models:
            return jsonify({"error": f"Model {model_config.get('value')} is not supported"}), 400

    try:
        execution_order = determine_execution_order(modelsList)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    previous_history = active_chat_history.copy()

    def generate_multi_model():
        global last_used_initial_inputs
        model_outputs = {}  # Store raw text responses of each model, keyed by original index
        
        # Send the display name of the first model that will execute
        if execution_order:
            first_model_config = modelsList[execution_order[0]]
            first_model_display_name = first_model_config.get("name", f"Model {execution_order[0]+1}")
            yield json.dumps({"first_model_display_name": first_model_display_name}) + "\n"

        for i, model_index in enumerate(execution_order):
            model_config = modelsList[model_index]
            model_display_name = model_config.get("name", f"Model {model_index+1}") # User-defined name
            
            config = {
                "temperature": model_config.get("temperature", 0.7),
                "max_tokens": model_config.get("maxTokens", 8192),
                "top_p": model_config.get("topP", 1.0),
                "min_p": model_config.get("minP", 0.0),
            }

            # Add a separator for models AFTER the first one
            if i > 0:
                yield json.dumps({"model_separator": {"display_name": model_display_name}}) + "\n"

            effective_user_message = user_message
            current_initial_inputs = model_config.get("initialInputs", "")

            is_first_message = len(previous_history) == 0
            previous_inputs = last_used_initial_inputs.get(model_index, "")
            have_inputs_changed = previous_inputs != current_initial_inputs

            if current_initial_inputs and (is_first_message or have_inputs_changed or not history_present_in_request):
                print("prepending initial inputs")
                effective_user_message = f"{current_initial_inputs}\n\n--\n\n{user_message}"

            system_prompt = build_system_prompt(
                model_config.get("systemPrompt", ""),
                model_config.get("examples", [])
            )
            
            input_messages = build_input_messages(
                model_config.get("historySource", {}),
                effective_user_message,
                previous_history,
                model_outputs, # Pass raw outputs
                modelsList
            )
            
            response_generator = None
            model_api_name = model_config.get("value")
            if model_api_name.startswith("deepseek-ai"):
                if system_prompt:
                    input_messages.insert(0, {"role": "system", "content": system_prompt})
                response_generator = invoke_chute(input_messages, model_api_name, config)
            elif model_api_name.startswith("gemini"):
                response_generator = invoke_gemini(input_messages, model_api_name, config, system_prompt)
            
            if not response_generator:
                yield json.dumps({"error": f"Could not create generator for model {model_api_name}"}) + "\n"
                continue

            full_response_for_this_model = ""
            for chunk_str in response_generator:
                yield chunk_str  # Forward the JSON string chunk {"content": "..."}
                try:
                    chunk_json = json.loads(chunk_str)
                    content = chunk_json.get("content", "")
                    if content:
                        full_response_for_this_model += content
                except (json.JSONDecodeError, TypeError):
                    pass 
            
            model_outputs[model_index] = full_response_for_this_model # Store raw response

        active_chat_history.append({"role": "user", "content": user_message})
        
        if execution_order and model_outputs:
            for original_model_idx in execution_order: # Iterate in execution order
                raw_response_content = model_outputs.get(original_model_idx, "")
                
                executed_model_config = modelsList[original_model_idx]
                model_display_name_for_history = executed_model_config.get("name", f"Model {original_model_idx+1}")

                filtered_response_content = raw_response_content
                if "</think>" in raw_response_content:
                    think_index = raw_response_content.rfind("</think>")
                    filtered_response_content = raw_response_content[think_index + 8:]
                
                prefixed_content_for_history = f"**{model_display_name_for_history}:**\n{filtered_response_content.strip()}"
                active_chat_history.append({"role": "assistant", "content": prefixed_content_for_history})

        new_inputs_for_next_turn = {}
        for idx, model_cfg in enumerate(modelsList):
            new_inputs_for_next_turn[idx] = model_cfg.get("initialInputs", "")
        last_used_initial_inputs = new_inputs_for_next_turn

    return Response(stream_with_context(generate_multi_model()), mimetype='application/json')

# --- Model Invocation Functions ---

def invoke_chute(messages, model, config):
    """Invokes the DeepSeek model via Chutes.ai and yields response chunks."""
    api_token = os.environ.get("CHUTES_API_TOKEN", "")
    if not api_token:
        yield json.dumps({"error": "CHUTES_API_TOKEN is not set."}) + "\n"
        return

    headers = {"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"}
    body = {
        "model": model,
        "messages": messages,
        "stream": True,
        "max_tokens": config.get("max_tokens"),
        "temperature": config.get("temperature"),
        "top_p": config.get("top_p"),
        "min_p": config.get("min_p"),
    }

    async def stream_async():
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post("https://llm.chutes.ai/v1/chat/completions", headers=headers, json=body) as response:
                    if response.status != 200:
                        error = await response.text()
                        yield json.dumps({"error": f"API error from Chutes.ai: {error}"}) + "\n"
                        return
                    
                    async for line in response.content:
                        line = line.decode("utf-8").strip()
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if content:
                                    yield json.dumps({"content": content}) + "\n"
                            except Exception as e:
                                yield json.dumps({"error": f"Error parsing chunk: {e}"}) + "\n"
        except Exception as e:
            yield json.dumps({"error": f"Connection error: {e}"}) + "\n"

    # This sync wrapper allows using the async generator in a sync Flask route
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    async_gen = stream_async()
    try:
        while True:
            yield loop.run_until_complete(async_gen.__anext__())
    except StopAsyncIteration:
        pass
    finally:
        loop.close()

def invoke_gemini(messages, model, config, system_prompt):
    """Invokes the Gemini model and yields response chunks."""
    if not gemini_client:
        yield json.dumps({"error": "Gemini client not initialized. Check GEMINI_API_KEY."}) + "\n"
        return

    try:
        # Gemini uses a history list and a final message to send.
        # The last message in our list is the one to send.
        if not messages:
            yield json.dumps({"error": "Gemini received no messages to process."}) + "\n"
            return
            

        # print(messages)
        final_message_to_send = messages[-1]["content"]
        history_messages = messages[:-1]
        # print(history_messages)

        # Convert our standard message format to Google's format
        history_for_gemini = []
        for msg in history_messages:
            role = msg["role"]
            if role == "system": continue # Handled by system_instruction
            if role == "assistant": role = "model"
            
            part = types.Part(text=msg["content"])
            history_for_gemini.append(types.Content(role=role, parts=[part]))

        # print("gemini history:", history_for_gemini)

        chat = gemini_client.chats.create(
            model=model,
            history=history_for_gemini,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt if system_prompt else None,
                temperature=config.get("temperature"),
                max_output_tokens=config.get("max_tokens"),
                top_p=config.get("top_p"),
            )
        )
        
        # print(history_for_gemini, final_message_to_send)

        response_stream = chat.send_message_stream(message=final_message_to_send)
        for chunk in response_stream:
            if chunk.text:
                yield json.dumps({"content": chunk.text}) + "\n"
                
    except Exception as e:
        yield json.dumps({"error": f"Gemini API error: {str(e)}"}) + "\n"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)