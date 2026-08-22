const http = require('http');
const fs = require('fs');
const path = require('path');
const localBackend = require('./local-backend');
const supabaseBackend = require('./supabase-backend');

const PORT = process.env.PORT || 3000;
const HTML_PATH = path.join(__dirname, 'code-appscript', 'index.html');
const PORTAL_DATA_PATH = path.join(__dirname, 'data', 'portal-data.json');
const LOCAL_CRM_DATA_PATH = path.join(__dirname, 'data', 'local-crm-data.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  });
  res.end(JSON.stringify(payload));
}

function requestJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 25 * 1024 * 1024) req.destroy(); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); } });
    req.on('error', reject);
  });
}

function locationPath(locations, locationId) {
  const byId = new Map(locations.map(item => [item.id, item]));
  const names = [];
  const seen = new Set();
  let current = byId.get(locationId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.name) names.unshift(current.name);
    current = byId.get(current.parentId);
  }
  return names.join(' › ');
}

function roleFor(crm, username) {
  const user = crm.users.find(item => String(item.Username) === String(username));
  return crm.roles.find(item => item.role_key === (user && user.Role));
}

function dashboardStats(crm, username) {
  const role = roleFor(crm, username);
  const agency = role && (role.is_super || role.role_key === 'Manager');
  const allProps = crm.sheets.Properties.filter(item => !item.deleted);
  const props = agency ? allProps : allProps.filter(item => item.assignedAgent === username);
  const leads = crm.sheets.Leads.filter(item => !item.deleted && (agency || item.assignedAgent === username));
  const followups = crm.sheets.FollowUps.filter(item => !item.deleted && (agency || item.assignedAgent === username));
  const appointments = crm.sheets.Appointments.filter(item => !item.deleted && (agency || item.agent === username));
  const deals = crm.sheets.Deals.filter(item => !item.deleted && (agency || item.agent === username));
  const inventoryKeys = ['Draft','Available','Reserved','Sold','Rented','Withdrawn'];
  const leadKeys = ['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won','Lost'];
  const countBy = (items, keys) => Object.fromEntries(keys.map(key => [key, items.filter(item => item.status === key).length]));
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const completedThisMonth = deals.filter(item => item.status === 'Completed' && String(item.closedAt || '').slice(0, 7) === month);
  const activeUsers = crm.users.filter(item => item.Status === 'Active');
  const recentProperties = props.slice().sort((a,b) => String(b.created || '').localeCompare(String(a.created || ''))).slice(0, 6)
    .map(item => ({ ...item, locationPath: locationPath(crm.sheets.Locations, item.locationId) }));
  return {
    success: true,
    data: {
      scope: agency ? 'agency' : 'own', inventory: countBy(props, inventoryKeys), funnel: countBy(leads, leadKeys),
      activeListings: props.filter(item => ['Available','Reserved'].includes(item.status)).length,
      featured: props.filter(item => item.isFeatured && item.status === 'Available').length,
      totalViews: props.reduce((sum,item) => sum + Number(item.viewsCount || 0), 0),
      openLeads: leads.filter(item => !['Won','Lost'].includes(item.status)).length,
      wonLeads: leads.filter(item => item.status === 'Won').length,
      unassignedLeads: agency ? leads.filter(item => !item.assignedAgent && !['Won','Lost'].includes(item.status)).length : 0,
      overdueFollowUps: followups.filter(item => item.status === 'Pending' && item.dueAt && new Date(item.dueAt) < new Date()).length,
      dueTodayFollowUps: followups.filter(item => item.status === 'Pending' && String(item.dueAt || '').slice(0,10) === today).length,
      todayAppointments: appointments.filter(item => ['Scheduled','Confirmed'].includes(item.status) && String(item.scheduledAt || '').slice(0,10) === today).length,
      recentLeads: leads.slice().sort((a,b) => String(b.created || '').localeCompare(String(a.created || ''))).slice(0,6),
      recentProperties, dealsMonth: completedThisMonth.length,
      dealsMonthValue: completedThisMonth.reduce((sum,item) => sum + Number(item.dealAmount || 0), 0),
      commissionMonth: completedThisMonth.reduce((sum,item) => sum + Number(item.commissionAmt || 0), 0),
      collectedMonth: deals.reduce((sum,item) => sum + (item.payments || []).filter(p => String(p.date || '').slice(0,7) === month).reduce((s,p) => s + Number(p.amount || 0), 0), 0),
      payable: deals.filter(item => item.status === 'Completed' && !item.agentPaidAt).reduce((sum,item) => sum + Number(item.agentShareAmt || 0), 0),
      activeAgents: activeUsers.filter(item => item.Role === 'Agent').length,
      myTarget: Number((crm.users.find(item => item.Username === username) || {}).MonthlyTarget || 0),
      leadsSeries: [], upcomingAppointments: appointments.filter(item => new Date(item.scheduledAt) >= new Date()).slice(0,6),
      leaderboard: agency ? activeUsers.map(user => ({ agent:user.Username, listings:props.filter(p=>p.assignedAgent===user.Username && ['Available','Reserved'].includes(p.status)).length, openLeads:leads.filter(l=>l.assignedAgent===user.Username && !['Won','Lost'].includes(l.status)).length, won:leads.filter(l=>l.assignedAgent===user.Username && l.status==='Won').length, overdue:0, closed:completedThisMonth.filter(d=>d.agent===user.Username).length, target:Number(user.MonthlyTarget||0) })) : []
    }
  };
}

