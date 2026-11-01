"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
} from "lucide-react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import {
  createFeature,
  deleteFeature,
  fetchAllUsers,
  fetchFeatures,
  fetchFeatureTemplates,
  fetchSiteFeatures,
  fetchSites,
  fetchUserFeatures,
  refreshSession,
  updateSiteFeatures,
  updateUserFeatures,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can, superAdminOnlyFeatures } from "@/lib/permissions";
import type {
  Feature,
  FeatureCategory,
  FeatureOverrideState,
  FeatureTemplate,
  Site,
  SiteFeatureAccess,
  User,
  UserFeatureAccess,
} from "@/lib/types";

const categories: FeatureCategory[] = [
  "operations",
  "security",
  "resident",
  "reporting",
  "platform",
  "general",
];

const emptyCatalogForm = {
  name: "",
  key: "",
  category: "operations" as FeatureCategory,
  description: "",
};

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
  icon: typeof Sparkles;
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

export default function FeaturesPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const canCreateFeature = can(currentUser, "features", "create");
  const canDeleteFeature = can(currentUser, "features", "destroy");
  const canUpdateSiteFeatures = can(currentUser, "site_features", "update");
  const canUpdateUserFeatures = can(currentUser, "user_features", "update");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [templates, setTemplates] = useState<FeatureTemplate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [catalogForm, setCatalogForm] = useState(emptyCatalogForm);
  const [catalogTemplateKey, setCatalogTemplateKey] = useState("");
  const [siteId, setSiteId] = useState("");
  const [siteAccess, setSiteAccess] = useState<SiteFeatureAccess | null>(null);
  const [siteFeatureIds, setSiteFeatureIds] = useState<number[]>([]);
  const [userId, setUserId] = useState("");
  const [userSiteId, setUserSiteId] = useState("");
  const [userAccess, setUserAccess] = useState<UserFeatureAccess | null>(null);
  const [overrideStates, setOverrideStates] = useState<
    Record<number, FeatureOverrideState>
  >({});

  const [summarySiteId, setSummarySiteId] = useState("");
  const [userSummary, setUserSummary] = useState<
    Record<number, UserFeatureAccess>
  >({});
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSiteAccess(id: number) {
    const access = await fetchSiteFeatures(id);
    const reservedIds = new Set(
      access.features
        .filter((feature) => superAdminOnlyFeatures.has(feature.key))
        .map((feature) => feature.id),
    );
    setSiteAccess(access);
    setSiteFeatureIds(
      access.enabled_feature_ids.filter((featureId) => !reservedIds.has(featureId)),
    );
    return access;
  }

  async function loadUserAccess(id: number, selectedSiteId: number) {
    const access = await fetchUserFeatures(id, selectedSiteId);
    setUserAccess(access);
    setOverrideStates(
      Object.fromEntries(
        access.features
          .filter((feature) => !superAdminOnlyFeatures.has(feature.key))
          .map((feature) => [feature.id, feature.override]),
      ),
    );
    return access;
  }

  async function loadUserSummary(
    selectedSiteId: string,
    userList: User[] = users,
  ) {
    if (!selectedSiteId || userList.length === 0) {
      setUserSummary({});
      return;
    }

    setSummaryLoading(true);
    try {
      const entries = await Promise.all(
        userList.map(async (listedUser) => {
          const access = await fetchUserFeatures(
            listedUser.id,
            Number(selectedSiteId),
          );
          return [listedUser.id, access] as const;
        }),
      );
      setUserSummary(Object.fromEntries(entries));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadBase() {
    try {
      const [featureRes, templateRes, siteRes, userRes] = await Promise.all([
        fetchFeatures(),
        fetchFeatureTemplates(),
        fetchSites(),
        fetchAllUsers(),
      ]);
      setFeatures(
        featureRes.data.filter(
          (feature) => !superAdminOnlyFeatures.has(feature.key),
        ),
      );
      setTemplates(templateRes);
      setSites(siteRes.data);
      setUsers(userRes);

      const firstSite = siteRes.data[0];
      if (firstSite) {
        setSiteId(String(firstSite.id));
        setSummarySiteId(String(firstSite.id));
        await Promise.all([
          loadSiteAccess(firstSite.id),
          loadUserSummary(String(firstSite.id), userRes),
        ]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial loading is async; state updates happen after the network round-trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBase();
    // The initial loader is intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(task: string, action: () => Promise<void>, success: string) {
    setError(null);
    setNotice(null);
    setSaving(task);
    try {
      await action();
      setNotice(success);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  async function chooseSite(value: string) {
    setSiteId(value);
    setSiteAccess(null);
    setSiteFeatureIds([]);
    if (!value) return;

    try {
      await loadSiteAccess(Number(value));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function chooseUser(value: string) {
    setUserId(value);
    setUserAccess(null);
    setOverrideStates({});
    if (!value) {
      setUserSiteId("");
      return;
    }

    const selectedUser = users.find((user) => String(user.id) === value);
    const preferredSite = selectedUser?.current_site_id
      ? String(selectedUser.current_site_id)
      : siteId;
    setUserSiteId(preferredSite);

    if (!preferredSite) return;

    try {
      await loadUserAccess(Number(value), Number(preferredSite));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function chooseUserSite(value: string) {
    setUserSiteId(value);
    setUserAccess(null);
    setOverrideStates({});
    if (!userId || !value) return;

    try {
      await loadUserAccess(Number(userId), Number(value));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function chooseSummarySite(value: string) {
    setSummarySiteId(value);
    setUserSummary({});
    await loadUserSummary(value);
  }

  async function reviewUser(listedUser: User) {
    if (!summarySiteId) return;

    setUserId(String(listedUser.id));
    setUserSiteId(summarySiteId);
    setUserAccess(null);
    setOverrideStates({});

    try {
      await loadUserAccess(listedUser.id, Number(summarySiteId));
      document
        .getElementById("user-overrides")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function toggleSiteFeature(featureId: number) {
    setSiteFeatureIds((current) =>
      current.includes(featureId)
        ? current.filter((id) => id !== featureId)
        : [...current, featureId],
    );
  }

  const activeFeatures = features.filter((feature) => feature.active).length;
  const availableTemplates = templates.filter(
    (template) => !features.some((feature) => feature.key === template.key),
  );
  const siteFeatures = siteAccess
    ? siteAccess.features.filter(
        (feature) => !superAdminOnlyFeatures.has(feature.key),
      )
    : [];
  const userAccessFeatures = userAccess
    ? userAccess.features.filter(
        (feature) => !superAdminOnlyFeatures.has(feature.key),
      )
    : [];
  const overriddenFeatures = userAccessFeatures.filter(
    (feature) => feature.override !== "inherit",
  ).length;

  return (
    <div>
      <header className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <Sparkles className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Feature Access
        </h1>
        <p className="mt-1 text-sm text-muted">
          Define reusable capabilities, enable them per site, and fine-tune access for individual users.
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

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Catalog features" value={features.length} icon={Sparkles} />
        <Metric label="Active features" value={activeFeatures} icon={ShieldCheck} />
        <Metric
          label="Site enabled"
          value={siteAccess?.enabled_count ?? 0}
          icon={Layers3}
        />
        <Metric label="User overrides" value={overriddenFeatures} icon={UserCog} />
      </section>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading feature catalog…
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Feature Catalog"
            subtitle="A feature is a module or capability that can be enabled independently."
            action={<Sparkles className="h-4 w-4 text-muted" />}
          >
            {canCreateFeature ? (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(e) => {
                e.preventDefault();
                void run(
                  "catalog",
                  async () => {
                    await createFeature({
                      name: catalogForm.name,
                      key: catalogForm.key || undefined,
                      category: catalogForm.category,
                      description: catalogForm.description || undefined,
                    });
                    setCatalogForm(emptyCatalogForm);
                    setCatalogTemplateKey("");
                    const refreshed = await fetchFeatures();
                    setFeatures(
                      refreshed.data.filter(
                        (feature) => !superAdminOnlyFeatures.has(feature.key),
                      ),
                    );
                  },
                  "Feature added to the catalog.",
                );
              }}
            >
              <Field
                label="Feature name"
                required
                hint="Select a standard capability to use its stable key, name and category. Choose Custom feature for anything else."
              >
                <Select
                  required
                  value={catalogTemplateKey}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCatalogTemplateKey(value);
                    const template = templates.find((item) => item.key === value);
                    if (template) {
                      setCatalogForm({
                        name: template.name,
                        key: template.key,
                        category: template.category,
                        description: template.description,
                      });
                    } else {
                      setCatalogForm({
                        ...emptyCatalogForm,
                        category: catalogForm.category,
                      });
                    }
                  }}
                >
                  <option value="">Select feature name</option>
                  {availableTemplates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                  <option value="__custom__">Custom feature</option>
                </Select>
              </Field>
              {catalogTemplateKey === "__custom__" ? (
                <Field label="Custom feature name" required>
                  <TextInput
                    required
                    value={catalogForm.name}
                    placeholder="e.g. Parking Management"
                    onChange={(e) =>
                      setCatalogForm({ ...catalogForm, name: e.target.value })
                    }
                  />
                </Field>
              ) : null}
              <Field label="Category">
                <Select
                  value={catalogForm.category}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      category: e.target.value as FeatureCategory,
                    })
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Description">
                <TextInput
                  value={catalogForm.description}
                  placeholder="What does this capability unlock?"
                  onChange={(e) =>
                    setCatalogForm({ ...catalogForm, description: e.target.value })
                  }
                />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving === "catalog"}>
                  {saving === "catalog" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add feature
                </Button>
              </div>
              </form>
            ) : null}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="px-3 py-2">Feature</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Sites</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {features.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted">
                        No features in the catalog yet. Add a standard feature above
                        or run <code className="font-mono">bin/rails db:seed</code>.
                      </td>
                    </tr>
                  ) : (
                    features.map((feature) => (
                      <tr key={feature.id} className="border-b border-line-soft text-[13px]">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-ink">{feature.name}</p>
                          <p className="font-mono text-[11px] text-muted">{feature.key}</p>
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          {feature.category}
                        </td>
                        <td className="px-3 py-2.5 text-muted">{feature.sites_count}</td>
                        <td className="px-3 py-2.5 text-right">
                          {canDeleteFeature ? (
                            <button
                              type="button"
                              aria-label={`Delete ${feature.name}`}
                              className="text-muted hover:text-warn"
                              onClick={() => {
                                if (!window.confirm(`Delete ${feature.name}?`)) return;
                                void run(
                                  `delete-${feature.id}`,
                                  async () => {
                                    await deleteFeature(feature.id);
                                    const refreshed = await fetchFeatures();
                                    setFeatures(refreshed.data);
                                  },
                                  "Feature removed from the catalog.",
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Site Entitlements"
            subtitle="Enable the capabilities available to everyone at a site."
            action={<Layers3 className="h-4 w-4 text-muted" />}
          >
            <Field label="Site">
              <Select value={siteId} onChange={(e) => void chooseSite(e.target.value)}>
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.display_name} ({site.code})
                  </option>
                ))}
              </Select>
            </Field>

            {siteAccess ? (
              <>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {siteFeatures.map((feature) => {
                    const checked = siteFeatureIds.includes(feature.id);
                    return (
                      <label
                        key={feature.id}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition ${
                          checked
                            ? "border-accent/40 bg-accent/5 text-ink"
                            : "border-line bg-card text-muted hover:bg-canvas-2"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          disabled={!canUpdateSiteFeatures}
                          onChange={() => toggleSiteFeature(feature.id)}
                        />
                        <span>
                          <span className="block font-medium text-ink">{feature.name}</span>
                          <span className="block font-mono text-[10px] text-muted">
                            {feature.key}
                          </span>
                          <span className="block text-[11px] text-muted">
                            {feature.category}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted">
                    {siteFeatureIds.length} of {siteFeatures.length} features enabled
                  </p>
                  {canUpdateSiteFeatures ? (
                    <Button
                      type="button"
                      disabled={saving === "site"}
                      onClick={() =>
                        void run(
                          "site",
                        async () => {
                          await updateSiteFeatures(Number(siteId), siteFeatureIds);
                          await loadSiteAccess(Number(siteId));
                          if (userAccess && userSiteId === siteId) {
                            await loadUserAccess(Number(userId), Number(userSiteId));
                          }
                          if (summarySiteId === siteId) {
                            await loadUserSummary(summarySiteId);
                          }
                        },
                        "Site feature access updated.",
                      )
                    }
                  >
                    {saving === "site" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                      Save site access
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Select a site to review and change its feature access.
              </p>
            )}
          </SectionCard>

          <div className="xl:col-span-2">
            <SectionCard
              title="User Access Overview"
              subtitle="See which features each user can actually use at a site. Click Review to inspect or change that user's overrides."
              action={<ShieldCheck className="h-4 w-4 text-muted" />}
            >
              <Field label="Site">
                <Select
                  value={summarySiteId}
                  onChange={(e) => void chooseSummarySite(e.target.value)}
                >
                  <option value="">Select a site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.display_name} ({site.code})
                    </option>
                  ))}
                </Select>
              </Field>

              {summaryLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading user access…
                </div>
              ) : users.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No users found.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Effective access</th>
                        <th className="px-3 py-2">Overrides</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((listedUser) => {
                        const access = userSummary[listedUser.id];
                        const effectiveFeatures = access
                          ? access.features.filter(
                              (feature) =>
                                feature.effective &&
                                !superAdminOnlyFeatures.has(feature.key),
                            )
                          : [];
                        const overrideCount = access
                          ? access.features.filter(
                              (feature) => feature.override !== "inherit",
                            ).length
                          : 0;

                        return (
                          <tr
                            key={listedUser.id}
                            className="border-b border-line-soft text-[13px]"
                          >
                            <td className="py-2.5 pr-3">
                              <p className="font-medium text-ink">
                                {listedUser.full_name}
                              </p>
                              <p className="text-[11px] text-muted">
                                {listedUser.email}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 text-muted">
                              {listedUser.role_label ?? "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              {!access ? (
                                <span className="text-muted">—</span>
                              ) : effectiveFeatures.length === 0 ? (
                                <span className="text-muted">No features</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {effectiveFeatures.map((feature) => (
                                    <span
                                      key={feature.id}
                                      className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success"
                                    >
                                      {feature.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-muted">
                              {!access
                                ? "—"
                                : overrideCount > 0
                                  ? `${overrideCount} custom`
                                  : "Site default"}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void reviewUser(listedUser)}
                                disabled={!summarySiteId}
                              >
                                Review
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          <div id="user-overrides" className="xl:col-span-2">
            <SectionCard
              title="User Overrides"
              subtitle="Inherit the site default, grant explicitly, or revoke a capability for one person."
              action={<UserCog className="h-4 w-4 text-muted" />}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="User">
                  <Select value={userId} onChange={(e) => void chooseUser(e.target.value)}>
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Site">
                  <Select
                    value={userSiteId}
                    onChange={(e) => void chooseUserSite(e.target.value)}
                    disabled={!userId}
                  >
                    <option value="">Select a site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.display_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {userAccess ? (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                          <th className="px-3 py-2">Feature</th>
                          <th className="px-3 py-2">Site default</th>
                          <th className="px-3 py-2">Effective</th>
                          <th className="px-3 py-2">Override</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userAccessFeatures.map((feature) => (
                          <tr key={feature.id} className="border-b border-line-soft text-[13px]">
                            <td className="py-2.5 pr-3">
                              <p className="font-medium text-ink">{feature.name}</p>
                              <p className="font-mono text-[11px] text-muted">{feature.key}</p>
                            </td>
                            <td className="px-3 py-2.5 text-muted">Enabled</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  userAccess.effective_feature_ids.includes(feature.id)
                                    ? "bg-success-bg text-success"
                                    : "bg-warn-bg text-warn"
                                }`}
                              >
                                {userAccess.effective_feature_ids.includes(feature.id)
                                  ? "Yes"
                                  : "No"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <Select
                                value={overrideStates[feature.id] ?? "inherit"}
                                disabled={!canUpdateUserFeatures}
                                onChange={(e) =>
                                  setOverrideStates({
                                    ...overrideStates,
                                    [feature.id]: e.target.value as FeatureOverrideState,
                                  })
                                }
                              >
                                <option value="inherit">Inherit from site</option>
                                <option value="granted">Grant explicitly</option>
                                <option value="revoked">Revoke for user</option>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted">
                      {overriddenFeatures} explicit override
                      {overriddenFeatures === 1 ? "" : "s"}
                    </p>
                    {canUpdateUserFeatures ? (
                      <Button
                        type="button"
                        disabled={saving === "user"}
                        onClick={() =>
                          void run(
                            "user",
                          async () => {
                            await updateUserFeatures(
                              Number(userId),
                              Number(userSiteId),
                              overrideStates,
                            );

                            // Keep the sidebar and stored session in sync when
                            // someone changes their own feature access.
                            if (currentUser?.id === Number(userId)) {
                              const refreshed = await refreshSession();
                              if (refreshed) refreshUser();
                            }

                            await loadUserAccess(Number(userId), Number(userSiteId));

                            if (summarySiteId === userSiteId) {
                              await loadUserSummary(summarySiteId);
                            }
                          },
                          "User feature access updated.",
                        )
                      }
                    >
                      {saving === "user" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                        Save user access
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  Select a user and site to review inherited access and overrides.
                </p>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
