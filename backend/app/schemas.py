from pydantic import BaseModel, Field


class CreateBody(BaseModel):
    centres: int = Field(5, ge=2, le=5)


class UnlockBody(BaseModel):
    keys: list[str] = Field(min_length=3, max_length=3)


class TraceTextBody(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