async function runLocalApi(req, res, method) {
  const body = await requestJson(req);
  const args = Array.isArray(body.args) ? body.args : [];
  const crm = readJson(LOCAL_CRM_DATA_PATH);
  const portal = readJson(PORTAL_DATA_PATH);
  const sheetMap = { getProperties:'Properties', getLeads:'Leads', getFollowUps:'FollowUps', getAppointments:'Appointments', getDeals:'Deals', getTenancies:'Tenancies', getOwners:'Owners', getLocations:'Locations', getAmenities:'Amenities', getLogs:'Logs' };

  if (method === 'authenticateUser') {
    const [username, password] = args;
    const user = crm.users.find(item => String(item.Username).toLowerCase() === String(username || '').toLowerCase());
    if (!user) return jsonResponse(res, 200, { success:false, message:'Không tìm thấy tên đăng nhập' });
    if (user.Status !== 'Active') return jsonResponse(res, 200, { success:false, message:'Tài khoản đã ngừng hoạt động' });
    if (String(user.Password) !== String(password)) return jsonResponse(res, 200, { success:false, message:'Mật khẩu không đúng' });
    const role = crm.roles.find(item => item.role_key === user.Role) || {};
    return jsonResponse(res, 200, { success:true, username:user.Username, email:user.Email, role:user.Role, profileImage:user.ProfileImage || '', themeMode:user.ThemeMode || 'light', customColors:user.CustomColors || '', permissions:role.permissions || {}, canEditRbac:user.Role === 'Admin' });
  }
  if (method === 'getPublicPortal') {
    try {
      const resData = await localBackend.run('getPublicPortal', []);
      return jsonResponse(res, 200, resData);
    } catch(e) {
      return jsonResponse(res, 200, { success: true, properties: [], locations: [], amenities: [] });
    }
  }
  if (method === 'publicViewProperty') return jsonResponse(res, 200, { success:true });
  if (method === 'getDashboardStats') return jsonResponse(res, 200, dashboardStats(crm, args[0]));
  if (method === 'getMyPermissions') { const role = roleFor(crm, args[0]) || {}; return jsonResponse(res, 200, { success:true, perms:role.permissions || {}, canEdit:role.role_key === 'Admin' }); }
  if (method === 'getAllUsers') return jsonResponse(res, 200, { success:true, data:crm.users.map(({Password, ...user}) => user) });
  if (['getUserSettings','getAgencyBranding','saveAgencyBranding','uploadProfileImage','updateUserSettings'].includes(method)) { const user = crm.users.find(item => item.Username === args[0]) || {}; return jsonResponse(res, 200, { success:true, settings:{ profileImage:user.ProfileImage || '', themeMode:user.ThemeMode || 'light', customColors:user.CustomColors || '' } }); }
  if (method === 'getNotifications') return jsonResponse(res, 200, { success:true, data:[] });
  if (method === 'getDefaultTheme') return jsonResponse(res, 200, { success:true, id:'', vars:'' });
  if (method === 'getAiConfig') return jsonResponse(res, 200, { success:true, configured:false });
  if (method === 'getAppConfig') return jsonResponse(res, 200, { success:true, config:{} });
  if (method === 'getTrash') {
    const data = [];
    Object.entries(crm.sheets || {}).forEach(([sheet, items]) => {
      (items || []).filter(x => x.deleted).forEach(x => {
        data.push({
          id: x.id,
          type: sheet === 'Properties' ? 'Property' : sheet === 'Leads' ? 'Lead' : sheet === 'Appointments' ? 'Appointment' : sheet === 'FollowUps' ? 'FollowUp' : sheet === 'Deals' ? 'Deal' : sheet === 'Tenancies' ? 'Tenancy' : sheet === 'Owners' ? 'Owner' : sheet === 'Locations' ? 'Location' : sheet === 'Amenities' ? 'Amenity' : sheet,
          title: x.title || x.fullName || x.name || x.leadName || (sheet + ' #' + x.id),
          sheet: sheet,
          updated: x.deletedAt || x.updatedAt || x.updated || new Date().toISOString()
        });
      });
    });
    return jsonResponse(res, 200, { success: true, data });
  }
  if (sheetMap[method]) {
    let data = crm.sheets[sheetMap[method]] || [];
    if (method === 'getProperties') data = data.map(item => ({ ...item, locationPath:locationPath(crm.sheets.Locations, item.locationId) }));
    return jsonResponse(res, 200, { success:true, data:data.filter(item => !item.deleted) });
  }
  return jsonResponse(res, 200, { success:false, message:'Chức năng ghi dữ liệu chưa được hỗ trợ trên localhost: ' + method });
}

