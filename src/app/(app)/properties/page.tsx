"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  DoorOpen,
  Home,
  Layers3,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import {
  createBuilding,
  createFloor,
  createSite,
  createUnit,
  createUserSite,
  deleteSite,
  deleteUnit,
  deleteUserSite,
  fetchLocationDirectory,
  fetchUserSites,
  fetchUsers,
  makePrimaryUserSite,
} from "@/lib/api";
import {
  buildingsForSite,
  floorsForBuilding,
  unitsForFloor,
} from "@/lib/locations";
import type { Building, Floor, Site, Unit, User, UserSite } from "@/lib/types";

const emptySite = { name: "", code: "", region: "", city: "", state: "" };
const emptyBuilding = { site_id: "", name: "", code: "" };
const emptyFloor = { site_id: "", building_id: "", name: "", level: "" };
const emptyUnit = {
  site_id: "",
  building_id: "",
  floor_id: "",
  name: "",
  unit_type: "",
  carpet_area: "",
};
const emptyAssignment = {
  user_id: "",
  site_id: "",
  building_id: "",
  floor_id: "",
  unit_id: "",
  ownership: "owner",
  is_primary: false,
};

type SiteForm = typeof emptySite;
type BuildingForm = typeof emptyBuilding;
type FloorForm = typeof emptyFloor;
type UnitForm = typeof emptyUnit;
type AssignmentForm = typeof emptyAssignment;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "The request could not be completed.";
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Home;
}) {
  return (
    <Card className="flex items-center gap-3 px-4 py-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-canvas-2">
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-xl font-bold leading-tight text-ink">{value.toLocaleString()}</p>
        <p className="text-xs font-medium text-muted">{label}</p>
      </div>
    </Card>
  );
}

