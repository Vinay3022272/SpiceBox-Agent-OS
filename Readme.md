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

<!-- quering the output -->
python -m backend.src.agents.store_manager_llm -q "What are the specs, price, and customer sentiment for iPhone 15?" -w .\backend\merchant_knowledge\ -m 23CE10086
