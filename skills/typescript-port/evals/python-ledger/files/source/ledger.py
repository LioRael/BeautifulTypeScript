"""JSON input list of {key: str, amount: signed ASCII decimal string, priority?: int|null}.
Return grouped totals as decimal strings ordered by priority, then first-seen order.
Missing/null priority is 100. A group's first record supplies its priority.
No numeric precision limit on amount. ValueError messages are API error codes.
"""
import re

def summarize(rows):
    if not isinstance(rows, list):
        raise ValueError('rows')
    groups = {}
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get('key'), str):
            raise ValueError('key')
        amount = row.get('amount')
        if not isinstance(amount, str) or re.fullmatch(r'[+-]?[0-9]+', amount) is None:
            raise ValueError('amount')
        priority = row.get('priority')
        if priority is None:
            priority = 100
        if type(priority) is not int or not -1000 <= priority <= 1000:
            raise ValueError('priority')
        key = row['key']
        if key not in groups:
            groups[key] = {'key': key, 'total': 0, 'priority': priority}
        groups[key]['total'] += int(amount)
    return [{'key': g['key'], 'total': str(g['total']), 'priority': g['priority']}
            for g in sorted(groups.values(), key=lambda g: g['priority'])]
