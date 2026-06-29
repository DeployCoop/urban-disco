"""Frontend logging endpoint."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime
import logging

router = APIRouter()

# Create dedicated logger for frontend logs
frontend_logger = logging.getLogger('frontend')
frontend_logger.setLevel(logging.DEBUG)

# Create file handler if not already configured
if not frontend_logger.handlers:
    from pathlib import Path
    
    # Ensure logs directory exists
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Create file handler
    file_handler = logging.FileHandler(log_dir / "frontend-app.log")
    file_handler.setLevel(logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    
    # Add handler to logger
    frontend_logger.addHandler(file_handler)
    
    # Don't propagate to root logger (avoid duplicate logs)
    frontend_logger.propagate = False


class FrontendLogEntry(BaseModel):
    """Frontend log entry model."""
    level: str
    message: str
    component: str
    timestamp: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


@router.post("/frontend")
async def log_frontend(entry: FrontendLogEntry):
    """
    Receive logs from frontend and write to file.
    
    Args:
        entry: Log entry with level, message, component, and optional extra data
    
    Returns:
        Status confirmation
    """
    try:
        # Build log message
        log_message = f"[{entry.component}] {entry.message}"
        
        # Append extra data if present
        if entry.extra:
            # Format extra data nicely
            extra_str = ", ".join([f"{k}={v}" for k, v in entry.extra.items()])
            log_message += f" ({extra_str})"
        
        # Log at appropriate level
        level = entry.level.upper()
        if level == 'DEBUG':
            frontend_logger.debug(log_message)
        elif level == 'INFO':
            frontend_logger.info(log_message)
        elif level == 'WARN' or level == 'WARNING':
            frontend_logger.warning(log_message)
        elif level == 'ERROR':
            frontend_logger.error(log_message)
        else:
            frontend_logger.info(log_message)
        
        return {"status": "ok"}
    
    except Exception as e:
        # Don't fail the request if logging fails
        logging.error(f"Error processing frontend log: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/frontend/status")
async def get_frontend_log_status():
    """Check if frontend logging is working."""
    from pathlib import Path
    
    log_file = Path("logs/frontend-app.log")
    
    return {
        "enabled": True,
        "log_file": str(log_file),
        "exists": log_file.exists(),
        "size": log_file.stat().st_size if log_file.exists() else 0
    }

