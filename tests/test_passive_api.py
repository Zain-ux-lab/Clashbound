from fastapi.testclient import TestClient
from backend.main import app
from backend.api import routes
from backend.engine.initiative import opening_initiative


def test_roster_explains_every_passive_and_has_no_progression_gates():
    with TestClient(app) as c:
        roster=c.get('/api/roster').json()
        assert len({x['passive']['id'] for x in roster})==10
        for x in roster:
            assert 'mastery' not in x and x['stats']['speed']>0
            assert len(x['movePool'])==8 and 3 in x['signatureMoves']
            assert x['moves'][3]['description']
        assert next(x for x in roster if x['id']=='coil')['type']=='Elemental'


def test_targeted_move_requires_explicit_target_and_rejects_bad_target_atomically():
    with TestClient(app) as c:
        s=c.post('/api/battle',json={'roster':['glowmire','mage','sporestag']}).json()['state']
        assert s['teams'][0][0]['moves'][3]['targets']
        for target in (None,0,99,True,'1'):
            body=dict(kind='move',index=3,revision=s['revision'])
            if target is not None:body['target']=target
            r=c.post('/api/battle/actions',json=body)
            assert r.status_code==422,r.text
            assert c.get('/api/battle').json()['state']==s
        r=c.post('/api/battle/actions',json=dict(kind='move',index=3,target=1,revision=s['revision']))
        assert r.status_code==200,r.text
        f=r.json()['frames'][0]
        assert f['active'][0]==1 and f['player']==1
        assert f['animation']['moveName']=='Follow the Lantern'


def test_speed_initiative_is_published_and_uses_locked_lead(monkeypatch):
    monkeypatch.setattr(routes,'opening_initiative',opening_initiative)
    with TestClient(app) as c:
        data=c.post('/api/battle',json={'roster':['riftclaw','mage','glowmire']}).json()
        s=data['openingState']
        assert s['teams'][0][0]['id']=='riftclaw'
        assert s['initiative']['leadSpeeds'][0]==12
        assert s['initiative']['method']=='Opening Speed'
        assert s['initiative']['reason'] and 'mastery' not in str(s).lower()


def test_reserve_damage_preview_and_animation_name_exact_affected_slot():
    with TestClient(app) as c:
        s=c.post('/api/battle',json={'roster':['coil','mage','glowmire']}).json()['state']
        options=s['teams'][0][0]['moves'][3]['targets']
        assert {x['index'] for x in options}=={1,2}
        r=c.post('/api/battle/actions',json=dict(kind='move',index=3,target=2,revision=s['revision']))
        assert r.status_code==200,r.text
        f=r.json()['frames'][0]
        assert f['teams'][1][0]['hp']==s['teams'][1][0]['hp']
        assert f['teams'][1][2]['hp']<s['teams'][1][2]['hp']
        assert any(x['player']==1 and x['slot']==2 and x['amount']<0 for x in f['animation']['hpChanges'])
        assert not any(x['player']==1 and x['slot']==0 for x in f['animation']['hpChanges'])


def test_target_on_non_move_is_rejected_without_changing_the_saved_battle():
    with TestClient(app) as c:
        s=c.post('/api/battle',json={'roster':['mage','sporestag','glowmire']}).json()['state']
        for kind in ('switch','replace'):
            r=c.post('/api/battle/actions',json=dict(kind=kind,index=1,target=0,revision=s['revision']))
            assert r.status_code==422,r.text
            assert c.get('/api/battle').json()['state']==s
