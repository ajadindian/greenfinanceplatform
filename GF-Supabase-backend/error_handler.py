from functools import wraps
from flask import jsonify
import traceback
from logger import CustomLogger

logger = CustomLogger('error_handler')

class AppError(Exception):
    """Base error class for application errors"""
    def __init__(self, message, status_code=500, payload=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        rv['status_code'] = self.status_code
        return rv

class ValidationError(AppError):
    """Validation error class"""
    def __init__(self, message, payload=None):
        super().__init__(message, status_code=400, payload=payload)

class AuthorizationError(AppError):
    """Authorization error class"""
    def __init__(self, message, payload=None):
        super().__init__(message, status_code=401, payload=payload)

class NotFoundError(AppError):
    """Not found error class"""
    def __init__(self, message, payload=None):
        super().__init__(message, status_code=404, payload=payload)

def handle_error(func):
    """Decorator to handle errors in routes"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except AppError as e:
            logger.error(f"Application error: {e.message}", {
                'error_type': e.__class__.__name__,
                'status_code': e.status_code
            })
            return jsonify(e.to_dict()), e.status_code
        except Exception as e:
            logger.critical(f"Unexpected error: {str(e)}", {
                'traceback': traceback.format_exc()
            })
            return jsonify({
                'message': 'An unexpected error occurred',
                'status_code': 500
            }), 500
    return wrapper 