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

load_dotenv()

app = Flask(__name__)
# Update CORS to allow both localhost:5174 and standard React development port
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000", "http://localhost:5174", "http://127.0.1:5174"])

supported_models = ["deepseek-ai/DeepSeek-R1", "deepseek-ai/DeepSeek-R1-0528", "deepseek-ai/DeepSeek-V3-0324", "gemini-2.5-flash-preview-05-20"]

# Store chat histories
chat_histories = {}

# Initialize Gemini client once
gemini_api_token = os.environ.get("GEMINI_API_KEY", "")
gemini_client = genai.Client(api_key=gemini_api_token)
gemini_chat = None  # global chat

active_chat_history = []

@app.route("/switch-chat", methods=["POST"])
def switch_chat():
    data = request.get_json()
    chat_id = data.get("chat_id")
    
    #remove all chat histories except the active one
    active_chat_history.clear()
    
    return jsonify({"message": "Switched to chat history", "chat_id": chat_id})

@app.route("/send-chat-history", methods=["POST"])
def send_chat_history():
    data = request.get_json()
    history = data.get("messages")
    # print(f"Received chat history: {history}")

    # receive the active chat history
    active_chat_history.extend(history)
    print(len(active_chat_history), "messages in active chat history")

    return jsonify({"message": "Chat history received"})

@app.route("/new-chat", methods=["POST"])
def create_new_chat():
    data = request.get_json()
    model = data.get("model")
    
    if model not in supported_models:
        return jsonify({"error": "Model not supported"}), 400
    
    chat_id = str(uuid.uuid4())
    # chat_histories[chat_id] = []
    
    # For Gemini, create and store the chat object
    # if model.split("-")[0] == "gemini":
        # gemini_chats[chat_id] = gemini_client.chats.create(model=model)
    
    return jsonify({"chat_id": chat_id})

@app.route("/chat", methods=["POST"])
def route_to_model():
    data = request.get_json()
    user_message = data.get("message")
    modelsList = data.get("model")
    chat_id = data.get("chat_id")
    
    if not modelsList or len(modelsList) == 0:
        return jsonify({"error": "At least one model is required"}), 400
    
    # Get the first model configuration
    first_model = modelsList[0]
    model = first_model.get("value", "")
    config = {
        "system_prompt": first_model.get("systemPrompt", ""),
        "temperature": first_model.get("temperature", 0.7),
        "max_tokens": first_model.get("maxTokens", 16384),
        "top_p": first_model.get("topP", 1.0),
        "min_p": first_model.get("minP", 0.0),
    }

    print("DEBUGGING LENGTH OF ACTIVE CHAT HISTORY:", len(active_chat_history))
    print(f"Received message: {user_message} for {len(modelsList)} models, chat_id: {chat_id}")
    
    for model in modelsList:
        if model.get("value", "") not in supported_models:
            return jsonify({"error": f"Model {model.get('value', '')} not supported"}), 400
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
    
    # Add user message to history once
    if len(active_chat_history) == 0 or active_chat_history[-1].get("content") != config.get("system_prompt", ""):
        active_chat_history.append({"role": "system", "content": config.get("system_prompt", "")})
    active_chat_history.append({"role": "user", "content": user_message})
    
    def generate_multi_model():
        # Process first model normally
        if model.get("value").split("-")[0] == "deepseek":
            response_generator = invoke_chute(user_message, model.get("value"), chat_id, config)
        elif model.get("value").split("-")[0] == "gemini":
            response_generator = invoke_gemini(user_message, model.get("value"), chat_id, config)
        else:
            yield json.dumps({"error": f"Unsupported model: {model}"} + "\n")
            return
        
        # Stream the first model's response
        for chunk in response_generator.response:
            yield chunk
        
        if len(modelsList) > 1:
            # Process remaining models sequentially
            for i in range(1, len(modelsList)):
                current_model_config = modelsList[i]
                current_model = current_model_config.get("value", "")
                current_config = {
                    "system_prompt": current_model_config.get("systemPrompt", ""),
                    "temperature": current_model_config.get("temperature", 0.7),
                    "max_tokens": current_model_config.get("maxTokens", 16384),
                    "top_p": current_model_config.get("topP", 1.0),
                    "min_p": current_model_config.get("minP", 0.0),
                }

                # if current_model not in supported_models:
                    # yield json.dumps({"error": f"Model {current_model} not supported"}) + "\n"
                    # continue

                # Add delimiter between model responses
                yield json.dumps({"content": f"\n\n--- Response from {current_model} ---\n\n"}) + "\n"

                # Route to appropriate _next function
                if current_model.split("-")[0] == "deepseek":
                    next_response = invoke_chute_next(user_message, current_model, chat_id, current_config)
                elif current_model.split("-")[0] == "gemini":
                    next_response = invoke_gemini_next(user_message, current_model, chat_id, current_config)
                else:
                    yield json.dumps({"error": f"Unsupported model: {current_model}"}) + "\n"
                    continue
                
                # Stream the current model's response
                for chunk in next_response.response:
                    yield chunk
    
    return Response(stream_with_context(generate_multi_model()), content_type='application/json')

