import pytest
from backend.api import routes


@pytest.fixture(autouse=True)
def deterministic_opening(monkeypatch):
    # Legacy combat assertions start with the human; initiative tests override this.
    monkeypatch.setattr(routes,'draw_initiative',lambda:0)
