const STORAGE_KEY = 'civicconnect_complaints';

// 1. Seed realistic demo records if storage is empty so metrics look alive
function initializeFallbackData() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const starterData = [
      {
        id: 'CC-2026-841',
        category: 'Water supply',
        location: 'Jaipur, Rajasthan',
        subject: 'Irregular morning water pressure',
        status: 'Resolved',
        createdAt: '2026-11-08'
      },
      {
        id: 'CC-2026-912',
        category: 'Roads and streetlights',
        location: 'Kota, Rajasthan',
        subject: 'Non-functional streetlights on main road',
        status: 'In progress',
        createdAt: '2026-11-10'
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starterData));
  }
}

// 2. Save a complaint (Tries backend first, falls back to localStorage)
async function saveComplaint(complaintData, apiUrl = '/api/complaints') {
  const trackingId = `CC-2026-${Math.floor(100 + Math.random() * 900)}`;
  const newRecord = {
    id: trackingId,
    ...complaintData,
    status: 'In progress',
    createdAt: new Date().toISOString().split('T')[0]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
      signal: AbortSignal.timeout(2500) // Fail fast if backend is off
    });
    if (!response.ok) throw new Error('Backend offline');
    return await response.json();
  } catch (err) {
    // Fallback: Save locally
    initializeFallbackData();
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return newRecord;
  }
}

// 3. Track a complaint by reference number
async function trackComplaint(referenceId, apiUrl = '/api/complaints') {
  const cleanId = referenceId.trim().toUpperCase();
  try {
    const response = await fetch(`${apiUrl}/${cleanId}`, {
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) throw new Error('Backend offline');
    return await response.json();
  } catch (err) {
    initializeFallbackData();
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return existing.find(item => item.id === cleanId) || null;
  }
}

// 4. Get dashboard counts for your hero stats
async function getDashboardStats(apiUrl = '/api/stats') {
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error('Backend offline');
    return await response.json();
  } catch (err) {
    initializeFallbackData();
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return {
      prepared: existing.length,
      inProgress: existing.filter(c => c.status === 'In progress').length,
      resolved: existing.filter(c => c.status === 'Resolved').length,
      helpfulRate: '94%'
    };
  }
}
