import asyncio
import logging
import time
from typing import Optional
from functools import wraps
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.rpm = requests_per_minute
        self.interval = 60.0 / requests_per_minute
        self.last_request = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.time()
            wait = self.interval - (now - self.last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            self.last_request = time.time()

    def acquire_sync(self):
        now = time.time()
        wait = self.interval - (now - self.last_request)
        if wait > 0:
            time.sleep(wait)
        self.last_request = time.time()


class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate
        self.last_refill = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: int = 1) -> bool:
        async with self._lock:
            self._refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    def _refill(self):
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now


_limiters: dict[str, RateLimiter] = {}
_buckets: dict[str, TokenBucket] = {}


def get_limiter(name: str, rpm: int = 60) -> RateLimiter:
    if name not in _limiters:
        _limiters[name] = RateLimiter(rpm)
    return _limiters[name]


def get_bucket(name: str, capacity: int = 100, refill_rate: float = 10.0) -> TokenBucket:
    if name not in _buckets:
        _buckets[name] = TokenBucket(capacity, refill_rate)
    return _buckets[name]


async def rate_limit_dependency(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    bucket = get_bucket(f"api:{client_ip}", capacity=100, refill_rate=2.0)
    if not await bucket.acquire():
        logger.warning(f"Rate limit exceeded for {client_ip}")
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


async def claude_rate_limit(request: Request):
    bucket = get_bucket("claude_api", capacity=20, refill_rate=0.5)
    if not await bucket.acquire():
        logger.warning("Claude API rate limit exceeded")
        raise HTTPException(status_code=429, detail="Claude API rate limit exceeded")
