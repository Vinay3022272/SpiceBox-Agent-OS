cd backend
pip install -r requirement.txt
python -m agents.store_managing_agent --source ./test_data --wiki ./test_wiki




cd backend

# Knowledge section
python -m src.agents.store_manager_llm --source ./test_data --wiki ./merchant_knowledge --section knowledge

# Marketing section
python -m src.agents.store_manager_llm --source ./test_data --wiki ./merchant_knowledge --section marketing

# Both sections
python -m src.agents.store_manager_llm --source ./test_data --wiki ./merchant_knowledge --both
