/**
 * Monday.com API helpers
 * Uses MONDAY_API_KEY and MONDAY_LEAD_BOARD_ID env vars.
 */

const MONDAY_API_URL = "https://api.monday.com/v2";

async function mondayRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.MONDAY_API_KEY;
  const boardId = process.env.MONDAY_LEAD_BOARD_ID;

  if (!apiKey) {
    throw new Error("MONDAY_API_KEY is not configured");
  }
  if (!boardId) {
    throw new Error("MONDAY_LEAD_BOARD_ID is not configured");
  }

  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Monday.com API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (result.errors && result.errors.length > 0) {
    const messages = result.errors.map((e) => e.message).join("; ");
    throw new Error(`Monday.com GraphQL error: ${messages}`);
  }

  if (result.data === undefined) {
    throw new Error("Monday.com API returned no data");
  }

  return result.data;
}

/**
 * Create a new item (row) in the configured Monday.com board.
 * @param name        The item name (row title).
 * @param columnValues Optional column values as a JSON object, e.g. { status: { label: "New" }, email: { email: "x@y.com" } }.
 * @returns The created item's numeric id.
 */
export async function createMondayItem(
  name: string,
  columnValues?: Record<string, unknown>
): Promise<number> {
  const boardId = process.env.MONDAY_LEAD_BOARD_ID!;
  const columnValuesJson = columnValues ? JSON.stringify(columnValues) : "{}";

  const query = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;

  const variables = {
    boardId,
    itemName: name,
    columnValues: columnValuesJson,
  };

  const data = await mondayRequest<{ create_item: { id: number } }>(query, variables);
  return data.create_item.id;
}

/**
 * Update column values on an existing Monday.com item.
 * @param itemId       The numeric item id to update.
 * @param columnValues Column values as a JSON object.
 * @returns The updated item's numeric id.
 */
export async function updateMondayItem(
  itemId: number,
  columnValues: Record<string, unknown>
): Promise<number> {
  const boardId = process.env.MONDAY_LEAD_BOARD_ID!;
  const columnValuesJson = JSON.stringify(columnValues);

  const query = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
        id
      }
    }
  `;

  const variables = {
    boardId,
    itemId: String(itemId),
    columnValues: columnValuesJson,
  };

  const data = await mondayRequest<{
    change_multiple_column_values: { id: number };
  }>(query, variables);
  return data.change_multiple_column_values.id;
}

/**
 * Post a text update (activity-feed comment) to an existing item. Used to
 * carry free-form context — lead score, pain signals, research summary —
 * that doesn't map to a fixed column on the board's schema.
 */
export async function createMondayUpdate(itemId: string, body: string): Promise<void> {
  const query = `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
      }
    }
  `;
  await mondayRequest<{ create_update: { id: number } }>(query, { itemId, body });
}