export default function PropertiesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [userSites, setUserSites] = useState<UserSite[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [siteForm, setSiteForm] = useState<SiteForm>(emptySite);
  const [buildingForm, setBuildingForm] = useState<BuildingForm>(emptyBuilding);
  const [floorForm, setFloorForm] = useState<FloorForm>(emptyFloor);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnit);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignment);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [locationRes, assignmentRes, userRes] = await Promise.all([
        fetchLocationDirectory(),
        fetchUserSites(),
        fetchUsers(),
      ]);
      setSites(locationRes.sites);
      setBuildings(locationRes.buildings);
      setFloors(locationRes.floors);
      setUnits(locationRes.units);
      setUserSites(assignmentRes.data);
      setUsers(userRes.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Loading is async; state updates happen after the network round-trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function submit(action: () => Promise<unknown>, success: string, reset: () => void) {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await action();
      reset();
      await load();
      setNotice(success);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(action: () => Promise<void>, success: string) {
    if (!window.confirm("Remove this record? Associations will block deletion.")) return;
    await submit(action, success, () => undefined);
  }

  const totalResidents = userSites.length;

  const floorFormBuildings = buildingsForSite(buildings, floorForm.site_id);
  const unitFormBuildings = buildingsForSite(buildings, unitForm.site_id);
  const unitFormFloors = floorsForBuilding(floors, unitForm.building_id);
  const assignmentBuildings = buildingsForSite(
    buildings,
    assignmentForm.site_id,
  );
  const assignmentFloors = floorsForBuilding(
    floors,
    assignmentForm.building_id,
  );
  const assignmentUnits = unitsForFloor(units, assignmentForm.floor_id);

  return (
    <div>
      <header className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <Building2 className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Sites &amp; Properties
        </h1>
        <p className="mt-1 text-sm text-muted">
          Model your portfolio as Site → Building → Floor → Unit, then attach residents to a flat.
        </p>
      </header>

      {notice ? (
        <div className="mb-5 rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm font-medium text-success">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-5 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-sm font-medium text-warn">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Metric label="Sites" value={sites.length} icon={MapPin} />
        <Metric label="Buildings" value={buildings.length} icon={Building2} />
        <Metric label="Floors" value={floors.length} icon={Layers3} />
        <Metric label="Units" value={units.length} icon={DoorOpen} />
        <Metric label="Residents" value={totalResidents} icon={Users} />
      </section>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading property tree…
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Sites"
            subtitle="Top-level campuses, societies or offices."
            action={<Home className="h-4 w-4 text-muted" />}
          >
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(
                  () =>
                    createSite({
                      name: siteForm.name,
                      code: siteForm.code || undefined,
                      region: siteForm.region || undefined,
                      city: siteForm.city || undefined,
                      state: siteForm.state || undefined,
                    }),
                  "Site created successfully.",
                  () => setSiteForm(emptySite),
                );
              }}
            >
              <Field label="Site name" required>
                <TextInput
                  required
                  value={siteForm.name}
                  placeholder="e.g. Riverside Campus"
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                />
              </Field>
              <Field label="Code" hint="Generated when blank.">
                <TextInput
                  value={siteForm.code}
                  placeholder="SITE-PUNE"
                  onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value })}
                />
              </Field>
              <Field label="Region">
                <TextInput
                  value={siteForm.region}
                  onChange={(e) => setSiteForm({ ...siteForm, region: e.target.value })}
                />
              </Field>
              <Field label="City">
                <TextInput
                  value={siteForm.city}
                  onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add site
                </Button>
              </div>
            </form>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="px-3 py-2">Site</th>
                    <th className="px-3 py-2">Units</th>
                    <th className="px-3 py-2">Residents</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {sites.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted">
                        No sites yet.
                      </td>
                    </tr>
                  ) : (
                    sites.map((site) => (
                      <tr key={site.id} className="border-b border-line-soft text-[13px]">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-ink">{site.name}</p>
                          <p className="font-mono text-[11px] text-muted">{site.code}</p>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{site.units_count}</td>
                        <td className="px-3 py-2.5 text-muted">{site.residents_count}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            aria-label={`Delete ${site.name}`}
                            className="text-muted hover:text-warn"
                            onClick={() => void remove(() => deleteSite(site.id), "Site removed.")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Buildings"
            subtitle="Every building belongs to exactly one site."
            action={<Building2 className="h-4 w-4 text-muted" />}
          >
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(
                  () =>
                    createBuilding({
                      site_id: Number(buildingForm.site_id),
                      name: buildingForm.name,
                      code: buildingForm.code || undefined,
                    }),
                  "Building created successfully.",
                  () => setBuildingForm(emptyBuilding),
                );
              }}
            >
              <Field label="Site" required>
                <Select
                  required
                  value={buildingForm.site_id}
                  onChange={(e) => setBuildingForm({ ...buildingForm, site_id: e.target.value })}
                >
                  <option value="">Select a site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Building name" required>
                <TextInput
                  required
                  value={buildingForm.name}
                  placeholder="e.g. Tower A"
                  onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add building
                </Button>
              </div>
            </form>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="px-3 py-2">Building</th>
                    <th className="px-3 py-2">Floors</th>
                    <th className="px-3 py-2">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted">
                        No buildings yet.
                      </td>
                    </tr>
                  ) : (
                    buildings.map((building) => (
                      <tr key={building.id} className="border-b border-line-soft text-[13px]">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-ink">{building.name}</p>
                          <p className="text-[11px] text-muted">{building.site_name}</p>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{building.floors_count}</td>
                        <td className="px-3 py-2.5 text-muted">{building.units_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Floors"
            subtitle="Floors sit inside a building and group the units."
            action={<Layers3 className="h-4 w-4 text-muted" />}
          >
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(
                  () =>
                    createFloor({
                      building_id: Number(floorForm.building_id),
                      name: floorForm.name,
                      level: floorForm.level ? Number(floorForm.level) : undefined,
                    }),
                  "Floor created successfully.",
                  () => setFloorForm(emptyFloor),
                );
              }}
            >
              <Field label="Site" required>
                <Select
                  required
                  value={floorForm.site_id}
                  onChange={(e) =>
                    setFloorForm({
                      ...floorForm,
                      site_id: e.target.value,
                      building_id: "",
                    })
                  }
                >
                  <option value="">Select a site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Building" required>
                <Select
                  required
                  value={floorForm.building_id}
                  onChange={(e) =>
                    setFloorForm({ ...floorForm, building_id: e.target.value })
                  }
                  disabled={!floorForm.site_id || floorFormBuildings.length === 0}
                >
                  <option value="">
                    {!floorForm.site_id
                      ? "Select a site first"
                      : floorFormBuildings.length === 0
                        ? "No buildings at this site"
                        : "Select a building"}
                  </option>
                  {floorFormBuildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Floor name" required>
                <TextInput
                  required
                  value={floorForm.name}
                  placeholder="e.g. 4th Floor"
                  onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                />
              </Field>
              <Field label="Level" hint="Derived from the name when blank.">
                <TextInput
                  type="number"
                  value={floorForm.level}
                  onChange={(e) => setFloorForm({ ...floorForm, level: e.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add floor
                </Button>
              </div>
            </form>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="px-3 py-2">Floor</th>
                    <th className="px-3 py-2">Building</th>
                    <th className="px-3 py-2">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {floors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted">
                        No floors yet.
                      </td>
                    </tr>
                  ) : (
                    floors.map((floor) => (
                      <tr key={floor.id} className="border-b border-line-soft text-[13px]">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-ink">{floor.name}</p>
                          <p className="text-[11px] text-muted">{floor.site_name}</p>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{floor.building_name}</td>
                        <td className="px-3 py-2.5 text-muted">{floor.units_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Units"
            subtitle="Flats, offices or any occupiable space."
            action={<DoorOpen className="h-4 w-4 text-muted" />}
          >
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(
                  () =>
                    createUnit({
                      floor_id: Number(unitForm.floor_id),
                      name: unitForm.name,
                      unit_type: unitForm.unit_type || undefined,
                      carpet_area: unitForm.carpet_area ? Number(unitForm.carpet_area) : undefined,
                    }),
                  "Unit created successfully.",
                  () => setUnitForm(emptyUnit),
                );
              }}
            >
              <Field label="Site" required>
                <Select
                  required
                  value={unitForm.site_id}
                  onChange={(e) =>
                    setUnitForm({
                      ...unitForm,
                      site_id: e.target.value,
                      building_id: "",
                      floor_id: "",
                    })
                  }
                >
                  <option value="">Select a site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Building" required>
                <Select
                  required
                  value={unitForm.building_id}
                  onChange={(e) =>
                    setUnitForm({
                      ...unitForm,
                      building_id: e.target.value,
                      floor_id: "",
                    })
                  }
                  disabled={!unitForm.site_id || unitFormBuildings.length === 0}
                >
                  <option value="">
                    {!unitForm.site_id
                      ? "Select a site first"
                      : unitFormBuildings.length === 0
                        ? "No buildings at this site"
                        : "Select a building"}
                  </option>
                  {unitFormBuildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Floor" required>
                <Select
                  required
                  value={unitForm.floor_id}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, floor_id: e.target.value })
                  }
                  disabled={!unitForm.building_id || unitFormFloors.length === 0}
                >
                  <option value="">
                    {!unitForm.building_id
                      ? "Select a building first"
                      : unitFormFloors.length === 0
                        ? "No floors in this building"
                        : "Select a floor"}
                  </option>
                  {unitFormFloors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Unit name / number" required>
                <TextInput
                  required
                  value={unitForm.name}
                  placeholder="e.g. A-101"
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                />
              </Field>
              <Field label="Unit type">
                <TextInput
                  value={unitForm.unit_type}
                  placeholder="2BHK / Office"
                  onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value })}
                />
              </Field>
              <Field label="Carpet area (sq.ft.)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={unitForm.carpet_area}
                  onChange={(e) => setUnitForm({ ...unitForm, carpet_area: e.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add unit
                </Button>
              </div>
            </form>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Residents</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted">
                        No units yet.
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.id} className="border-b border-line-soft text-[13px]">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-ink">{unit.name}</p>
                          <p className="text-[11px] text-muted">{unit.unit_type ?? "—"}</p>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{unit.location_label}</td>
                        <td className="px-3 py-2.5 text-muted">{unit.residents_count}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            aria-label={`Delete unit ${unit.name}`}
                            className="text-muted hover:text-warn"
                            onClick={() => void remove(() => deleteUnit(unit.id), "Unit removed.")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      <div className="mt-6">
        <SectionCard
          title="Resident Assignments"
          subtitle="Attach a user to a site, building, floor or flat. One association can be primary."
          action={<UserRound className="h-4 w-4 text-muted" />}
        >
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(
                () =>
                  createUserSite({
                    user_id: Number(assignmentForm.user_id),
                    site_id: Number(assignmentForm.site_id),
                    building_id: assignmentForm.building_id
                      ? Number(assignmentForm.building_id)
                      : undefined,
                    floor_id: assignmentForm.floor_id
                      ? Number(assignmentForm.floor_id)
                      : undefined,
                    unit_id: assignmentForm.unit_id ? Number(assignmentForm.unit_id) : undefined,
                    ownership: assignmentForm.ownership,
                    is_primary: assignmentForm.is_primary,
                    lives_here: true,
                    is_approved: true,
                  }),
                "Residence associated successfully.",
                () => setAssignmentForm(emptyAssignment),
              );
            }}
          >
            <Field label="User" required>
              <Select
                required
                value={assignmentForm.user_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, user_id: e.target.value })}
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Site" required>
              <Select
                required
                value={assignmentForm.site_id}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    site_id: e.target.value,
                    building_id: "",
                    floor_id: "",
                    unit_id: "",
                  })
                }
              >
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Building" hint="Optional — narrow the location.">
              <Select
                value={assignmentForm.building_id}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    building_id: e.target.value,
                    floor_id: "",
                    unit_id: "",
                  })
                }
                disabled={!assignmentForm.site_id || assignmentBuildings.length === 0}
              >
                <option value="">
                  {!assignmentForm.site_id
                    ? "Select a site first"
                    : assignmentBuildings.length === 0
                      ? "No buildings at this site"
                      : "Any building"}
                </option>
                {assignmentBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Floor" hint="Optional — narrow the location.">
              <Select
                value={assignmentForm.floor_id}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    floor_id: e.target.value,
                    unit_id: "",
                  })
                }
                disabled={!assignmentForm.building_id || assignmentFloors.length === 0}
              >
                <option value="">
                  {!assignmentForm.building_id
                    ? "Select a building first"
                    : assignmentFloors.length === 0
                      ? "No floors in this building"
                      : "Any floor"}
                </option>
                {assignmentFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit"
            //  hint="Optional — choose a unit or a site-only association."
            >
              <Select
                value={assignmentForm.unit_id}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, unit_id: e.target.value })
                }
                disabled={!assignmentForm.floor_id || assignmentUnits.length === 0}
              >
                <option value="">
                  {!assignmentForm.floor_id
                    ? "Select a floor first"
                    : assignmentUnits.length === 0
                      ? "No units on this floor"
                      : "No unit"}
                </option>
                {assignmentUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ownership">
              <Select
                value={assignmentForm.ownership}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, ownership: e.target.value })
                }
              >
                {["owner", "tenant", "family", "member", "staff", "other"].map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <input
                type="checkbox"
                checked={assignmentForm.is_primary}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, is_primary: e.target.checked })
                }
              />
              Primary residence
            </label>
            <div className="xl:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Associate residence
              </Button>
            </div>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Resident</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Ownership</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userSites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted">
                      No resident assignments yet.
                    </td>
                  </tr>
                ) : (
                  userSites.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-line-soft text-[13px]">
                      <td className="py-2.5 pr-3 font-medium text-ink">
                        {assignment.user_name ?? `User #${assignment.user_id}`}
                      </td>
                      <td className="px-3 py-2.5 text-muted">{assignment.location_label}</td>
                      <td className="px-3 py-2.5 capitalize text-muted">{assignment.ownership}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignment.is_primary ? (
                            <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">
                              primary
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              assignment.is_approved
                                ? "bg-info-bg text-info"
                                : "bg-warn-bg text-warn"
                            }`}
                          >
                            {assignment.is_approved ? "approved" : "pending"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-3">
                          {!assignment.is_primary ? (
                            <button
                              type="button"
                              aria-label="Make primary"
                              className="text-muted hover:text-accent"
                              onClick={() =>
                                void submit(
                                  () => makePrimaryUserSite(assignment.id),
                                  "Primary residence updated.",
                                  () => undefined,
                                )
                              }
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            aria-label="Remove association"
                            className="text-muted hover:text-warn"
                            onClick={() =>
                              void remove(
                                () => deleteUserSite(assignment.id),
                                "Residence association removed.",
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
