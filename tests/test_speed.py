from backend.engine.creature import Creature
from backend.engine.initiative import opening_initiative
from backend.engine.type_chart import effectiveness_percent


def c(speed,passive=''):
    return Creature('Test',100,10,10,speed=speed,passive=passive)


def test_lead_speed_beats_team_total_and_does_not_use_draw():
    def no_draw():raise AssertionError('not a tie')
    assert opening_initiative([[c(12),c(1),c(1)],[c(10),c(20),c(20)]],no_draw)[0]==0


def test_team_speed_breaks_equal_leads_and_exact_tie_uses_draw():
    a=[c(10),c(5),c(5)];b=[c(10),c(6),c(5)]
    assert opening_initiative([a,b],lambda:0)[0]==1
    assert opening_initiative([a,a],lambda:1)[0]==1
    assert 'tie' in opening_initiative([a,a],lambda:0)[1].lower()


def test_trailblazer_only_boosts_lead_not_team_total():
    assert opening_initiative([[c(11,'trailblazer')],[c(12)]],lambda:1)[0]==0
    assert opening_initiative([[c(10),c(11,'trailblazer')],[c(10),c(12)]],lambda:0)[0]==1


def test_four_types_have_symmetric_strong_weak_and_neutral_opposites():
    cycle=['Magic','Elemental','Physical','Spirit']
    for i,t in enumerate(cycle):
        assert effectiveness_percent(t,cycle[(i+1)%4])==125
        assert effectiveness_percent(cycle[(i+1)%4],t)==80
        assert effectiveness_percent(t,t)==100
        assert effectiveness_percent(t,cycle[(i+2)%4])==100
