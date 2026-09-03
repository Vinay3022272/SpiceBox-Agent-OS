cd backend
$env:PYTHONIOENCODING='utf-8'

# Process Knowledge section
python -m src.agents.store_manager_llm --source ./test_data --wiki ./merchant_knowledge --section knowledge

# Process Marketing section
python -m src.agents.store_manager_llm --source ./test_data --wiki ./merchant_knowledge --section marketing

# Process Both sections
python -m src.agents.store_manager_llm --source ./test_data --wiki ./merchant_knowledge --both



from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    input="Hello!"
)

print(response.output_text)