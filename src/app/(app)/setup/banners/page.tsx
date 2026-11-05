"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button, Card, Field, Select, Textarea, TextInput } from "@/components/ui";
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  fetchSites,
  updateBanner,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can, isSuperAdmin } from "@/lib/permissions";
import type { Banner, Site } from "@/lib/types";

type BannerForm = {
  title: string;
  description: string;
  external_urls: string[];
  files: File[];
  remove_attachment_ids: number[];
  active: boolean;
  sort_order: string;
};

const ACCEPTED_UPLOAD_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";

const EMPTY_FORM: BannerForm = {
  title: "",
  description: "",
  external_urls: [""],
  files: [],
  remove_attachment_ids: [],
  active: true,
  sort_order: "0",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "The request could not be completed.";
}

export default function BannersPage() {
  const { user } = useAuth();
  const canCreate = can(user, "banners", "create");
  const canUpdate = can(user, "banners", "update");
  const canDelete = can(user, "banners", "destroy");

  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState<number | null>(
    user?.current_site_id ?? null,
  );
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBanners(forSite: number | null) {
    const response = await fetchBanners(forSite ?? undefined);
    setBanners(response.data);
  }

  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    let cancelled = false;

    async function initialise() {
      try {
        const siteResponse = isSuperAdmin(currentUser) ? await fetchSites() : null;
        if (cancelled) return;

        if (siteResponse) setSites(siteResponse.data);

        const nextSiteId =
          siteId ??
          currentUser.current_site_id ??
          siteResponse?.data[0]?.id ??
          null;

        if (nextSiteId !== siteId) setSiteId(nextSiteId);

        const response = await fetchBanners(nextSiteId ?? undefined);
        if (!cancelled) setBanners(response.data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialise();

    return () => {
      cancelled = true;
    };
    // The initial site is derived once from the signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function selectSite(nextSiteId: number | null) {
    setSiteId(nextSiteId);
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await loadBanners(nextSiteId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    await loadBanners(siteId);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(banner: Banner) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      description: banner.description ?? "",
      external_urls:
        banner.external_urls.length > 0 ? banner.external_urls : [""],
      files: [],
      remove_attachment_ids: [],
      active: banner.active,
      sort_order: String(banner.sort_order),
    });
    setNotice(null);
    setError(null);
  }

  function updateAttachment(index: number, value: string) {
    setForm((current) => ({
      ...current,
      external_urls: current.external_urls.map((url, position) =>
        position === index ? value : url,
      ),
    }));
  }

  function addAttachment() {
    setForm((current) => ({
      ...current,
      external_urls: [...current.external_urls, ""],
    }));
  }

  function removeAttachment(index: number) {
    setForm((current) => {
      const next = current.external_urls.filter(
        (_, position) => position !== index,
      );
      return {
        ...current,
        external_urls: next.length > 0 ? next : [""],
      };
    });
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setForm((current) => ({
      ...current,
      files: [...current.files, ...Array.from(fileList)].slice(0, 10),
    }));
  }

  function removeSelectedFile(index: number) {
    setForm((current) => ({
      ...current,
      files: current.files.filter((_, position) => position !== index),
    }));
  }

  function toggleRemoveExisting(id: number) {
    setForm((current) => ({
      ...current,
      remove_attachment_ids: current.remove_attachment_ids.includes(id)
        ? current.remove_attachment_ids.filter((value) => value !== id)
        : [...current.remove_attachment_ids, id],
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteId) {
      setError("Select a site before saving a banner.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      site_id: siteId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      external_urls: form.external_urls
        .map((url) => url.trim())
        .filter(Boolean),
      active: form.active,
      sort_order: Number(form.sort_order) || 0,
    };

    try {
      if (editingId) {
        await updateBanner(
          editingId,
          payload,
          form.files,
          form.remove_attachment_ids,
        );
        setNotice("Banner updated successfully.");
      } else {
        await createBanner(payload, form.files);
        setNotice("Banner created successfully.");
      }
      resetForm();
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(banner: Banner) {
    if (!window.confirm(`Delete the banner “${banner.title}”?`)) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await deleteBanner(banner.id);
      if (editingId === banner.id) resetForm();
      setNotice("Banner removed.");
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const selectedSite = sites.find((site) => site.id === siteId);
  const editingBanner = editingId
    ? banners.find((banner) => banner.id === editingId) ?? null
    : null;

  return (
    <div>
      <header className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <Megaphone className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Site Banners
        </h1>
        <p className="mt-1 text-sm text-muted">
          Publish title, description and external links for the current site.
          Every external link opens in a new tab.
        </p>
      </header>

      {isSuperAdmin(user) ? (
        <div className="mb-5 max-w-md">
          <Field label="Site" htmlFor="banner-site">
            <Select
              id="banner-site"
              value={siteId ? String(siteId) : ""}
              onChange={(event) =>
                void selectSite(Number(event.target.value) || null)
              }
            >
              <option value="">All sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.display_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : selectedSite || user?.site_name ? (
        <p className="mb-5 text-sm text-muted">
          Site:{" "}
          <span className="font-semibold text-ink">
            {selectedSite?.display_name ?? user?.site_name}
          </span>
        </p>
      ) : null}

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

      <div className={`grid gap-5 ${canCreate || editingId ? "lg:grid-cols-[1fr_380px]" : ""}`}>
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
              Published banners
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void reload()}
              disabled={loading || saving}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading banners…
            </div>
          ) : banners.length === 0 ? (
            <Card className="p-8 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-muted" strokeWidth={1.6} />
              <p className="mt-3 text-sm font-medium text-ink">No banners yet</p>
              <p className="mt-1 text-xs text-muted">
                Create the first banner for this site.
              </p>
            </Card>
          ) : (
            banners.map((banner) => (
              <Card key={banner.id} className="overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-ink">{banner.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          banner.active
                            ? "bg-success-bg text-success"
                            : "bg-canvas-2 text-muted"
                        }`}
                      >
                        {banner.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {banner.site_name ? (
                      <p className="mt-1 text-xs text-muted">{banner.site_name}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {canUpdate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(banner)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => void remove(banner)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="px-5 py-4">
                  {banner.description ? (
                    <p className="text-sm leading-6 text-muted">{banner.description}</p>
                  ) : (
                    <p className="text-sm text-muted">No description.</p>
                  )}

                  {banner.attachments.some((attachment) => attachment.image) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {banner.attachments
                        .filter((attachment) => attachment.image)
                        .map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={attachment.filename}
                            className="overflow-hidden rounded-md border border-line transition hover:border-accent/40"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="h-24 w-36 object-cover"
                            />
                          </a>
                        ))}
                    </div>
                  ) : null}

                  {(banner.attachments.some((attachment) => !attachment.image) ||
                    banner.external_urls.length > 0) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {banner.attachments
                        .filter((attachment) => !attachment.image)
                        .map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-accent-strong transition hover:border-accent/40 hover:bg-canvas-2"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {attachment.filename}
                            <span className="font-normal text-muted">
                              {formatFileSize(attachment.byte_size)}
                            </span>
                          </a>
                        ))}
                      {banner.external_urls.map((url) => (
                        <a
                          key={`${banner.id}-${url}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={url}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-accent-strong transition hover:border-accent/40 hover:bg-canvas-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="break-all">{url}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </section>

        {canCreate || editingId ? (
          <Card className="h-fit">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
                {editingId ? "Edit banner" : "New banner"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                At least one http(s) attachment URL is recommended.
              </p>
            </div>

            <form onSubmit={(event) => void submit(event)} className="space-y-4 p-5">
              <Field label="Title" htmlFor="banner-title" required>
                <TextInput
                  id="banner-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  maxLength={160}
                  required
                />
              </Field>

              <Field label="Description" htmlFor="banner-description">
                <Textarea
                  id="banner-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  maxLength={2000}
                  rows={4}
                />
              </Field>

              <Field
                label="Upload files"
                htmlFor="banner-files"
                hint="JPEG, PNG, WebP, GIF or PDF. Maximum 10 MB each and 10 files per banner."
              >
                <div className="space-y-2">
                  {editingBanner?.attachments.map((attachment) => (
                    <label
                      key={attachment.id}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                        form.remove_attachment_ids.includes(attachment.id)
                          ? "border-warn/40 bg-warn-bg text-warn line-through"
                          : "border-line bg-canvas text-ink"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.remove_attachment_ids.includes(attachment.id)}
                        onChange={() => toggleRemoveExisting(attachment.id)}
                        className="h-4 w-4"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {attachment.filename}
                      </span>
                      <span className="text-muted">
                        {formatFileSize(attachment.byte_size)}
                      </span>
                      <span className="font-semibold">
                        {form.remove_attachment_ids.includes(attachment.id)
                          ? "Will remove"
                          : "Keep"}
                      </span>
                    </label>
                  ))}

                  <input
                    id="banner-files"
                    type="file"
                    multiple
                    accept={ACCEPTED_UPLOAD_TYPES}
                    onChange={(event) => {
                      addFiles(event.target.files);
                      event.target.value = "";
                    }}
                    className="block w-full cursor-pointer rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-canvas-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                  />

                  {form.files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-xs text-ink"
                    >
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="text-muted">{formatFileSize(file.size)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSelectedFile(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Field>

              <Field
                label="External URLs"
                hint="External page or document URLs, not uploaded images. Each opens in a new tab. Up to 10."
              >
                <div className="space-y-2">
                  {form.external_urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <TextInput
                        type="url"
                        value={url}
                        placeholder="https://example.com/document.pdf"
                        onChange={(event) =>
                          updateAttachment(index, event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove attachment ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Field>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addAttachment}
                disabled={form.external_urls.length >= 10}
              >
                <Plus className="h-3.5 w-3.5" />
                Add another URL
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order" htmlFor="banner-sort-order">
                  <TextInput
                    id="banner-sort-order"
                    type="number"
                    step="1"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sort_order: event.target.value,
                      }))
                    }
                  />
                </Field>
                <label className="flex items-end gap-2 pb-2 text-[13px] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-line"
                  />
                  Show banner
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" disabled={saving || !siteId}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Save changes" : "Create banner"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
