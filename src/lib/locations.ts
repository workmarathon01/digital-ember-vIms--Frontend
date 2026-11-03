import type { Building, Floor, Unit } from "./types";

type IdLike = number | string | null | undefined;

function matches(value: number | null | undefined, id: IdLike): boolean {
  if (id === null || id === undefined || id === "") return false;
  return value !== null && value !== undefined && String(value) === String(id);
}

/** Buildings that belong to the selected site. */
export function buildingsForSite(
  buildings: Building[],
  siteId: IdLike,
): Building[] {
  if (!siteId) return [];
  return buildings.filter((building) => matches(building.site_id, siteId));
}

/** Floors that belong to the selected building. */
export function floorsForBuilding(
  floors: Floor[],
  buildingId: IdLike,
): Floor[] {
  if (!buildingId) return [];
  return floors.filter((floor) => matches(floor.building_id, buildingId));
}

/** Floors that belong to the selected site, across all its buildings. */
export function floorsForSite(floors: Floor[], siteId: IdLike): Floor[] {
  if (!siteId) return [];
  return floors.filter((floor) => matches(floor.site_id, siteId));
}

/** Units that belong to the selected floor. */
export function unitsForFloor(units: Unit[], floorId: IdLike): Unit[] {
  if (!floorId) return [];
  return units.filter((unit) => matches(unit.floor_id, floorId));
}

/** Units that belong to the selected building. */
export function unitsForBuilding(units: Unit[], buildingId: IdLike): Unit[] {
  if (!buildingId) return [];
  return units.filter((unit) => matches(unit.building_id, buildingId));
}

/** Units that belong to the selected site, across all its buildings. */
export function unitsForSite(units: Unit[], siteId: IdLike): Unit[] {
  if (!siteId) return [];
  return units.filter((unit) => matches(unit.site_id, siteId));
}

export function findUnit(units: Unit[], unitId: IdLike): Unit | undefined {
  if (!unitId) return undefined;
  return units.find((unit) => matches(unit.id, unitId));
}
