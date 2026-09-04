"""Structured, deliberately narrow output for customer preference analysis."""

from typing import Dict, Optional
from pydantic import BaseModel, Field


class CustomerIntent(BaseModel):
    """Signals inferred from customer language, never a product decision."""

    budget_restrictiveness: float = Field(default=0.5, ge=0, le=1)
    quality_value_orientation: float = Field(default=0.5, ge=0, le=1)
    upsell_openness: float = Field(default=0.5, ge=0, le=1)
    confidence: float = Field(default=0.0, ge=0, le=1)
    acceptable_budget_stretch: Optional[float] = Field(default=None, ge=0, le=1)
    stated_budget: Optional[float] = Field(default=None, ge=0)
    hard_budget_constraint: bool = False
    evidence: Dict[str, str] = Field(default_factory=dict)