def invoke_chute(message, model, chat_id, config):
    print(f"Invoking chute with message: {message}, model: {model}, chat_id: {chat_id}, config: {config}")
    # Get API token from environment variable
    api_token = os.environ.get("CHUTES_API_TOKEN", "")
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    # Use the full chat history instead of just the last message
    body = {
        "model": model,
        "messages": active_chat_history,
        "stream": True,
        "max_tokens": config.get("max_tokens", 16384),
        "temperature": config.get("temperature", 0.7),
        "top_p": config.get("top_p", 1.0),
        "min_p": config.get("min_p", 0.0),
    }

    def generate():
        full_response = ""
        
        async def stream_async():
            nonlocal full_response
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "https://llm.chutes.ai/v1/chat/completions", 
                        headers=headers,
                        json=body
                    ) as response:
                        if response.status != 200:
                            error = await response.text()
                            yield json.dumps({"error": f"API error: {error}"}) + "\n"
                            return
                            
                        # Process the stream directly instead of collecting chunks
                        async for line in response.content:
                            line = line.decode("utf-8").strip()
                            if line.startswith("data: "):
                                data = line[6:]
                                if data == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data)
                                    if chunk and "choices" in chunk and len(chunk["choices"]) > 0:
                                        content = chunk["choices"][0].get("delta", {}).get("content", "")
                                        if content:
                                            full_response += content
                                            # Yield each chunk immediately
                                            yield json.dumps({"content": content}) + "\n"
                                            # Force flush to ensure immediate delivery
                                            await asyncio.sleep(0)
                                except Exception as e:
                                    yield json.dumps({"error": f"Error parsing chunk: {str(e)}"}) + "\n"
            except Exception as e:
                yield json.dumps({"error": f"Connection error: {str(e)}"}) + "\n"
        
        # Create a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get an async generator from our coroutine
            async_gen = stream_async()
            
            # Iterate through the generator and yield each chunk
            while True:
                try:
                    # Run until next yield point and get the value
                    chunk = loop.run_until_complete(async_gen.__anext__())
                    yield chunk
                except StopAsyncIteration:
                    # Generator is exhausted
                    break
                    
            # After streaming completes, add the full response to chat history
            if full_response:
                active_chat_history.append({"role": "assistant", "content": full_response})
        finally:
            loop.close()
    
    return Response(stream_with_context(generate()), content_type='application/json')

def invoke_chute_next(message, model, chat_id, config):
    # Get API token from environment variable
    api_token = os.environ.get("CHUTES_API_TOKEN", "")
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    history = []
    history.append({"role": "system", "content": config.get("system_prompt", "")})
    history.append({"role": "user", "content": message})
    history.append(active_chat_history[-1]) 

    # Use the full chat history instead of just the last message
    body = {
        "model": model,
        "messages": history,
        "stream": True,
        "max_tokens": config.get("max_tokens", 16384),
        "temperature": config.get("temperature", 0.7),
        "top_p": config.get("top_p", 1.0),
        "min_p": config.get("min_p", 0.0),
    }

    def generate():
        full_response = ""
        
        async def stream_async():
            nonlocal full_response
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "https://llm.chutes.ai/v1/chat/completions", 
                        headers=headers,
                        json=body
                    ) as response:
                        if response.status != 200:
                            error = await response.text()
                            yield json.dumps({"error": f"API error: {error}"}) + "\n"
                            return
                            
                        # Process the stream directly instead of collecting chunks
                        async for line in response.content:
                            line = line.decode("utf-8").strip()
                            if line.startswith("data: "):
                                data = line[6:]
                                if data == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data)
                                    if chunk and "choices" in chunk and len(chunk["choices"]) > 0:
                                        content = chunk["choices"][0].get("delta", {}).get("content", "")
                                        if content:
                                            full_response += content
                                            # Yield each chunk immediately
                                            yield json.dumps({"content": content}) + "\n"
                                            # Force flush to ensure immediate delivery
                                            await asyncio.sleep(0)
                                except Exception as e:
                                    yield json.dumps({"error": f"Error parsing chunk: {str(e)}"}) + "\n"
            except Exception as e:
                yield json.dumps({"error": f"Connection error: {str(e)}"}) + "\n"
        
        # Create a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get an async generator from our coroutine
            async_gen = stream_async()
            
            # Iterate through the generator and yield each chunk
            while True:
                try:
                    # Run until next yield point and get the value
                    chunk = loop.run_until_complete(async_gen.__anext__())
                    yield chunk
                except StopAsyncIteration:
                    # Generator is exhausted
                    break
                    
            # After streaming completes, add the full response to chat history
            if full_response:
                active_chat_history.append({"role": "assistant", "content": full_response})
        finally:
            loop.close()
    
    return Response(stream_with_context(generate()), content_type='application/json')