// Injected bridge script for standalone browser / localhost to mock google.script.run
const GOOGLE_SCRIPT_RUN_MOCK = `
<script>
  // ================= Localhost google.script.run Bridge =================
  (function() {
    // Initial mock state if not in localStorage
    const MOCK_USERS = [
      { Username: 'admin', Email: 'admin@realestate.com', Password: 'admin123', Role: 'Admin', Status: 'Active', MonthlyTarget: 50000000 },
      { Username: 'manager1', Email: 'manager@realestate.com', Password: 'manager123', Role: 'Manager', Status: 'Active', MonthlyTarget: 35000000 },
      { Username: 'agent1', Email: 'agent1@realestate.com', Password: 'agent123', Role: 'Agent', Status: 'Active', MonthlyTarget: 20000000 },
      { Username: 'agent2', Email: 'agent2@realestate.com', Password: 'agent123', Role: 'Agent', Status: 'Active', MonthlyTarget: 20000000 },
      { Username: 'agent3', Email: 'agent3@realestate.com', Password: 'agent123', Role: 'Agent', Status: 'Active', MonthlyTarget: 20000000 }
    ];

    const MOCK_LOCATIONS = [
      { id: 1, name: 'Lahore', level: 'City', parentId: null, slug: 'lahore' },
      { id: 2, name: 'Karachi', level: 'City', parentId: null, slug: 'karachi' },
      { id: 3, name: 'Islamabad', level: 'City', parentId: null, slug: 'islamabad' },
      { id: 4, name: 'DHA', level: 'Area', parentId: 1, slug: 'dha-lahore' },
      { id: 5, name: 'Bahria Town', level: 'Area', parentId: 1, slug: 'bahria-lahore' },
      { id: 6, name: 'Gulberg', level: 'Area', parentId: 1, slug: 'gulberg-lahore' },
      { id: 11, name: 'Phase 5', level: 'Society', parentId: 4, slug: 'phase-5-dha' },
      { id: 12, name: 'Phase 6', level: 'Society', parentId: 4, slug: 'phase-6-dha' },
      { id: 13, name: 'Sector C', level: 'Society', parentId: 5, slug: 'sector-c-bahria' },
      { id: 14, name: 'DHA Phase 8', level: 'Society', parentId: 2, slug: 'dha-phase-8-karachi' },
      { id: 15, name: 'Clifton Block 4', level: 'Society', parentId: 2, slug: 'clifton-block-4' }
    ];

    const MOCK_AMENITIES = [
      { id: 1, name: 'Electricity Backup', icon: 'fa-bolt' },
      { id: 2, name: 'Waste Disposal', icon: 'fa-trash' },
      { id: 3, name: 'Swimming Pool', icon: 'fa-person-swimming' },
      { id: 4, name: 'Lawn / Garden', icon: 'fa-tree' },
      { id: 5, name: 'Gym / Fitness', icon: 'fa-dumbbell' },
      { id: 6, name: 'Security Staff', icon: 'fa-shield-halved' },
      { id: 7, name: 'Elevator', icon: 'fa-elevator' },
      { id: 8, name: 'Possession Ready', icon: 'fa-key' }
    ];

    const MOCK_PROPERTIES = [
      {
        id: 1, referenceCode: 'RS-LAH-1001', title: '10 Marla Modern House Phase 5 DHA', slug: '10-marla-modern-house-phase-5-1',
        description: 'Brand-new modern architecture with Spanish tiles, designer kitchen, imported fixtures and lush green lawn facing 50ft road.',
        propertyType: 'House', listingType: 'Sale', status: 'Available', price: 46500000, rentFrequency: '',
        areaSize: 10, areaUnit: 'Marla', bedrooms: 5, bathrooms: 6, locationId: 11, address: 'Street 14, Sector C, Phase 5',
        latitude: 31.4697, longitude: 74.4153, ownerName: 'Owner 1', ownerPhone: '03005000001',
        assignedAgent: 'agent1', isFeatured: 1, viewsCount: 245, publishedAt: new Date(Date.now() - 12*86400000).toISOString(),
        images: [
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80'
        ],
        amenityIds: [1, 2, 4, 6], createdBy: 'admin', created: new Date(Date.now() - 14*86400000).toISOString()
      },
      {
        id: 2, referenceCode: 'RS-LAH-1002', title: '5 Marla Brand New House Phase 6 DHA', slug: '5-marla-brand-new-house-phase-6-2',
        description: 'Double unit house ideal for 2 families, near commercial market and central park with underground wiring.',
        propertyType: 'House', listingType: 'Sale', status: 'Available', price: 27500000, rentFrequency: '',
        areaSize: 5, areaUnit: 'Marla', bedrooms: 3, bathrooms: 4, locationId: 12, address: 'Block D, Phase 6',
        latitude: 31.4832, longitude: 74.4421, ownerName: 'Owner 2', ownerPhone: '03005000002',
        assignedAgent: 'agent2', isFeatured: 1, viewsCount: 189, publishedAt: new Date(Date.now() - 11*86400000).toISOString(),
        images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80'],
        amenityIds: [1, 2, 6], createdBy: 'manager1', created: new Date(Date.now() - 13*86400000).toISOString()
      },
      {
        id: 3, referenceCode: 'RS-LAH-1003', title: '1 Kanal Luxury Villa Sector C Bahria', slug: '1-kanal-luxury-villa-sector-c-3',
        description: 'Designer villa with swimming pool, home theatre, basement and servant quarters. Facing park, fully furnished.',
        propertyType: 'House', listingType: 'Sale', status: 'Reserved', price: 82500000, rentFrequency: '',
        areaSize: 1, areaUnit: 'Kanal', bedrooms: 5, bathrooms: 6, locationId: 13, address: 'Sector C, Main Boulevard',
        latitude: 31.3684, longitude: 74.1801, ownerName: 'Owner 3', ownerPhone: '03005000003',
        assignedAgent: 'agent1', isFeatured: 0, viewsCount: 312, publishedAt: new Date(Date.now() - 10*86400000).toISOString(),
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'],
        amenityIds: [1, 2, 3, 4, 5, 6], createdBy: 'admin', created: new Date(Date.now() - 12*86400000).toISOString()
      },
      {
        id: 4, referenceCode: 'RS-LAH-1004', title: '2 Bed Apartment Gulberg Main Market', slug: '2-bed-apartment-gulberg-4',
        description: 'Well-maintained apartment near Main Market with lift, standby generator and 24/7 security.',
        propertyType: 'Flat', listingType: 'Rent', status: 'Available', price: 125000, rentFrequency: 'Monthly',
        areaSize: 1200, areaUnit: 'Sq Ft', bedrooms: 2, bathrooms: 2, locationId: 6, address: 'Main Market vicinity',
        latitude: 31.5102, longitude: 74.3441, ownerName: 'Owner 4', ownerPhone: '03005000004',
        assignedAgent: 'agent3', isFeatured: 0, viewsCount: 98, publishedAt: new Date(Date.now() - 9*86400000).toISOString(),
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80'],
        amenityIds: [1, 2, 6, 7], createdBy: 'manager1', created: new Date(Date.now() - 10*86400000).toISOString()
      },
      {
        id: 5, referenceCode: 'RS-KAR-1005', title: '500 Sq Yd Bungalow Phase 8 DHA', slug: '500-sq-yd-bungalow-phase-8-5',
        description: 'Owner-built bungalow with basement, roof-top terrace and separate servant block. Prime Phase 8 location.',
        propertyType: 'House', listingType: 'Sale', status: 'Available', price: 95000000, rentFrequency: '',
        areaSize: 500, areaUnit: 'Sq Yd', bedrooms: 5, bathrooms: 5, locationId: 14, address: 'Phase 8, near park',
        latitude: 24.7896, longitude: 67.1215, ownerName: 'Owner 5', ownerPhone: '03005000005',
        assignedAgent: 'agent2', isFeatured: 1, viewsCount: 421, publishedAt: new Date(Date.now() - 8*86400000).toISOString(),
        images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'],
        amenityIds: [1, 2, 3, 4, 6], createdBy: 'admin', created: new Date(Date.now() - 9*86400000).toISOString()
      }
    ];

    const MOCK_LEADS = [
      {
        id: 1, fullName: 'Lead 1 (Muhammad Ali)', phone: '03001000001', email: 'lead1@demo.com', source: 'Website', interestType: 'Buy',
        propertyId: 1, preferredLocationId: 11, budgetMin: 40000000, budgetMax: 50000000, message: 'Interested in Phase 5 house — is price negotiable?',
        status: 'Negotiating', lostReason: '', assignedAgent: 'agent1', createdBy: '', created: new Date(Date.now() - 10*86400000).toISOString(),
        offers: [{ id: 1, date: new Date(Date.now() - 4*86400000).toISOString(), amount: 42000000, by: 'Buyer', status: 'Countered', notes: 'First offer', addedBy: 'agent1' }]
      },
      {
        id: 2, fullName: 'Lead 2 (Usman Khan)', phone: '03001000002', email: 'lead2@demo.com', source: 'WhatsApp', interestType: 'Rent',
        propertyId: 4, preferredLocationId: 6, budgetMin: 100000, budgetMax: 140000, message: 'Looking for 2-bed near Main Market.',
        status: 'Viewing Scheduled', lostReason: '', assignedAgent: 'agent3', createdBy: 'manager1', created: new Date(Date.now() - 6*86400000).toISOString()
      },
      {
        id: 3, fullName: 'Lead 3 (Tariq Mehmood)', phone: '03001000003', email: 'tariq@demo.com', source: 'Facebook', interestType: 'Buy',
        propertyId: 5, preferredLocationId: 14, budgetMin: 80000000, budgetMax: 100000000, message: 'Saw Phase 8 bungalow ad.',
        status: 'Qualified', lostReason: '', assignedAgent: 'agent2', createdBy: 'agent2', created: new Date(Date.now() - 5*86400000).toISOString()
      }
    ];

    const MOCK_DEALS = [
      {
        id: 1, dealType: 'Sale', propertyId: 1, leadId: 1, buyerName: 'Buyer 1', buyerPhone: '03006000001', agent: 'agent1',
        dealAmount: 43500000, commissionPct: 1, commissionAmt: 435000, agentSharePct: 40, agentShareAmt: 174000, agentPaidAt: null,
        tokenAmount: 1000000, payments: [{ date: new Date().toISOString(), amount: 1000000, method: 'Cash', ref: '', notes: 'Token money', receivedBy: 'agent1' }],
        status: 'Token', closedAt: null, cancellationReason: '', notes: 'Token received, agreement on 25th', createdBy: 'agent1', created: new Date().toISOString()
      }
    ];

    const MOCK_APPOINTMENTS = [
      {
        id: 1, leadId: 2, propertyId: 4, agent: 'agent3', scheduledAt: new Date(Date.now() + 4*3600000).toISOString(),
        durationMinutes: 45, status: 'Confirmed', notes: 'Client will bring family', cancellationReason: '', reminderSent: 0, createdBy: 'agent3', created: new Date().toISOString()
      }
    ];

    // Helper functions for mock storage
    function getStore(k, def) {
      try {
        const v = localStorage.getItem('GS_MOCK_' + k);
        return v ? JSON.parse(v) : def;
      } catch (e) { return def; }
    }
    function setStore(k, val) {
      try { localStorage.setItem('GS_MOCK_' + k, JSON.stringify(val)); } catch (e) {}
    }

    // Default permissions
    const ADMIN_PERMS = {
      dashboard: { v:1, a:1, e:1, d:1 }, ai: { v:1, a:1, e:1, d:1 }, properties: { v:1, a:1, e:1, d:1 },
      leads: { v:1, a:1, e:1, d:1 }, followups: { v:1, a:1, e:1, d:1 }, appointments: { v:1, a:1, e:1, d:1 },
      deals: { v:1, a:1, e:1, d:1 }, tenancies: { v:1, a:1, e:1, d:1 }, agreements: { v:1, a:1, e:1, d:1 },
      reports: { v:1, a:1, e:1, d:1 }, owners: { v:1, a:1, e:1, d:1 }, locations: { v:1, a:1, e:1, d:1 },
      amenities: { v:1, a:1, e:1, d:1 }, users: { v:1, a:1, e:1, d:1 }, settings: { v:1, a:1, e:1, d:1 },
      logs: { v:1, a:1, e:1, d:1 }, trash: { v:1, a:1, e:1, d:1 }
    };

    // Google Script Run Mock API
    const API = {
      authenticateUser: async (username, password) => {
        const users = getStore('USERS', MOCK_USERS);
        const u = users.find(x => x.Username.toLowerCase() === username.toLowerCase());
        if (!u) return { success: false, message: 'Username not found (Try: admin / admin123)' };
        if (u.Password !== password) return { success: false, message: 'Invalid password (Try: admin123)' };
        return {
          success: true,
          username: u.Username,
          email: u.Email,
          role: u.Role,
          profileImage: '',
          themeMode: 'light',
          customColors: '',
          permissions: ADMIN_PERMS,
          canEditRbac: u.Role === 'Admin'
        };
      },

      getPublicPortalData: async () => {
        const props = getStore('PROPERTIES', MOCK_PROPERTIES);
        const locs = getStore('LOCATIONS', MOCK_LOCATIONS);
        const amens = getStore('AMENITIES', MOCK_AMENITIES);
        return {
          success: true,
          properties: props.filter(p => p.status === 'Available' || p.status === 'Reserved'),
          locations: locs,
          amenities: amens
        };
      },

      getDashboardData: async (caller) => {
        const props = getStore('PROPERTIES', MOCK_PROPERTIES);
        const leads = getStore('LEADS', MOCK_LEADS);
        const deals = getStore('DEALS', MOCK_DEALS);
        return {
          success: true,
          kpis: {
            totalProperties: props.length,
            availableProperties: props.filter(p => p.status === 'Available').length,
            totalLeads: leads.length,
            activeLeads: leads.filter(l => ['New','Contacted','Qualified','Viewing Scheduled','Negotiating'].includes(l.status)).length,
            totalDeals: deals.length,
            dealsVolume: deals.reduce((s, d) => s + (d.dealAmount || 0), 0),
            commissionEarned: deals.reduce((s, d) => s + (d.commissionAmt || 0), 0)
          },
          recentLeads: leads.slice(0, 5),
          recentProperties: props.slice(0, 5)
        };
      },

      getProperties: async () => ({ success: true, data: getStore('PROPERTIES', MOCK_PROPERTIES) }),
      getLeads: async () => ({ success: true, data: getStore('LEADS', MOCK_LEADS) }),
      getFollowUps: async () => ({ success: true, data: [] }),
      getAppointments: async () => ({ success: true, data: getStore('APPOINTMENTS', MOCK_APPOINTMENTS) }),
      getDeals: async () => ({ success: true, data: getStore('DEALS', MOCK_DEALS) }),
      getTenancies: async () => ({ success: true, data: [] }),
      getOwners: async () => ({ success: true, data: [] }),
      getLocations: async () => ({ success: true, data: getStore('LOCATIONS', MOCK_LOCATIONS) }),
      getAmenities: async () => ({ success: true, data: getStore('AMENITIES', MOCK_AMENITIES) }),
      getAllUsers: async () => ({ success: true, data: getStore('USERS', MOCK_USERS) }),
      getRoles: async () => ({ success: true, data: [{ key: 'Admin', label: 'Admin', color: '#6a1b9a' }, { key: 'Manager', label: 'Manager', color: '#0074D9' }, { key: 'Agent', label: 'Agent', color: '#2ECC40' }] }),
      getActivityLogs: async () => ({ success: true, data: [] }),
      getTrash: async () => ({ success: true, data: [] }),
      getMyPermissions: async () => ({ success: true, perms: ADMIN_PERMS, canEdit: true }),
      getUserSettings: async (user) => ({ success: true, settings: { profileImage: '', themeMode: 'light', customColors: '' } }),
      updateUserSettings: async (user, s) => ({ success: true }),

      addProperty: async (p, user) => {
        const list = getStore('PROPERTIES', MOCK_PROPERTIES);
        p.id = Date.now();
        p.referenceCode = 'RS-LOC-' + Math.floor(1000 + Math.random()*9000);
        list.unshift(p);
        setStore('PROPERTIES', list);
        return { success: true, message: 'Property added successfully!' };
      },

      addLead: async (l, user) => {
        const list = getStore('LEADS', MOCK_LEADS);
        l.id = Date.now();
        list.unshift(l);
        setStore('LEADS', list);
        return { success: true, message: 'Lead added successfully!' };
      },

      aiChat: async (user, msg) => {
        return {
          success: true,
          reply: 'Xin chào ' + user + '! Tôi là trợ lý AI Bất Động Sản. Hệ thống của bạn đang quản lý các bất động sản và khách hàng tiềm năng. Tôi có thể giúp gì cho bạn hôm nay?'
        };
      }
    };

    async function authHeaders() {
      try {
        const session = JSON.parse(localStorage.getItem('userSession') || '{}');
        let authSession = session && session.authSession;
        const needsRefresh = authSession && authSession.refreshToken && (
          !window.__crmAuthRefreshedAt || Number(authSession.expiresAt || 0) <= Date.now() + 60000
        );
        if (needsRefresh) {
          const refreshResponse = await fetch('/api/run/refreshAuthSession', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ args: [authSession.refreshToken] })
          });
          const refreshed = await refreshResponse.json();
          if (refreshResponse.ok && refreshed.success && refreshed.authSession) {
            authSession = refreshed.authSession;
            session.authSession = authSession;
            localStorage.setItem('userSession', JSON.stringify(session));
            window.__crmAuthRefreshedAt = Date.now();
          }
        }
        const token = authSession && authSession.accessToken;
        return Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {});
      } catch (error) {
        return { 'Content-Type': 'application/json' };
      }
    }

    // Use the server API for every supported local call.
    const workbookMethods = [
      'authenticateUser','getPublicPortal','publicViewProperty','getDashboardStats','getMyPermissions','getAllUsers',
      'getUserSettings','getNotifications','getDefaultTheme','getAiConfig','getAppConfig','getTrash','getProperties',
      'getLeads','getFollowUps','getAppointments','getDeals','getTenancies','getOwners','getLocations','getAmenities','getLogs'
    ];
    workbookMethods.forEach((method) => {
      API[method] = async (...args) => {
        const response = await fetch('/api/run/' + encodeURIComponent(method), {
          method: 'POST', headers: await authHeaders(), body: JSON.stringify({ args })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Local API error');
        return result;
      };
    });

    // Construct window.google.script.run proxy
    window.google = window.google || {};
    window.google.script = window.google.script || {};
    
    function createRunner(successCb, failureCb) {
      return new Proxy({}, {
        get: function(target, prop) {
          if (prop === 'withSuccessHandler') {
            return (fn) => createRunner(fn, failureCb);
          }
          if (prop === 'withFailureHandler') {
            return (fn) => createRunner(successCb, fn);
          }
          return async function(...args) {
            try {
              const response = await fetch('/api/run/' + encodeURIComponent(prop), {
                method: 'POST', headers: await authHeaders(), body: JSON.stringify({ args })
              });
              const res = await response.json();
              if (!response.ok) throw new Error(res.message || 'Local API error');
              if (successCb) successCb(res);
              return res;
            } catch (err) {
              console.error('[Localhost API Error]:', prop, err);
              if (failureCb) failureCb(err);
              else throw err;
            }
          };
        }
      });
    }

    window.google.script.run = createRunner(null, null);
    console.log('✅ [Localhost] Google Apps Script Runtime Bridge initialized successfully!');
  })();
</script>
`;

