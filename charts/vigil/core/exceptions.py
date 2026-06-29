class SOCError(Exception):
    def __init__(self, message: str, code: str = "SOC_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class ConfigError(SOCError):
    def __init__(self, message: str):
        super().__init__(message, "CONFIG_ERROR")


class ToolError(SOCError):
    def __init__(self, message: str, tool_name: str = "unknown"):
        self.tool_name = tool_name
        super().__init__(message, "TOOL_ERROR")


class DatabaseError(SOCError):
    def __init__(self, message: str):
        super().__init__(message, "DATABASE_ERROR")


class AuthError(SOCError):
    def __init__(self, message: str):
        super().__init__(message, "AUTH_ERROR")


class RateLimitError(SOCError):
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, "RATE_LIMIT_ERROR")


class ValidationError(SOCError):
    def __init__(self, message: str, field: str = None):
        self.field = field
        super().__init__(message, "VALIDATION_ERROR")
