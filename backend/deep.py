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

supported_models = ["deepseek-ai/DeepSeek-R1", "deepseek-ai/DeepSeek-V3-0324", "gemini-2.5-flash-preview-05-20"]

# Store chat histories
chat_histories = {}

# Initialize Gemini client once
gemini_api_token = os.environ.get("GEMINI_API_KEY", "")
gemini_client = genai.Client(api_key=gemini_api_token)
gemini_chats = {}  # Store chat sessions by ID

active_chat_history = []

@app.route("/switch-chat", methods=["POST"])
def switch_chat():
    data = request.get_json()
    chat_id = data.get("chat_id")
    
    # Switch to the specified chat history
    active_chat_history.clear()
    
    return jsonify({"message": "Switched to chat history", "chat_id": chat_id})

@app.route("/send-chat-history", methods=["POST"])
def send_chat_history():
    data = request.get_json()
    history = data.get("messages")
    print(f"Received chat history: {history}")

    # receive the active chat history
    active_chat_history.extend(history)

    return jsonify({"message": "Chat history received"})

@app.route("/new-chat", methods=["POST"])
def create_new_chat():
    data = request.get_json()
    model = data.get("model")
    
    if model not in supported_models:
        return jsonify({"error": "Model not supported"}), 400
    
    chat_id = str(uuid.uuid4())
    chat_histories[chat_id] = []
    
    # For Gemini, create and store the chat object
    if model.split("-")[0] == "gemini":
        gemini_chats[chat_id] = gemini_client.chats.create(model=model)
    
    return jsonify({"chat_id": chat_id})

@app.route("/chat", methods=["POST"])
def route_to_model():
    data = request.get_json()
    user_message = data.get("message")
    model = data.get("model")
    chat_id = data.get("chat_id")
    
    print(f"Received message: {user_message} for model: {model}, chat_id: {chat_id}")
    
    if model not in supported_models:
        return jsonify({"error": "Model not supported"}), 400
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
    if not chat_id or chat_id not in chat_histories:
        # print(chat_id, "not in ", chat_histories)
        return jsonify({"error": "Invalid chat ID"}), 400
    
    # Add user message to history
    chat_histories[chat_id].append({"role": "user", "content": user_message})
    
    if model.split("-")[0] == "deepseek":
        return invoke_chute(user_message, model, chat_id)
    elif model.split("-")[0] == "gemini":
        return invoke_gemini(user_message, model, chat_id)


def invoke_chute(message, model, chat_id):
    # Get API token from environment variable
    api_token = os.environ.get("CHUTES_API_TOKEN", "")
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    # Use the full chat history instead of just the last message
    body = {
        "model": model,
        "messages": chat_histories[chat_id],
        "stream": True,
        "max_tokens": 16384,
        "temperature": 0.7
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
                chat_histories[chat_id].append({"role": "assistant", "content": full_response})
        finally:
            loop.close()
    
    return Response(stream_with_context(generate()), content_type='application/json')

def invoke_gemini(message, model, chat_id):
    def generate():
        full_response = ""
        try:
            # Convert chat history to Google's content format
            history = []
            for msg in chat_histories[chat_id]:
                # print(msg)
                role = msg["role"]
                content = msg["content"]
                
                if role == "assistant":
                    role = "model"

                # Skip the current user message since we'll send it separately
                if role == "user" and content == message and msg == chat_histories[chat_id][-1]:
                    continue
                    
                # Convert to Google's format
                part = types.Part(text=content)
                content_entry = types.Content(role=role, parts=[part])

                history.append(content_entry)
            
            # Create or get chat session
            if chat_id in gemini_chats:
                # Reuse existing chat if available
                chat = gemini_chats[chat_id]
                if history:
                    chat = gemini_client.chats.create(
                        model=model,
                        history=history
                    )
                gemini_chats[chat_id] = chat
            else:
                # Create a new chat with history if we have any
                if history:
                    chat = gemini_client.chats.create(
                        model=model,
                        history=history
                    )
                else:
                    chat = gemini_client.chats.create(model=model)
                gemini_chats[chat_id] = chat
            
            # Send message and stream response
            print(history, message)
            response = chat.send_message_stream(message=message)
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield json.dumps({"content": chunk.text}) + "\n"
            
            # After streaming completes, add the response to chat history
            if full_response:
                chat_histories[chat_id].append({"role": "assistant", "content": full_response})
                
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