const appHandler = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end();
    return;
  }
  if (req.url && req.url.startsWith('/api/run/')) {
    const method = decodeURIComponent(req.url.slice('/api/run/'.length).split('?')[0]);
    try {
      const body = await requestJson(req);
      const result = supabaseBackend.enabled
        ? await supabaseBackend.run(method, Array.isArray(body.args) ? body.args : [], req.headers.authorization || '')
        : await localBackend.run(method, Array.isArray(body.args) ? body.args : []);
      jsonResponse(res, 200, result);
    } catch (error) {
      jsonResponse(res, 500, { success:false, message:'Lỗi API cục bộ: ' + error.message });
    }
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let rawData;
  const possiblePaths = [
    path.join(__dirname, 'code-appscript', 'index.html'),
    path.join(process.cwd(), 'code-appscript', 'index.html'),
    path.join(__dirname, '..', 'code-appscript', 'index.html'),
    path.resolve('code-appscript', 'index.html')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        rawData = fs.readFileSync(p, 'utf8');
        break;
      } catch (_) {}
    }
  }

  if (!rawData) {
    res.writeHead(500);
    res.end('<h1>500 - Lỗi máy chủ khi đọc tệp HTML</h1><p>Không tìm thấy file index.html</p>');
    return;
  }

  // Replace Apps Script template tags for local preview
  let output = rawData
    .replace(/<\?!=\s*defaultThemeVars\s*\?>/g, '')
    .replace(/<\?!=\s*deepLink\s*\?>/g, '')
    .replace(/<\?!=\s*appUrl\s*\?>/g, '');

  // Inject Google Script Run Mock Bridge before </head>
  output = output.replace('</head>', `${GOOGLE_SCRIPT_RUN_MOCK}</head>`);

  res.writeHead(200);
  res.end(output);
};

const server = http.createServer(appHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 BĐS MASTER CRM ĐANG CHẠY TRÊN LOCALHOST:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`👤 Tài khoản mặc định: admin  | Mật khẩu: admin123`);
    console.log(`====================================================`);
  });
}

module.exports = appHandler;
