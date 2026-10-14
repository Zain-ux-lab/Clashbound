from fastapi.testclient import TestClient
from backend.main import app
from backend.roster import ROSTER
from backend.engine.moves import Move


def test_all_choices_are_available_without_progress_and_displaced_moves_remain():
    for c in ROSTER:
        assert len(c['moves'])==4 and len(c['movePool'])==8
        assert c['movePool'][:4]==c['moves']
        assert c['passive']['description'] and 3 in c['signatureMoves']
        assert 'mastery' not in c
        for move in c['movePool']:Move(**move)
    assert ROSTER[0]['movePool'][6]['name']=='Arcane Ward'
    with TestClient(app) as client:
        r=client.post('/api/battle',json={'roster':['mage','sporestag','glowmire'],'loadouts':{'mage':[0,3,5,6]}})
        assert r.status_code==200,r.text
        assert r.json()['state']['teams'][0][0]['moves'][-1]['name']=='Arcane Ward'


def test_match_identity_changes_on_reset_and_refresh_retains_current_match():
    with TestClient(app) as client:
        s=client.post('/api/battle',json={'roster':['mage','sporestag','glowmire']}).json()['state']
        assert client.get('/api/battle').json()['state']['matchId']==s['matchId']
        new=client.post('/api/battle',json={'roster':['mage','sporestag','glowmire']}).json()['state']
        assert new['matchId']!=s['matchId']
        assert {c['id'] for c in new['teams'][1]}!={c['id'] for c in s['teams'][1]}
