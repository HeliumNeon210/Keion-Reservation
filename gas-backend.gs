/**
 * Google Apps Script Backend for Reservation System
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Create 4 sheets (tabs) named: "reservations", "available_slots", "extra_slots", "blocked_slots".
 * 3. In "reservations", add headers: id, date, startTime, bandName, memberCount
 * 4. In "available_slots", add headers: id, dayOfWeek, startTime
 * 5. In "extra_slots", add headers: id, date, startTime
 * 6. In "blocked_slots", add headers: id, date, startTime
 * 7. Open Extensions > Apps Script.
 * 8. Paste this code and save.
 * 9. Click "Deploy" > "New Deployment".
 * 10. Select "Web App".
 * 11. Set "Execute as" to "Me" and "Who has access" to "Anyone".
 * 12. Copy the Web App URL and set it as VITE_GAS_URL in your environment.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  const month = e.parameter.month;
  
  if (action === 'getReservations') {
    return jsonResponse(getReservations(month));
  } else if (action === 'getAvailableSlots') {
    return jsonResponse(getAvailableSlots());
  }
  
  return jsonResponse({ error: 'Invalid action' });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON' });
  }
  
  const action = data.action;
  const payload = data.data || data; // Handle both {data: ...} and direct properties
  
  let result;
  try {
    if (action === 'addReservation') {
      result = { id: addReservation(payload) };
    } else if (action === 'deleteReservation') {
      deleteReservation(payload.id);
      result = { success: true };
    } else if (action === 'addAvailableSlot') {
      addAvailableSlot(payload);
      result = { success: true };
    } else if (action === 'deleteAvailableSlot') {
      deleteAvailableSlot(payload.id);
      result = { success: true };
    } else if (action === 'addExtraSlot') {
      addExtraSlot(payload.date, payload.startTime);
      result = { success: true };
    } else if (action === 'deleteExtraSlot') {
      deleteExtraSlot(payload.date, payload.startTime);
      result = { success: true };
    } else if (action === 'addBlockedSlot') {
      addBlockedSlot(payload.date, payload.startTime);
      result = { success: true };
    } else if (action === 'deleteBlockedSlot') {
      deleteBlockedSlot(payload.date, payload.startTime);
      result = { success: true };
    } else {
      return jsonResponse({ error: 'Invalid action: ' + action });
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Data Access Functions ---

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const data = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  return data;
}

function getReservations(month) {
  const data = getSheetData('reservations');
  if (!month) return data;
  return data.filter(r => r.date.toString().startsWith(month));
}

function getAvailableSlots() {
  return {
    recurring: getSheetData('available_slots'),
    extra: getSheetData('extra_slots'),
    blocked: getSheetData('blocked_slots')
  };
}

function addReservation(reservation) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('reservations');
  
  // Check for double booking
  const existing = getSheetData('reservations');
  const isBooked = existing.some(r => r.date === reservation.date && r.startTime === reservation.startTime);
  if (isBooked) throw new Error('この時間は既に予約されています。');
  
  const id = new Date().getTime();
  sheet.appendRow([id, reservation.date, reservation.startTime, reservation.bandName, reservation.memberCount]);
  return id;
}

function deleteReservation(id) {
  deleteRowById('reservations', id);
}

function addAvailableSlot(slot) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('available_slots');
  const id = new Date().getTime();
  sheet.appendRow([id, slot.dayOfWeek, slot.startTime]);
}

function deleteAvailableSlot(id) {
  deleteRowById('available_slots', id);
}

function addExtraSlot(date, startTime) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('extra_slots');
  const id = new Date().getTime();
  sheet.appendRow([id, date, startTime]);
}

function deleteExtraSlot(date, startTime) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('extra_slots');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === date && data[i][2] === startTime) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function addBlockedSlot(date, startTime) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('blocked_slots');
  const id = new Date().getTime();
  sheet.appendRow([id, date, startTime]);
}

function deleteBlockedSlot(date, startTime) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('blocked_slots');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === date && data[i][2] === startTime) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function deleteRowById(sheetName, id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}
