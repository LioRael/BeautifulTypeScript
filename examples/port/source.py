"""Original reference implementation. JSON safe-integer wire domain, not all Python ints."""
import json
import sys

LIMIT = 2 ** 53 - 1

def aggregate(rows):
    if not isinstance(rows, list):
        raise TypeError('invalid-input')
    # Validate all rows before computing, including rows after a potential overflow.
    for row in rows:
        if (not isinstance(row, dict) or not isinstance(row.get('key'), str)
                or type(row.get('quantity')) not in (int, float)
                or not -LIMIT <= row['quantity'] <= LIMIT
                or int(row['quantity']) != row['quantity']):
            raise TypeError('invalid-input')
    totals = {}
    for row in rows:
        total = totals.get(row['key'], 0) + int(row['quantity'])
        if not -LIMIT <= total <= LIMIT:
            raise OverflowError('overflow')
        totals[row['key']] = total
    return [{'key': key, 'quantity': value} for key, value in totals.items()]

def envelope(rows):
    try:
        return {'ok': aggregate(rows)}
    except (TypeError, OverflowError) as error:
        return {'error': str(error)}

if __name__ == '__main__':
    print(json.dumps([envelope(rows) for rows in json.load(sys.stdin)], ensure_ascii=True))
