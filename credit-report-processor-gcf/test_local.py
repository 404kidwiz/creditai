#!/usr/bin/env python3
"""
Local testing script for the Credit Report Processor Google Cloud Function
"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_function_locally():
    """Test the function running locally"""
    
    # Test data
    test_payload = {
        "pdf_url": "https://example.com/test-credit-report.pdf",
        "user_id": "test-user-123"
    }
    
    # Test local endpoint
    local_url = "http://localhost:8080"
    
    print("🧪 Testing Credit Report Processor Function")
    print("=" * 50)
    print(f"Local URL: {local_url}")
    print(f"Test Payload: {json.dumps(test_payload, indent=2)}")
    print()
    
    try:
        response = requests.post(
            local_url,
            json=test_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print()
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success!")
            print(f"Message: {result.get('message', 'No message')}")
            
            if 'summary' in result:
                summary = result['summary']
                print(f"Violations Found: {summary.get('violations_found', 0)}")
                print(f"Accounts Analyzed: {summary.get('accounts_analyzed', 0)}")
                print(f"Inquiries Found: {summary.get('inquiries_found', 0)}")
            
            if 'data' in result:
                print(f"Data Records: {len(result['data'])}")
                
        else:
            print("❌ Error!")
            print(f"Error Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error!")
        print("Make sure the function is running locally with:")
        print("  functions-framework --target=process_credit_report --port=8080")
        
    except requests.exceptions.Timeout:
        print("❌ Timeout Error!")
        print("The function took too long to respond.")
        
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

def test_environment_setup():
    """Test if environment variables are properly set"""
    
    print("🔧 Testing Environment Setup")
    print("=" * 30)
    
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_KEY", 
        "GEMINI_API_KEY"
    ]
    
    optional_vars = [
        "GOOGLE_APPLICATION_CREDENTIALS"
    ]
    
    all_good = True
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {'*' * min(len(value), 10)}...")
        else:
            print(f"❌ {var}: Not set")
            all_good = False
    
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️  {var}: Not set (optional for local testing)")
    
    print()
    return all_good

def test_supabase_connection():
    """Test Supabase connection"""
    
    print("🔗 Testing Supabase Connection")
    print("=" * 30)
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not configured")
        return False
    
    try:
        from supabase import create_client
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Test connection by querying a simple table
        response = supabase.table("credit_reports_analysis").select("id").limit(1).execute()
        
        print("✅ Supabase connection successful")
        return True
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_gemini_api():
    """Test Gemini API connection"""
    
    print("🤖 Testing Gemini API")
    print("=" * 20)
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if not gemini_key:
        print("❌ Gemini API key not configured")
        return False
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-pro")
        
        # Test with a simple prompt
        response = model.generate_content("Hello, this is a test.")
        
        if response.text:
            print("✅ Gemini API connection successful")
            return True
        else:
            print("❌ Gemini API returned empty response")
            return False
            
    except Exception as e:
        print(f"❌ Gemini API connection failed: {e}")
        return False

def main():
    """Main test function"""
    
    print("🚀 Credit Report Processor - Local Testing Suite")
    print("=" * 55)
    print()
    
    # Test environment setup
    env_ok = test_environment_setup()
    print()
    
    if not env_ok:
        print("❌ Environment setup incomplete. Please check your .env file.")
        return
    
    # Test Supabase connection
    supabase_ok = test_supabase_connection()
    print()
    
    # Test Gemini API
    gemini_ok = test_gemini_api()
    print()
    
    if not supabase_ok or not gemini_ok:
        print("❌ Some dependencies are not working. Please fix the issues above.")
        return
    
    # Test the function
    print("🎯 All dependencies working! Testing the function...")
    print()
    test_function_locally()

if __name__ == "__main__":
    main() 