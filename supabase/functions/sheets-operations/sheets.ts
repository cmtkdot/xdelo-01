export async function verifySheetAccess(spreadsheetId: string, token: string, apiKey: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Verification failed:', error);
    throw new Error(`Failed to verify sheet access: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function writeToSheet(spreadsheetId: string, token: string, apiKey: string, data: any[], sheetId: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW&key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: data,
        majorDimension: "ROWS"
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Write failed:', error);
    throw new Error(`Failed to write data: ${JSON.stringify(error)}`);
  }

  await autoResizeColumns(spreadsheetId, token, apiKey, sheetId, data[0].length);
  return response.json();
}

async function autoResizeColumns(spreadsheetId: string, token: string, apiKey: string, sheetId: string, columnsCount: number) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: columnsCount
            }
          }
        }]
      })
    }
  );
}