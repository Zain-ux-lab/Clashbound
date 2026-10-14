"""Opening initiative only; normal play always alternates."""
from random import randrange


def lead_speed(creature):
    return creature.speed+(3 if creature.passive=='trailblazer' else 0)


def opening_initiative(teams,draw=None):
    leads=[lead_speed(team[0]) for team in teams]
    totals=[sum(c.speed for c in team) for team in teams]
    if leads[0]!=leads[1]:
        first=0 if leads[0]>leads[1] else 1
        return first,f'Lead Speed {leads[0]} vs {leads[1]}. Faster lead opens.'
    if totals[0]!=totals[1]:
        first=0 if totals[0]>totals[1] else 1
        return first,f'Lead Speed tied at {leads[0]}; team Speed {totals[0]} vs {totals[1]} breaks the tie.'
    return (draw or (lambda:randrange(2)))(),f'Exact Speed tie (lead {leads[0]}, team {totals[0]}): equal opening draw.'
