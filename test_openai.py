from dotenv import load_dotenv
import os
from openai import OpenAI

# Load the environment variables from config.env
load_dotenv('config.env')

def test_openai_api():
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ ERROR: OPENAI_API_KEY not found in config.env!")
        print("Please check your config.env file.")
        return
        
    print("✅ Found API Key. Attempting to connect to OpenAI...")
    
    try:
        client = OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'Neural Link Online' if you can hear me."}
            ]
        )
        
        print("\n=== SUCCESS ===")
        print("Response from OpenAI:")
        print(response.choices[0].message.content)
        
    except Exception as e:
        print("\n❌ API CALL FAILED:")
        print(str(e))

if __name__ == "__main__":
    test_openai_api()
