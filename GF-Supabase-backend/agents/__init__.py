import os

# Create necessary directories
directories = [
    'agents/config',
    'agents/config/best_practices'
]

for directory in directories:
    os.makedirs(directory, exist_ok=True) 