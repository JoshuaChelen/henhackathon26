import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Load environment variables
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# 2. Initialize the Supabase client
supabase: Client = create_client(url, key)

# 3. Example: Fetch data from a table named 'my_table'
def get_data():
    try:
        response = supabase.table("test").select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    data = get_data()
    print(data)