def invoke_gemini(message, model, chat_id, config):
    def generate():
        full_response = ""
        try:
            # Convert chat history to Google's content format
            history = []
            for msg in active_chat_history:
                # print(msg)
                role = msg["role"]
                content = msg["content"]
                
                if role == "assistant":
                    role = "model"

                # Skip the current user message since we'll send it separately
                if role == "user" and content == message and msg == active_chat_history[-1]:
                    continue

                if role == "system":
                    # System messages are not sent in the chat history
                    continue
                    
                # Convert to Google's format
                part = types.Part(text=content)
                content_entry = types.Content(role=role, parts=[part])

                history.append(content_entry)
            
            if history:
                chat = gemini_client.chats.create(
                    model = model,
                    history = history,
                    config= types.GenerateContentConfig(
                        system_instruction=config.get("system_propmt", ""),
                        temperature=config.get("temperature", 0.7),
                        max_output_tokens=config.get("max_tokens", 16384),
                        top_p=config.get("top_p", 1.0),
                    )
                )
            else:
                chat = gemini_client.chats.create(
                    model=model,
                    config = types.GenerateContentConfig(
                        system_instruction=config.get("system_prompt", ""),
                        temperature=config.get("temperature", 0.7),
                        max_output_tokens=config.get("max_tokens", 16384),
                        top_p=config.get("top_p", 1.0),
                    )
                )
            global gemini_chat
            gemini_chat = chat
            
            # Send message and stream response
            # print(history, message)
            print(len(history), "messages in history")
            response = chat.send_message_stream(message=message)
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield json.dumps({"content": chunk.text}) + "\n"
            
            # After streaming completes, add the response to chat history
            if full_response:
                active_chat_history.append({"role": "assistant", "content": full_response})
                
        except Exception as e:
            yield json.dumps({"error": f"Gemini API error: {str(e)}"}) + "\n"
    
    return Response(stream_with_context(generate()), content_type='application/json')

def invoke_gemini_next(message, model, chat_id, config):
    def generate():
        full_response = ""
        try:
            # Convert chat history to Google's content format
            needed_active_chat_history = []
            needed_active_chat_history.append({"role": "user", "content": message})
            needed_active_chat_history.append(active_chat_history[-1])
            history = []
            for msg in needed_active_chat_history:
                # print(msg)
                role = msg["role"]
                content = msg["content"]
                
                if role == "assistant":
                    role = "model"

                # Skip the current user message since we'll send it separately
                if role == "user" and content == message and msg == active_chat_history[-1]:
                    continue

                if role == "system":
                    # System messages are not sent in the chat history
                    continue
                    
                # Convert to Google's format
                part = types.Part(text=content)
                content_entry = types.Content(role=role, parts=[part])

                history.append(content_entry)
            
            if history:
                chat = gemini_client.chats.create(
                    model = model,
                    history = history,
                    config= types.GenerateContentConfig(
                        system_instruction=config.get("system_prompt", ""),
                        temperature=config.get("temperature", 0.7),
                        max_output_tokens=config.get("max_tokens", 16384),
                        top_p=config.get("top_p", 1.0),
                    )
                )
            else:
                chat = gemini_client.chats.create(
                    model=model,
                    config = types.GenerateContentConfig(
                        system_instruction=config.get("system_prompt", ""),
                        temperature=config.get("temperature", 0.7),
                        max_output_tokens=config.get("max_tokens", 16384),
                        top_p=config.get("top_p", 1.0),
                    )
                )
            global gemini_chat
            gemini_chat = chat
            
            # Send message and stream response
            # print(history, message)
            print(len(history), "messages in history")
            response = chat.send_message_stream(message="Generate the response based on the instructions and the history.")
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield json.dumps({"content": chunk.text}) + "\n"
            
            # After streaming completes, add the response to chat history
            if full_response:
                active_chat_history.append({"role": "assistant", "content": full_response})
                
        except Exception as e:
            yield json.dumps({"error": f"Gemini API error: {str(e)}"}) + "\n"
    
    return Response(stream_with_context(generate()), content_type='application/json')

@app.route("/fetch-messages/<chat_id>", methods=["GET"])
def get_chat_history(chat_id):
    chatID = chat_id
    
    if not chatID or chatID not in chat_histories:
        # print(chatID, "not in ", chat_histories)
        return jsonify({"error": "Invalid chat ID"}), 400
    
    history = chat_histories[chatID].copy()

    # Return the chat history for the specified chat ID
    return jsonify({"messages": history})

if __name__ == "__main__":
    app.run(debug=True)