"""
Neovisna provjera rezultata drugom metodom: Google OR-Tools (routing solver).

Ne koristi nijednu liniju koda iz aplikacije: podaci su prepisani iz PDF-a zadatka,
a model je napisan ispočetka. Ako OR-Tools ne nađe kraći valjani raspored od
rezultata aplikacije, to je neovisna potvrda.

Pokretanje:  pip install ortools   pa   python verify_ortools.py
"""
import math

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

# --- Podaci iz zadatka ---------------------------------------------------------
LOCATIONS = {
    "L0": (0, 0), "L1": (3, 8), "L2": (10, 11), "L3": (17, 9), "L4": (9, -6),
    "L5": (26, 3), "L6": (-7, 13), "L7": (20, -8), "L8": (23, 15), "L9": (-8, -5),
}
WEIGHTS = {
    "M01": 800, "M02": 1300, "M03": 1800, "M04": 2400, "M05": 3100,
    "M06": 3900, "M07": 4800, "M08": 6100, "M09": 7500, "M10": 9400,
}
ORDERS = [  # (nalog, stroj, preuzimanje, isporuka)
    ("N01", "M01", "L1", "L3"), ("N02", "M02", "L2", "L5"), ("N03", "M03", "L9", "L4"),
    ("N04", "M04", "L3", "L0"), ("N05", "M05", "L0", "L8"), ("N06", "M06", "L5", "L7"),
    ("N07", "M07", "L8", "L2"), ("N08", "M08", "L4", "L9"), ("N09", "M09", "L6", "L1"),
    ("N10", "M10", "L7", "L3"),
]
TRUCKS = [("A", 3500, 2), ("B", 10000, 3)]  # (oznaka, nosivost kg, max strojeva)
SPEED_KMH, SERVICE_MIN, WORKDAY_MIN = 60, 20, 9 * 60

# --- Čvorovi: 0 = baza, zatim preuzimanje i isporuka za svaki nalog --------------
nodes = [("baza", "L0", 0)]
pairs = []
for order_id, machine, pickup, delivery in ORDERS:
    w = WEIGHTS[machine]
    pairs.append((len(nodes), len(nodes) + 1))
    nodes.append((f"{order_id} preuzimanje", pickup, w))
    nodes.append((f"{order_id} isporuka", delivery, -w))


def dist_tenths(a: str, b: str) -> int:
    """Euklidska udaljenost zaokružena na 0,1 km, izražena u desetinkama km."""
    (x1, y1), (x2, y2) = LOCATIONS[a], LOCATIONS[b]
    return round(round(math.hypot(x1 - x2, y1 - y2), 1) * 10)


n = len(nodes)
manager = pywrapcp.RoutingIndexManager(n, len(TRUCKS), 0)
routing = pywrapcp.RoutingModel(manager)


def node(index):
    return manager.IndexToNode(index)


# Cilj: ukupna kilometraža
dist_cb = routing.RegisterTransitCallback(
    lambda i, j: dist_tenths(nodes[node(i)][1], nodes[node(j)][1])
)
routing.SetArcCostEvaluatorOfAllVehicles(dist_cb)

# Nosivost (kg) i broj strojeva, po kamionu
weight_cb = routing.RegisterUnaryTransitCallback(lambda i: nodes[node(i)][2])
routing.AddDimensionWithVehicleCapacity(weight_cb, 0, [t[1] for t in TRUCKS], True, "kg")
count_cb = routing.RegisterUnaryTransitCallback(
    lambda i: (nodes[node(i)][2] > 0) - (nodes[node(i)][2] < 0)
)
routing.AddDimensionWithVehicleCapacity(count_cb, 0, [t[2] for t in TRUCKS], True, "strojevi")

# Vrijeme u desetinkama minute: vožnja (pri 60 km/h 1 km = 1 min) + 20 min po radnji
def time_tenths(i, j):
    service = 0 if node(i) == 0 else SERVICE_MIN * 10
    return service + dist_tenths(nodes[node(i)][1], nodes[node(j)][1]) * 60 // SPEED_KMH


time_cb = routing.RegisterTransitCallback(time_tenths)
routing.AddDimension(time_cb, 0, WORKDAY_MIN * 10, True, "vrijeme")
time_dim = routing.GetDimensionOrDie("vrijeme")

# Preuzimanje i isporuka: isti kamion, preuzimanje prije isporuke
for p, d in pairs:
    pi, di = manager.NodeToIndex(p), manager.NodeToIndex(d)
    routing.AddPickupAndDelivery(pi, di)
    routing.solver().Add(routing.VehicleVar(pi) == routing.VehicleVar(di))
    routing.solver().Add(time_dim.CumulVar(pi) <= time_dim.CumulVar(di))

params = pywrapcp.DefaultRoutingSearchParameters()
params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
params.time_limit.seconds = 60

solution = routing.SolveWithParameters(params)
if not solution:
    raise SystemExit("OR-Tools nije pronašao valjano rješenje.")

total = 0
for v, (truck, _, _) in enumerate(TRUCKS):
    index = routing.Start(v)
    stops, km = [], 0
    while not routing.IsEnd(index):
        nxt = solution.Value(routing.NextVar(index))
        km += dist_tenths(nodes[node(index)][1], nodes[node(nxt)][1])
        if not routing.IsEnd(nxt):
            stops.append(f"{nodes[node(nxt)][1]} {nodes[node(nxt)][0]}")
        index = nxt
    minutes = solution.Value(time_dim.CumulVar(routing.End(v))) / 10
    total += km
    print(f"\nKamion {truck}: {km / 10:.1f} km, {minutes:.1f} min")
    for s in stops:
        print("  ", s)

print(f"\nUkupno (OR-Tools): {total / 10:.1f} km")
print("Rezultat aplikacije:  200.1 km")