from abc import ABC, abstractmethod
import yaml
import logging
from logger import CustomLogger
import os

class BaseAgent(ABC):
    """Base class for all agents in the system"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = CustomLogger(f'agent_{name}')
        self.config = self._load_config()
        self.best_practices = self._load_best_practices()
        self.last_processed = None  # Track last processed timestamp
    
    def _load_config(self):
        """Load agent-specific configuration"""
        try:
            with open(f'agents/config/agent_config.yaml', 'r') as f:
                config = yaml.safe_load(f)
                return config.get(self.name, {})
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {}
    
    def _load_best_practices(self):
        """Load agent-specific best practices"""
        try:
            file_path = f'agents/config/best_practices/{self.name}.md'
            if not os.path.exists(file_path):
                self.logger.warning(f"Best practices file not found: {file_path}")
                return "Best practices file not found."
            
            with open(file_path, 'r') as f:
                return f.read()
        except Exception as e:
            self.logger.error(f"Error loading best practices: {str(e)}")
            return "Error loading best practices."
    
    @abstractmethod
    async def process(self, *args, **kwargs):
        """Main processing method to be implemented by each agent"""
        pass 