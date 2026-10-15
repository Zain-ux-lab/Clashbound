from fastapi.testclient import TestClient
from backend.main import app
from backend.api import routes


def test_bot_opening_is_resolved_with_frames(monkeypatch):
    monkeypatch.setattr(routes,'draw_initiative',lambda:1,raising=False)
    with TestClient(app) as c:
        r=c.post('/api/battle',json={'roster':['mage','sporestag','glowmire']}).json()
        assert r['state']['initiative']['firstPlayer']==1
        assert r['openingState']['player']==1
        assert r['frames'] and r['frames'][0]['animation']['actor']==1
        assert r['state']['player']==0 or r['state']['replacement']==0
        assert c.get('/api/battle').json()['state']==r['state']


def test_human_opening_preserves_full_hp_and_has_no_attack_frames(monkeypatch):
    monkeypatch.setattr(routes,'draw_initiative',lambda:0,raising=False)
    with TestClient(app) as c:
        r=c.post('/api/battle',json={'roster':['mage','sporestag','glowmire']}).json()
        assert r['state']['initiative']['firstPlayer']==0 and r['frames']==[]
        assert all(x['hp']==x['maxHp'] for team in r['state']['teams'] for x in team)
