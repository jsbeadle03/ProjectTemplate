export const CATEGORY_SELECT = `SELECT id AS categoryId, name, description,
    requires_response AS requiresResponse
  FROM categories`;

export function toCategory(row) {
  return {
    categoryId: row.categoryId,
    name: row.name,
    description: row.description ?? "",
    requiresResponse: Boolean(row.requiresResponse),
  };
}
