"""Refresh dated road estimates; run from repository root. Requires Python 3 and curl."""
import json, subprocess, datetime
from pathlib import Path
locations = json.loads(Path('data/locations.json').read_text())
points = locations['offices'] + locations['cities']
coords = ';'.join(f"{p['lng']},{p['lat']}" for p in points)
url = 'https://router.project-osrm.org/table/v1/driving/' + coords + '?annotations=distance,duration&destinations=' + ';'.join(map(str,range(len(locations['offices']))))
response = json.loads(subprocess.check_output(['curl','--fail','-sS','--max-time','45',url]))
assert response['code'] == 'Ok', response
routes = {}
for i, origin in enumerate(points):
    routes[origin['id']] = {}
    for j, office in enumerate(locations['offices']):
        distance, duration = response['distances'][i][j], response['durations'][i][j]
        if distance is None or duration is None:
            raise ValueError(f"Unreachable route: {origin['id']} -> {office['id']}")
        routes[origin['id']][office['id']] = {'distance': distance, 'duration': duration}
Path('data/routes.json').write_text(json.dumps({'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'provider':'OSRM / OpenStreetMap','routes':routes},indent=2)+'\n')
print(f'Saved {len(points) * len(locations["offices"])} directional road estimates.')
