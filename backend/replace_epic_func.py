import re

# Read the replacement function
with open('app/services/ai_service_epic_gen_replacement.py', 'r', encoding='utf-8') as f:
    replacement = f.read()

# Read the original file
with open('app/services/ai_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the function boundaries
start_pattern = r'    async def _generate_epics_and_stories\(self, data: Dict\[str, Any\]\) -> Dict\[str, Any\]:'
end_pattern = r'\n    async def _generate_architecture\(self, data: Dict\[str, Any\]\) -> Dict\[str, Any\]:'

match_start = re.search(start_pattern, content)
match_end = re.search(end_pattern, content)

if match_start and match_end:
    # Replace the old function with the new one
    new_content = content[:match_start.start()] + replacement + '\n' + content[match_end.start():]
    
    # Write back
    with open('app/services/ai_service.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print('✅ Successfully replaced _generate_epics_and_stories function')
    print(f'Old length: {len(content)}')
    print(f'New length: {len(new_content)}')
    print(f'Difference: {len(new_content) - len(content)} characters')
else:
    print('❌ Could not find function boundaries')
