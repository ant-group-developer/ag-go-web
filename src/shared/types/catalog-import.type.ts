import { ApiError } from '../lib/api-client';

export type CatalogImportError = {
  row: number;
  field: string;
  value: string;
  reason: string;
};

export type CatalogImportResult = {
  totalRows: number;
  inserted: number;
  failed: number;
  errors: CatalogImportError[];
};

export function importResultFromError(error: unknown): CatalogImportResult | undefined {
  if (!(error instanceof ApiError) || !isCatalogImportResult(error.details)) {
    return undefined;
  }
  return error.details;
}

function isCatalogImportResult(value: unknown): value is CatalogImportResult {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const result = value as Record<string, unknown>;
  return (
    typeof result.totalRows === 'number' &&
    typeof result.inserted === 'number' &&
    typeof result.failed === 'number' &&
    Array.isArray(result.errors)
  );
}
