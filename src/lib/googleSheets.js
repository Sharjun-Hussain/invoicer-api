
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
