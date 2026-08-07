"use client";

import React, { useEffect, useState } from "react";
import { useDocumentInfo, useConfig, Link } from "@payloadcms/ui";

interface RecordEntry {
  id: string;
  label: string;
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 600,
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  background: "var(--theme-input-bg)",
  color: "var(--theme-text)",
  textDecoration: "none",
  maxWidth: 160,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const disabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  pointerEvents: "none",
};

/**
 * Prev/Next navigation for a collection's edit view, so you can page straight from one record to
 * the next (or previous) — sorted the same way the list view's title column reads — without going
 * back to the list. Fully generic: reads the current collection + title field from Payload's own
 * config, so registering it on a collection's `admin.components.edit.beforeDocumentControls` is
 * all that's needed.
 */
export const RecordNav: React.FC = () => {
  const { id, collectionSlug } = useDocumentInfo();
  const { config, getEntityConfig } = useConfig();
  const [entries, setEntries] = useState<RecordEntry[] | null>(null);

  const collectionConfig = collectionSlug ? getEntityConfig({ collectionSlug }) : null;
  const titleField = (collectionConfig?.admin?.useAsTitle as string | undefined) ?? "id";

  useEffect(() => {
    if (!collectionSlug) return;
    let cancelled = false;
    fetch(`/api/${collectionSlug}?limit=1000&depth=0&sort=${titleField}`)
      .then((res) => res.json())
      .then((data: { docs: Record<string, unknown>[] }) => {
        if (!cancelled) {
          setEntries(
            data.docs.map((doc) => ({
              id: String(doc.id),
              label: String(doc[titleField] ?? doc.id),
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionSlug, titleField]);

  if (!id || !collectionSlug || !entries || entries.length === 0) return null;

  const index = entries.findIndex((entry) => entry.id === String(id));
  if (index === -1) return null;

  const prev = entries[index - 1];
  const next = entries[index + 1];
  const adminRoute = config.routes.admin;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12 }}>
      {prev ? (
        <Link href={`${adminRoute}/collections/${collectionSlug}/${prev.id}`} style={buttonStyle} title={prev.label}>
          ← {prev.label}
        </Link>
      ) : (
        <span style={disabledStyle}>← —</span>
      )}
      <span style={{ fontSize: 12, color: "var(--theme-elevation-500)", whiteSpace: "nowrap" }}>
        {index + 1} of {entries.length}
      </span>
      {next ? (
        <Link href={`${adminRoute}/collections/${collectionSlug}/${next.id}`} style={buttonStyle} title={next.label}>
          {next.label} →
        </Link>
      ) : (
        <span style={disabledStyle}>— →</span>
      )}
    </div>
  );
};
