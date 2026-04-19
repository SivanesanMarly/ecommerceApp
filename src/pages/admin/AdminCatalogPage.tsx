import { motion } from 'framer-motion';
import type { Dispatch, SetStateAction } from 'react';
import type { CatalogImportSummary } from '../../types';

type CatalogImportFormState = {
  file: File | null;
  source_label: string;
  sheet_name: string;
  assign_supplier_strategy: 'none' | 'round_robin';
  sync_missing: boolean;
  only_active: boolean;
  dry_run: boolean;
};

type AdminCatalogPageProps = {
  productsCount: number;
  suppliersCount: number;
  lowStockCount: number;
  catalogImportForm: CatalogImportFormState;
  catalogImportBusy: boolean;
  catalogImportResult: CatalogImportSummary | null;
  setCatalogImportForm: Dispatch<SetStateAction<CatalogImportFormState>>;
  onImport: () => void | Promise<void>;
};

export function AdminCatalogPage({
  productsCount,
  suppliersCount,
  lowStockCount,
  catalogImportForm,
  catalogImportBusy,
  catalogImportResult,
  setCatalogImportForm,
  onImport,
}: AdminCatalogPageProps) {
  return (
    <motion.section
      className="admin-grid admin-page-full"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55 }}
    >
      <div className="panel">
        <div className="products-head-row">
          <div>
            <h3>Catalog Import</h3>
            <p className="muted">Upload your Excel catalog and sync products for admin, user, and supplier workflows.</p>
          </div>
          <div className="products-head-stats">
            <article className="products-stat">
              <span>Visible Products</span>
              <strong>{productsCount}</strong>
            </article>
            <article className="products-stat">
              <span>Suppliers</span>
              <strong>{suppliersCount}</strong>
            </article>
            <article className="products-stat">
              <span>Low Stock</span>
              <strong>{lowStockCount}</strong>
            </article>
          </div>
        </div>

        <div className="mini-top stack">
          <input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setCatalogImportForm((prev) => ({ ...prev, file }));
            }}
          />
          <input
            placeholder="Source label"
            value={catalogImportForm.source_label}
            onChange={(e) => setCatalogImportForm((prev) => ({ ...prev, source_label: e.target.value }))}
          />
          <input
            placeholder="Sheet name (example: catalog_master)"
            value={catalogImportForm.sheet_name}
            onChange={(e) => setCatalogImportForm((prev) => ({ ...prev, sheet_name: e.target.value }))}
          />
          <div className="row">
            <label className="check">
              <input
                type="checkbox"
                checked={catalogImportForm.only_active}
                onChange={(e) => setCatalogImportForm((prev) => ({ ...prev, only_active: e.target.checked }))}
              />
              Import only active rows
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={catalogImportForm.sync_missing}
                onChange={(e) => setCatalogImportForm((prev) => ({ ...prev, sync_missing: e.target.checked }))}
              />
              Sync missing rows to out-of-stock
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={catalogImportForm.dry_run}
                onChange={(e) => setCatalogImportForm((prev) => ({ ...prev, dry_run: e.target.checked }))}
              />
              Dry run
            </label>
          </div>
          <select
            value={catalogImportForm.assign_supplier_strategy}
            onChange={(e) =>
              setCatalogImportForm((prev) => ({
                ...prev,
                assign_supplier_strategy: e.target.value as 'none' | 'round_robin',
              }))
            }
          >
            <option value="none">Supplier Assignment: None</option>
            <option value="round_robin">Supplier Assignment: Round Robin</option>
          </select>
          <button type="button" className="primary" disabled={catalogImportBusy} onClick={() => void onImport()}>
            {catalogImportBusy ? 'Importing Catalog...' : 'Start Catalog Import'}
          </button>
        </div>

        {catalogImportResult ? (
          <div className="mini-top stack">
            <h4>Last Import Result</h4>
            <div className="tile">
              <p className="muted">Source: {catalogImportResult.source_label}</p>
              <p className="muted">
                Created {catalogImportResult.created} | Updated {catalogImportResult.updated} | Skipped {catalogImportResult.skipped}
              </p>
              <p className="muted">
                Duplicates {catalogImportResult.duplicate_external_keys} | Reactivated {catalogImportResult.reactivated}
              </p>
              <p className="muted">
                Deactivated by Sync {catalogImportResult.deactivated_by_sync} | Dry run {catalogImportResult.dry_run ? 'Yes' : 'No'}
              </p>
            </div>
            {catalogImportResult.errors.length > 0 ? (
              <div className="state-card error">
                {catalogImportResult.errors.slice(0, 8).map((entry) => (
                  <p key={entry}>{entry}</p>
                ))}
              </div>
            ) : (
              <div className="state-card mini-top">No validation errors in last import.</div>
            )}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
