import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
import json

class CustomLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Create logs directory if it doesn't exist
        os.makedirs('logs', exist_ok=True)
        
        # File handler with rotation
        log_file = f'logs/{name}.log'
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        
        # Console handler
        console_handler = logging.StreamHandler()
        
        # Create formatters and add it to the handlers
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_formatter = logging.Formatter(
            '%(levelname)s - %(message)s'
        )
        
        file_handler.setFormatter(file_formatter)
        console_handler.setFormatter(console_formatter)
        
        # Add handlers to the logger
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
    
    def _format_message(self, message, extra=None):
        """Format message with extra data for structured logging"""
        if extra:
            return json.dumps({
                'message': message,
                'extra': extra
            })
        return message

    def info(self, message, extra=None):
        self.logger.info(self._format_message(message, extra))

    def error(self, message, extra=None, exc_info=True):
        self.logger.error(self._format_message(message, extra), exc_info=exc_info)

    def warning(self, message, extra=None):
        self.logger.warning(self._format_message(message, extra))

    def debug(self, message, extra=None):
        self.logger.debug(self._format_message(message, extra))

    def critical(self, message, extra=None, exc_info=True):
        self.logger.critical(self._format_message(message, extra), exc_info=exc_info) 