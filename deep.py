from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import aiohttp
import asyncio
import json
import os

app = Flask(__name__)
# Update CORS to allow both localhost:5174 and standard React development port
CORS(app, origins=["http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5174", "http://127.0.0.1:3000"])



@app.route("/chat", methods=["POST"])
def route_to_model():
    data = request.get_json()
    user_message = data.get("message")
    model = data.get("model")

def invoke_chute():
    data = request.get_json()
    user_message = data.get("message")
    
    # Get API token from environment variable
    api_token = os.environ.get("CHUTES_API_TOKEN", "")
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    body = {
        "model": "deepseek-ai/DeepSeek-R1",
        "messages": [
            {
                "role": "user",
                "content": user_message
            }
        ],
        "stream": True,
        "max_tokens": 16384,
        "temperature": 0.7
    }

    def generate():
        async def stream_async():
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
        finally:
            loop.close()
    
    return Response(stream_with_context(generate()), content_type='application/json')

if __name__ == "__main__":
    app.run(debug=True)