
export async function fetchWithAuth(url, accessToken, options = {}) {
    const headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        // Handle 401 specifically if needed, but for now just throw
        throw new Error(`Google API Error: ${response.status} ${response.statusText}`);
    }
    return response;
}

export async function findSpreadsheet(accessToken) {
    const q = "name = 'Invoicer_Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`;
    try {
        const res = await fetchWithAuth(url, accessToken);
        const data = await res.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error finding spreadsheet:', error);
        return null;
    }
}

export async function createSpreadsheet(accessToken) {
    const url = 'https://sheets.googleapis.com/v4/spreadsheets';

    const body = {
        properties: {
            title: 'Invoicer_Data'
        },
        sheets: [
            { properties: { title: 'Invoices' } },
            { properties: { title: 'Clients' } },
            { properties: { title: 'Items' } }
        ]
    };

    try {
        const res = await fetchWithAuth(url, accessToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log('Created new spreadsheet:', data.spreadsheetId);
        return data.spreadsheetId;
    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        throw error;
    }
}

export async function findOrCreateSpreadsheet(accessToken) {
    // Try to find existing spreadsheet
    let spreadsheetId = await findSpreadsheet(accessToken);

    // If not found, create a new one
    if (!spreadsheetId) {
        console.log('No existing spreadsheet found, creating new one...');
        spreadsheetId = await createSpreadsheet(accessToken);
    }

    return spreadsheetId;
}


export async function getSheetData(accessToken, spreadsheetId) {
    const ranges = ['Invoices!A2:Z10000', 'Clients!A2:Z10000', 'Items!A2:Z10000'];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}`;

    try {
        const res = await fetchWithAuth(url, accessToken);
        const data = await res.json();

        const result = { invoices: [], clients: [], items: [] };

        if (data.valueRanges) {
            data.valueRanges.forEach((range, index) => {
                const type = index === 0 ? 'invoices' : index === 1 ? 'clients' : 'items';
                const rows = range.values || [];
                result[type] = rows.map(row => {
                    try {
                        // Last column is JSON
                        if (row.length > 0) {
                            return JSON.parse(row[row.length - 1]);
                        }
                        return null;
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
            });
        }
        return result;
    } catch (error) {
        console.error('Error getting sheet data:', error);
        return { invoices: [], clients: [], items: [] };
    }
}

export async function updateSheetData(accessToken, spreadsheetId, data) {
    // data = { invoices: [], clients: [], items: [] }

    const body = {
        valueInputOption: 'RAW',
        data: []
    };

    // Helper to format rows
    const formatRows = (items, type) => {
        // Define headers based on type
        const headers = type === 'invoices'
            ? ['id', 'date', 'clientName', 'total', 'status', 'data']
            : type === 'clients'
                ? ['id', 'name', 'email', 'phone', 'data']
                : ['id', 'name', 'price', 'description', 'data'];

        const rows = [headers];
        items.forEach(item => {
            // Ensure we don't have circular references or excessive data in the JSON column
            const safeItem = { ...item };
            const json = JSON.stringify(safeItem);

            if (type === 'invoices') {
                rows.push([item.id, item.date, item.clientName, item.total, item.status, json]);
            } else if (type === 'clients') {
                rows.push([item.id, item.name, item.email, item.phone, json]);
            } else if (type === 'items') {
                // Handle price/amount discrepancy
                const price = item.price || item.amount || 0;
                rows.push([item.id, item.name, price, item.description, json]);
            }
        });
        return rows;
    };

    if (data.invoices && data.invoices.length > 0) {
        body.data.push({
            range: 'Invoices!A1',
            values: formatRows(data.invoices, 'invoices')
        });
    }
    if (data.clients && data.clients.length > 0) {
        body.data.push({
            range: 'Clients!A1',
            values: formatRows(data.clients, 'clients')
        });
    }
    if (data.items && data.items.length > 0) {
        body.data.push({
            range: 'Items!A1',
            values: formatRows(data.items, 'items')
        });
    }

    if (body.data.length === 0) {
        return true; // Nothing to update
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    try {
        await fetchWithAuth(url, accessToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return true;
    } catch (error) {
        console.error('Error updating sheet data:', error);
        return false;
    }
}
