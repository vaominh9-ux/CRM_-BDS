/**
 * Developed by Mohammad Rameez Imdad (Rameez Scripts)
 * WhatsApp: https://wa.me/923224083545 (For Custom Projects)
 * YouTube: https://www.youtube.com/@rameezimdad (Subscribe for more!)
 */

// ============== Configuration ==============
var USERS_SHEET = 'Users';
var LOGS_SHEET = 'Logs';
var ROLES_SHEET = 'Roles';
var ASSETS_FOLDER_NAME = 'ASSETS';

// json-row sheets (Date | Data) — everything except Users/Roles
var SHEETS = { LOGS:'Logs', LOCATIONS:'Locations', AMENITIES:'Amenities', PROPERTIES:'Properties', LEADS:'Leads', FOLLOWUPS:'FollowUps', APPOINTMENTS:'Appointments',
               DEALS:'Deals', OWNERS:'Owners', TENANCIES:'Tenancies' };

// enums — single validation source (frontend keeps its own copy for dropdowns)
var ENUMS = {
  propertyType: ['House','Flat','Upper Portion','Lower Portion','Farm House','Plot','Commercial Plot','Shop','Office','Warehouse','Building'],
  listingType: ['Sale','Rent'],
  propertyStatus: ['Draft','Available','Reserved','Sold','Rented','Withdrawn'],
  rentFrequency: ['Monthly','Yearly'],
  areaUnit: ['Sq M'],
  locationLevel: ['City','Area','Society'],
  leadSource: ['Website','WhatsApp','Facebook','Walk-in','Referral','Phone Call','Other'],
  interestType: ['Buy','Rent','Sell','Rent Out'],
  leadStatus: ['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won','Lost'],
  followUpType: ['Call','WhatsApp','Email','Meeting','Note'],
  followUpStatus: ['Pending','Completed','Cancelled'],
  appointmentStatus: ['Scheduled','Confirmed','Completed','Cancelled','No Show'],
  dealStatus: ['Token','Agreement','Completed','Cancelled'],
  paymentMethod: ['Cash','Bank Transfer','Cheque','Online'],
  tenancyStatus: ['Active','Ended'],
  expenseCategory: ['Maintenance','Marketing','Legal','Utility','Other'],
  interestLevel: ['Hot','Warm','Cold'],
  offerStatus: ['Open','Countered','Accepted','Rejected'],
  offerBy: ['Buyer','Seller']
};
var inEnum_ = function(k, v){ return ENUMS[k].indexOf(v) !== -1; };

// ============== RBAC Config ==============
// cols: 0=role_key, 1=label, 2=color, 3=sort, 4=is_super, 5=hidden_signup, 6=permissions(JSON)
var ROLE_C = { KEY:0, LABEL:1, COLOR:2, SORT:3, SUPER:4, HIDDEN:5, PERMS:6 };

// pages the matrix governs (account=always-on, permissions=editor-only — not listed here)
var RBAC_PAGES = [
  { key:'dashboard',    label:'Dashboard',     group:'General' },
  { key:'ai',           label:'AI Assistant',  group:'General' },
  { key:'properties',   label:'Properties',    group:'CRM' },
  { key:'leads',        label:'Leads',         group:'CRM' },
  { key:'followups',    label:'Follow-Ups',    group:'CRM' },
  { key:'appointments', label:'Appointments',  group:'CRM' },
  { key:'deals',        label:'Deals',         group:'Money' },
  { key:'tenancies',    label:'Tenancies',     group:'Money' },
  { key:'agreements',   label:'Agreements',    group:'Money' },
  { key:'reports',      label:'Reports',       group:'Money' },
  { key:'owners',       label:'Owners',        group:'Catalog' },
  { key:'locations',    label:'Locations',     group:'Catalog' },
  { key:'amenities',    label:'Amenities',     group:'Catalog' },
  { key:'users',        label:'Users',         group:'System' },
  { key:'settings',     label:'Settings',      group:'System' },
  { key:'logs',         label:'Activity Logs', group:'System' },
  { key:'trash',        label:'Trash',         group:'System' }
];

// roles — keys MATCH Users.Role values
var RBAC_ROLE_DEFS = [
  { key:'Admin',   label:'Admin',   color:'#6a1b9a', is_super:1, hidden_signup:1 },
  { key:'Manager', label:'Manager', color:'#0074D9', is_super:0, hidden_signup:1 },
  { key:'Agent',   label:'Agent',   color:'#2ECC40', is_super:0, hidden_signup:0 }
];

var RBAC_EDIT_ROLES = ['Admin']; // who may open/edit the matrix

// Own-vs-All data scope — enforced in the query layer, NOT the matrix
var scopeAll_ = function(role){ return role === 'Admin' || role === 'Manager'; };

// starting grants per role (spec matrix)
function rbacDefaultPerms_(roleKey) {
  var perms = {};
  var set = function(k,v,a,e,d){ perms[k] = { v:v?1:0, a:a?1:0, e:e?1:0, d:d?1:0 }; };
  RBAC_PAGES.forEach(function(p){ set(p.key,0,0,0,0); }); // deny all
  if (roleKey === 'Admin') { RBAC_PAGES.forEach(function(p){ set(p.key,1,1,1,1); }); return perms; }
  if (roleKey === 'Manager') {
    set('dashboard',1,0,0,0);
    set('ai',1,0,0,0);
    set('properties',1,1,1,1);
    set('leads',1,1,1,1);
    set('followups',1,1,1,1);
    set('appointments',1,1,1,1);
    set('deals',1,1,1,1);      // + Complete/Cancel/Mark Paid (scopeAll_-gated in the fns)
    set('tenancies',1,1,1,0);
    set('agreements',1,1,0,0);
    set('reports',1,0,0,0);
    set('owners',1,1,1,0);
    set('locations',1,1,1,0);  // no delete — live public URLs are Admin-only to kill
    set('users',1,0,0,0);      // read-only assignment list
    set('settings',1,0,0,0);
    set('logs',1,0,0,0);
    return perms;
  }
  // Agent — read all inventory, edit own; pipeline own-scoped in query layer; no deletes
  set('dashboard',1,0,0,0);
  set('ai',1,0,0,0);              // chat over OWN records only (context is role-scoped)
  set('properties',1,1,1,0);
  set('leads',1,1,1,0);
  set('followups',1,1,1,0);
  set('appointments',1,1,1,0);
  set('deals',1,1,1,0);        // own deals; never Complete/Cancel/Mark Paid
  set('tenancies',1,0,1,0);    // collect rent + log maintenance on own; never create/end
  set('agreements',1,1,0,0);   // generate documents for own records
  set('reports',1,0,0,0);      // own-scope numbers only
  set('owners',1,1,0,0);       // read + inline "+ New owner" from the property form
  set('settings',1,0,0,0);
  return perms;
}

// ============== Tiny helpers (DRY spine) — fetch/find/respond in one place ==============
var DEFAULT_LOGO = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg';
// Users cols: 0=name 1=email 2=pwd 3=role 4=status 5=img 6=theme 7=colors 8=createdAt 9=createdBy 10=updatedAt 11=updatedBy 12=target
var U = { NAME:0, EMAIL:1, PWD:2, ROLE:3, STATUS:4, IMG:5, THEME:6, COLORS:7, CREATED:8, CREATED_BY:9, UPDATED:10, UPDATED_BY:11, TARGET:12 };
var ok_  = function(o){ o = o || {}; o.success = true; return o; };            // success response
var err_ = function(m, extra){ var o = extra || {}; o.success = false; o.message = m; return o; }; // fail response (+optional payload)
var ss_  = function(){ return SpreadsheetApp.getActiveSpreadsheet(); };
var sh_  = function(n){ return ss_().getSheetByName(n); };
var nowIso_ = function(){ return new Date().toISOString(); };
var iso_ = function(v){ if (v && !(typeof v === 'string' && v.indexOf('T') !== -1)) { try { return new Date(v).toISOString(); } catch (e) {} } return v; };
var findRow_ = function(data, col, val){ for (var i = 1; i < data.length; i++) if (String(data[i][col]) === String(val)) return i; return -1; }; // string-coerced — numeric-looking cells still match
var userRows_ = function(){ var s = sh_(USERS_SHEET); if (!s) throw 'Users sheet not found'; return { sh:s, data:s.getDataRange().getValues() }; };
var ymd_ = function(v){ if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v; return Utilities.formatDate(new Date(v), Session.getScriptTimeZone(), 'yyyy-MM-dd'); };
var safeParse_ = function(s){ try { var a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
var slug_ = function(s){ return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
var normPhone_ = function(s){ var t = String(s || '').replace(/[^\d+]/g, ''); return t.replace(/(.)\+/g, '$1'); }; // digits + one leading +
var r2_ = function(n){ return Math.round((parseFloat(n) || 0) * 100) / 100; }; // money — 2dp half-up, same rule client-side

// ============== JDB — json row db (Date | Data, one row per day, 45k cell split) ==============
var JDB_MAX = 45000;
var jsheet_ = function(name){ // self-healing: create with header if missing
  var s = sh_(name);
  if (!s) {
    s = ss_().insertSheet(name);
    s.appendRow(['Date', 'Data']);
    s.getRange(1, 1, 1, 2).setBackground('#001f3f').setFontColor('white').setFontWeight('bold');
    s.getRange('A:A').setNumberFormat('@'); // day keys stay text
  }
  return s;
};

var JDB = {
  rows: function(name) { // [{row, date, arr}]
    var sh = jsheet_(name);
    if (sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()
      .map(function(v, i){ return { row: i + 2, date: ymd_(v[0]), arr: safeParse_(v[1]) }; });
  },
  readAll: function(name) { return this.rows(name).reduce(function(o, r){ return o.concat(r.arr); }, []); }, // incl deleted — callers filter
  readRange: function(name, from, to) {
    return this.rows(name).filter(function(r){ return (!from || r.date >= from) && (!to || r.date <= to); })
      .reduce(function(o, r){ return o.concat(r.arr); }, []);
  },
  find: function(name, fn) { return this.readAll(name).find(fn) || null; },
  byId: function(name, id) { return this.find(name, function(x){ return x.id == id; }); },
  nextId: function(name) {
    var props = PropertiesService.getScriptProperties(), key = 'JID_' + name;
    var id = parseInt(props.getProperty(key) || '0');
    if (!id) id = this.readAll(name).reduce(function(m, x){ return Math.max(m, x.id || 0); }, 0); // lazy init
    props.setProperty(key, String(id + 1));
    return id + 1;
  },
  insert: function(name, rec) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var now = nowIso_();
      rec.id = this.nextId(name);
      rec.created = rec.created || now;
      rec.updated = now;
      var date = ymd_(rec.created), sh = jsheet_(name);
      var day = this.rows(name).filter(function(r){ return r.date === date; }), last = day[day.length - 1];
      if (last) {
        var json = JSON.stringify(last.arr.concat([rec]));
        if (json.length <= JDB_MAX) { sh.getRange(last.row, 2).setValue(json); return rec; }
      }
      sh.appendRow([date, JSON.stringify([rec])]); // new day or overflow chunk
      return rec;
    } finally { lock.releaseLock(); }
  },
  update: function(name, id, patch) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sh = jsheet_(name), all = this.rows(name);
      for (var j = 0; j < all.length; j++) {
        var r = all[j], i = r.arr.findIndex(function(x){ return x.id == id; });
        if (i === -1) continue;
        Object.assign(r.arr[i], patch, { updated: nowIso_() });
        sh.getRange(r.row, 2).setValue(JSON.stringify(r.arr));
        return r.arr[i];
      }
      return null;
    } finally { lock.releaseLock(); }
  },
  patchMany: function(name, ids, patch) { // N changes = 1 read, write only touched day rows
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sh = jsheet_(name), set = {}, now = nowIso_(), n = 0;
      ids.forEach(function(id){ set[String(id)] = 1; });
      this.rows(name).forEach(function(r){
        var hit = false;
        r.arr.forEach(function(x){ if (set[String(x.id)]) { Object.assign(x, patch, { updated: now }); hit = true; } });
        if (hit) { sh.getRange(r.row, 2).setValue(JSON.stringify(r.arr)); n++; }
      });
      return n;
    } finally { lock.releaseLock(); }
  },
  increment: function(name, id, field) { // read-modify-write INSIDE the lock — counters never lose updates
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sh = jsheet_(name), all = this.rows(name);
      for (var j = 0; j < all.length; j++) {
        var r = all[j], i = r.arr.findIndex(function(x){ return x.id == id; });
        if (i === -1) continue;
        r.arr[i][field] = (r.arr[i][field] || 0) + 1;
        r.arr[i].updated = nowIso_();
        sh.getRange(r.row, 2).setValue(JSON.stringify(r.arr));
        return r.arr[i];
      }
      return null;
    } finally { lock.releaseLock(); }
  },
  remove: function(name, id) { return this.update(name, id, { deleted: 1 }); } // soft del
};

// bulk ids in one property write (imports/seeds)
var jdbNextIds_ = function(name, n) {
  var props = PropertiesService.getScriptProperties(), key = 'JID_' + name;
  var id = parseInt(props.getProperty(key) || '0');
  if (!id) id = JDB.readAll(name).reduce(function(m, x){ return Math.max(m, x.id || 0); }, 0);
  props.setProperty(key, String(id + n));
  var out = []; for (var i = 1; i <= n; i++) out.push(id + i);
  return out;
};

// imports/seeds — day-grouped, 45k-chunked, ONE setValues; ids allocated INSIDE the lock
// decorate(rec, i, recs) runs after ids exist — for id-derived fields (refCode/slug/in-batch parents)
var jdbBulkInsert_ = function(name, recs, decorate) {
  if (!recs || !recs.length) return 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = nowIso_(), need = recs.filter(function(r){ return !r.id; });
    var ids = need.length ? jdbNextIds_(name, need.length) : [];
    need.forEach(function(r, i){ r.id = ids[i]; });
    if (decorate) recs.forEach(decorate);
    recs.forEach(function(r){ r.created = r.created || now; r.updated = now; });
    var byDay = {};
    recs.forEach(function(r){ var d = ymd_(r.created); (byDay[d] = byDay[d] || []).push(r); });
    var sh = jsheet_(name), rows = [];
    Object.keys(byDay).sort().forEach(function(day) {
      var chunk = [];
      byDay[day].forEach(function(r) {
        chunk.push(r);
        if (JSON.stringify(chunk).length > JDB_MAX) { var last = chunk.pop(); rows.push([day, JSON.stringify(chunk)]); chunk = [last]; }
      });
      if (chunk.length) rows.push([day, JSON.stringify(chunk)]);
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 2).setValues(rows);
    return recs.length;
  } finally { lock.releaseLock(); }
};

// slug uniqueness within a sheet (deleted rows included — old public URLs never recycle)
var uniqueSlug_ = function(sheet, base) {
  var used = {}; JDB.readAll(sheet).forEach(function(x){ if (x.slug) used[x.slug] = 1; });
  var s = base || 'item', out = s, i = 2;
  while (used[out]) out = s + '-' + (i++);
  return out;
};

// "City › Area › Society" label resolver
var locPath_ = function(locs) {
  var byId = {}; locs.forEach(function(l){ byId[l.id] = l; });
  return function(id) {
    var out = [], cur = byId[id], guard = 0;
    while (cur && guard++ < 5) { out.unshift(cur.name); cur = byId[cur.parentId]; }
    return out.join(' › ');
  };
};

// 3-letter root city code for reference numbers (RS-LAH-1024)
var rootCity_ = function(locs, id) {
  var byId = {}; locs.forEach(function(l){ byId[l.id] = l; });
  var cur = byId[id], guard = 0;
  while (cur && cur.parentId && guard++ < 5) cur = byId[cur.parentId];
  return cur ? String(cur.name).replace(/[^A-Za-z]/g, '').substr(0, 3).toUpperCase() : 'GEN';
};

// ============== Main Web App Entry Point ==============
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  // global default theme vars → injected for zero-flash first paint
  template.defaultThemeVars = PropertiesService.getScriptProperties().getProperty('DEFAULT_THEME_VARS') || '';
  template.deepLink = String((e && e.parameter && e.parameter.p) || '').replace(/[^a-z0-9-]/gi, ''); // ?p=<slug> -> portal detail
  template.appUrl = ScriptApp.getService().getUrl() || ''; // share links / QR target

  return template
    .evaluate()
    .setTitle('Real Estate CRM & Property Portal')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============== Authentication ==============
function authenticateUser(username, password) {
  try {
    var d = userRows_().data, i = findRow_(d, U.NAME, username);
    if (i === -1)                  { addLog_(username, 'Login Failed', 'Username not found');  return err_('Username not found'); }
    var r = d[i];
    if (r[U.STATUS] !== 'Active')  { addLog_(username, 'Login Failed', 'Account is inactive'); return err_('Account is inactive. Please contact administrator.'); }
    if (String(password) !== String(r[U.PWD])) { addLog_(username, 'Login Failed', 'Invalid password'); return err_('Invalid password'); }
    addLog_(username, 'Login Success', 'User logged in successfully');
    return ok_({ username:r[U.NAME], email:r[U.EMAIL], role:r[U.ROLE], profileImage:r[U.IMG] || '', themeMode:r[U.THEME] || 'light',
                 customColors:r[U.COLORS] || '', permissions:rbacPermsFor_(r[U.ROLE]), canEditRbac:canEditRbac_(r[U.ROLE]) });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Get All Users (Admin Only) ==============
function getAllUsers(callerUser) {
  try {
    if (!gate_(callerUser, 'users', 'v')) return err_('Access denied');
    var full = userRole_(callerUser) === 'Admin'; // managers: assignment projection only — never email/audit
    var u = userRows_();
    if (u.data[0][U.TARGET] !== 'MonthlyTarget') u.sh.getRange(1, U.TARGET + 1).setValue('MonthlyTarget'); // self-heal new col
    return ok_({ data: u.data.slice(1).map(function(r){
      return full
        ? { Username:r[U.NAME], Email:r[U.EMAIL], Role:r[U.ROLE], Status:r[U.STATUS], MonthlyTarget: parseFloat(r[U.TARGET]) || 0,
            CreatedAt:iso_(r[U.CREATED]), CreatedBy:r[U.CREATED_BY], UpdatedAt:iso_(r[U.UPDATED]), UpdatedBy:r[U.UPDATED_BY] }
        : { Username:r[U.NAME], Email:'—', Role:r[U.ROLE], Status:r[U.STATUS], MonthlyTarget: 0, CreatedAt:'', CreatedBy:'', UpdatedAt:'', UpdatedBy:'' };
    }) });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Add User (Admin Only) ==============
function addUser(userData, currentUser) {
  try {
    if (!gate_(currentUser, 'users', 'a')) return err_('Access denied');
    var u = userRows_();
    if (findRow_(u.data, U.NAME, userData.Username) !== -1) return err_('Username already exists');
    var roleKeys = readRoles_().map(function(r){ return r.key; });
    var ts = nowIso_();
    u.sh.appendRow([userData.Username, userData.Email, userData.Password,
                    roleKeys.indexOf(userData.Role) !== -1 ? userData.Role : 'Agent', // registry-validated, never a dead role
                    userData.Status || 'Active', DEFAULT_LOGO, 'light', '', ts, currentUser, ts, currentUser,
                    parseFloat(userData.MonthlyTarget) || 0]);
    addLog_(currentUser, 'User Added', 'Added user: ' + userData.Username);
    return ok_({ message:'User added successfully!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Bulk Import Users (CSV) ==============
// skip-and-collect: bad rows -> errors[], good rows still land; ONE setValues, ONE log
function bulkImportUsers(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'users', 'a')) return err_('Access denied'); // gate first
    if (!rows || !rows.length) return err_('No rows to import');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000); // serialize concurrent imports
    try {
      var u = userRows_();
      var existing = u.data.slice(1).map(function(r){ return String(r[U.NAME]).trim().toLowerCase(); }); // dedup key
      var roleKeys = readRoles_().map(function(r){ return r.key; }); // live role registry
      var ts = nowIso_(), out = [], errors = [];
      rows.forEach(function(r, i) {
        var name = String(r.Username || '').trim(), key = name.toLowerCase();
        if (!name)                        { errors.push('Row ' + (i+1) + ': missing Username');       return; }
        if (!r.Email || !r.Password)      { errors.push('Row ' + (i+1) + ': missing Email/Password'); return; }
        if (existing.indexOf(key) !== -1) { errors.push('Row ' + (i+1) + ': duplicate ' + name);      return; }
        existing.push(key); // catch dups inside same csv
        out.push([name, String(r.Email).trim(), r.Password, roleKeys.indexOf(r.Role) !== -1 ? r.Role : 'Agent',
                  r.Status === 'Inactive' ? 'Inactive' : 'Active', DEFAULT_LOGO, 'light', '', ts, currentUser, ts, currentUser]);
      });
      if (out.length) u.sh.getRange(u.sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out); // one write
      addLog_(currentUser, 'Bulk Import', 'Users: ' + out.length + ' imported, ' + errors.length + ' skipped');
      return ok_({ count: out.length, errors: errors });
    } finally { lock.releaseLock(); }
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Update User (Admin Only) ==============
function updateUser(username, userData, currentUser) {
  try {
    if (!gate_(currentUser, 'users', 'e')) return err_('Access denied');
    var u = userRows_(), i = findRow_(u.data, U.NAME, username);
    if (i === -1) return err_('User not found');
    var row = i + 1;
    u.sh.getRange(row, U.EMAIL + 1).setValue(userData.Email);
    if (userData.Password && userData.Password.trim()) u.sh.getRange(row, U.PWD + 1).setValue(userData.Password);
    u.sh.getRange(row, U.ROLE + 1).setValue(userData.Role);
    u.sh.getRange(row, U.STATUS + 1).setValue(userData.Status);
    if (userData.MonthlyTarget !== undefined) u.sh.getRange(row, U.TARGET + 1).setValue(parseFloat(userData.MonthlyTarget) || 0);
    u.sh.getRange(row, U.UPDATED + 1, 1, 2).setValues([[nowIso_(), currentUser]]); // updatedAt + updatedBy
    addLog_(currentUser, 'User Updated', 'Updated user: ' + username);
    return ok_({ message:'User updated successfully!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Deactivate User (Admin Only — NEVER hard-delete, attribution survives) ==============
function deleteUser(username, currentUser) {
  try {
    if (!gate_(currentUser, 'users', 'd')) return err_('Access denied');
    if (username === currentUser) return err_('You cannot deactivate your own account');
    var u = userRows_(), i = findRow_(u.data, U.NAME, username);
    if (i === -1) return err_('User not found');
    u.sh.getRange(i + 1, U.STATUS + 1).setValue('Inactive');
    u.sh.getRange(i + 1, U.UPDATED + 1, 1, 2).setValues([[nowIso_(), currentUser]]);
    var open = JDB.readAll(SHEETS.LEADS).filter(function(l){
      return !l.deleted && l.assignedAgent === username && ['Won','Lost'].indexOf(l.status) === -1;
    }).length;
    addLog_(currentUser, 'User Deactivated', username + (open ? ' (' + open + ' open leads still assigned)' : ''));
    return ok_({ message: 'User deactivated.' + (open ? ' ' + open + ' open leads still assigned — reassign them from Users.' : ''), openLeads: open });
  } catch (e) { return err_('Error: ' + e); }
}

// offboarding: move ALL of an agent's work to another user (Admin only)
function reassignAgentWork(fromUser, toUser, currentUser) {
  try {
    if (userRole_(currentUser) !== 'Admin') return err_('Access denied');
    if (!userRole_(toUser)) return err_('Target user not found');
    if (fromUser === toUser) return err_('Pick a different target user');
    var moved = {};
    [[SHEETS.PROPERTIES,'assignedAgent'], [SHEETS.LEADS,'assignedAgent'], [SHEETS.FOLLOWUPS,'assignedAgent'], [SHEETS.APPOINTMENTS,'agent']].forEach(function(pr) {
      var ids = JDB.readAll(pr[0]).filter(function(x){ return !x.deleted && x[pr[1]] === fromUser; }).map(function(x){ return x.id; });
      var patch = {}; patch[pr[1]] = toUser;
      moved[pr[0]] = ids.length ? JDB.patchMany(pr[0], ids, patch) && ids.length : 0;
    });
    addLog_(currentUser, 'Agent Work Reassigned', fromUser + ' → ' + toUser + ' · ' + JSON.stringify(moved));
    return ok_({ message:'All work reassigned to ' + toUser, moved: moved });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Update My Account (User Profile) ==============
function updateMyAccount(username, formData) {
  try {
    var u = userRows_(), i = findRow_(u.data, U.NAME, username);
    if (i === -1) return err_('User not found');
    if (formData.CurrentPassword !== u.data[i][U.PWD]) return err_('Current password is incorrect');
    var row = i + 1;
    u.sh.getRange(row, U.EMAIL + 1).setValue(formData.Email);
    if (formData.NewPassword && formData.NewPassword.trim()) u.sh.getRange(row, U.PWD + 1).setValue(formData.NewPassword);
    u.sh.getRange(row, U.UPDATED + 1, 1, 2).setValues([[nowIso_(), username]]);
    addLog_(username, 'Profile Updated', 'Updated own profile');
    return ok_({ message:'Account updated successfully!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Dashboard Stats (role-scoped: agency-wide vs own-book) ==============
function getDashboardStats(callerUser) {
  try {
    if (!gate_(callerUser, 'dashboard', 'v')) return err_('Access denied');
    var role = userRole_(callerUser), all = scopeAll_(role), me = callerUser;
    var now = new Date(), today = ymd_(nowIso_());
    var allProps = JDB.readAll(SHEETS.PROPERTIES).filter(function(p){ return !p.deleted; }); // one read -> scoped view + join map
    var props = allProps.filter(function(p){ return all || p.assignedAgent === me; });
    var leads = JDB.readAll(SHEETS.LEADS).filter(function(l){ return !l.deleted && (all || l.assignedAgent === me); });
    var fus   = JDB.readAll(SHEETS.FOLLOWUPS).filter(function(f){ return !f.deleted && (all || f.assignedAgent === me); });
    var appts = JDB.readAll(SHEETS.APPOINTMENTS).filter(function(a){ return !a.deleted && (all || a.agent === me); });
    var count = function(arr, fn){ return arr.filter(fn).length; };
    var byStatus = function(arr, keys){ var o = {}; keys.forEach(function(k){ o[k] = 0; }); arr.forEach(function(x){ if (o[x.status] !== undefined) o[x.status]++; }); return o; };
    var overdue = function(f){ return f.status === 'Pending' && f.dueAt && new Date(f.dueAt) < now; }; // derived — never stored
    var stats = {
      scope: all ? 'agency' : 'own',
      inventory: byStatus(props, ENUMS.propertyStatus),
      activeListings: count(props, function(p){ return p.status === 'Available' || p.status === 'Reserved'; }),
      featured: count(props, function(p){ return p.isFeatured && p.status === 'Available'; }),
      totalViews: props.reduce(function(s, p){ return s + (p.viewsCount || 0); }, 0),
      funnel: byStatus(leads, ENUMS.leadStatus),
      openLeads: count(leads, function(l){ return ['Won','Lost'].indexOf(l.status) === -1; }),
      wonLeads: count(leads, function(l){ return l.status === 'Won'; }),
      unassignedLeads: all ? count(leads, function(l){ return !l.assignedAgent && ['Won','Lost'].indexOf(l.status) === -1; }) : 0,
      overdueFollowUps: count(fus, overdue),
      dueTodayFollowUps: count(fus, function(f){ return f.status === 'Pending' && f.dueAt && ymd_(f.dueAt) === today; }),
      todayAppointments: count(appts, function(a){ return ['Scheduled','Confirmed'].indexOf(a.status) !== -1 && ymd_(a.scheduledAt) === today; }),
      recentLeads: leads.slice(-6).reverse().map(function(l){
        return { id:l.id, fullName:l.fullName, phone:l.phone, status:l.status, source:l.source, created:l.created, assignedAgent:l.assignedAgent };
      })
    };
    // money row — deals scoped like everything else
    var deals = JDB.readAll(SHEETS.DEALS).filter(function(x){ return !x.deleted && (all || x.agent === me); });
    var mm = today.substr(0, 7), sum = function(arr, fn){ return r2_(arr.reduce(function(s, x){ return s + (fn(x) || 0); }, 0)); };
    var inMon = function(v, m){ return String(v || '').substr(0, 7) === m; };
    var closedIn = function(m){ return deals.filter(function(x){ return x.status === 'Completed' && inMon(x.closedAt, m); }); };
    var paidIn = function(m){ return sum(deals, function(x){ return (x.payments || []).filter(function(q){ return inMon(q.date, m); })
      .reduce(function(s, q){ return s + (q.amount || 0); }, 0); }); };
    var closedM = closedIn(mm);
    stats.dealsMonth = closedM.length;
    stats.dealsMonthValue = sum(closedM, function(x){ return x.dealAmount; });
    stats.commissionMonth = sum(closedM, function(x){ return x.commissionAmt; });
    stats.collectedMonth = paidIn(mm);
    stats.payable = sum(deals.filter(function(x){ return x.status === 'Completed' && !x.agentPaidAt; }), function(x){ return x.agentShareAmt; });
    var urows = userRows_().data.slice(1).filter(function(r){ return r[U.STATUS] === 'Active'; });
    var targets = {}; urows.forEach(function(r){ targets[r[U.NAME]] = parseFloat(r[U.TARGET]) || 0; });
    stats.activeAgents = urows.filter(function(r){ return r[U.ROLE] === 'Agent'; }).length;
    stats.myTarget = targets[me] || 0;
    if (all) { // leaderboard — agency scope only, agents never see peer numbers
      var names = urows.map(function(r){ return r[U.NAME]; });
      stats.leaderboard = names.map(function(a) {
        var closedByA = closedM.filter(function(x){ return x.agent === a; });
        return { agent: a,
          listings: count(props, function(p){ return p.assignedAgent === a && ['Available','Reserved'].indexOf(p.status) !== -1; }),
          openLeads: count(leads, function(l){ return l.assignedAgent === a && ['Won','Lost'].indexOf(l.status) === -1; }),
          won: count(leads, function(l){ return l.assignedAgent === a && l.status === 'Won'; }),
          overdue: count(fus, function(f){ return f.assignedAgent === a && overdue(f); }),
          dealValueM: sum(closedByA, function(x){ return x.dealAmount; }),
          commissionM: sum(closedByA, function(x){ return x.commissionAmt; }),
          target: targets[a] || 0 };
      }).filter(function(x){ return x.listings || x.openLeads || x.won || x.overdue || x.dealValueM; })
        .sort(function(x, y){ return y.dealValueM - x.dealValueM || y.won - x.won || y.openLeads - x.openLeads; });
    }

    // ---- visual dashboard datasets: trends, series, lists, funnel ----
    var pMap = {}; allProps.forEach(function(p){ pMap[p.id] = p; });           // O(1) joins, no scans
    var lMap = {}; leads.forEach(function(l){ lMap[l.id] = l; });
    var lpath = locPath_(JDB.readAll(SHEETS.LOCATIONS));
    var addrOf = function(p){ return p ? (p.address || lpath(p.locationId) || '—') : '—'; };
    // images are {url,isPrimary,sortOrder} objects — same primary-first pick pubProp_ uses
    var imgOf = function(p){ var a = (p && p.images) || []; return ((a.filter(function(x){ return x.isPrimary; })[0]) || a[0] || {}).url || ''; };

    var pm = ymd_(new Date(now.getFullYear(), now.getMonth() - 1, 1)).substr(0, 7); // prev month for the trend chips
    var closedP = closedIn(pm);
    stats.leadsMonth = count(leads, function(l){ return inMon(l.created, mm); });
    stats.prev = { deals: closedP.length, dealsValue: sum(closedP, function(x){ return x.dealAmount; }),
      commission: sum(closedP, function(x){ return x.commissionAmt; }), collected: paidIn(pm),
      leads: count(leads, function(l){ return inMon(l.created, pm); }) };

    var tens = JDB.readAll(SHEETS.TENANCIES).filter(function(t){ return !t.deleted && (all || (pMap[t.propertyId] || {}).assignedAgent === me); }); // scope rides the listing
    var active = tens.filter(function(t){ return t.status === 'Active'; });
    stats.totalLeads = leads.length;
    stats.activeTenancies = active.length;
    stats.rentArrears = sum(active, function(t){ return Math.max(0, r2_(tenMonths_(t) * t.monthlyRent - tenCollected_(t))); });
    stats.balanceDue = sum(deals.filter(function(x){ return x.status === 'Token' || x.status === 'Agreement'; }),
      function(x){ return Math.max(0, r2_((x.dealAmount || 0) - (x.payments || []).reduce(function(s, q){ return s + (q.amount || 0); }, 0))); });

    var t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), sIdx = {}, series = []; // leads/day, last 90 — client slices 7/30/90
    for (var i = 89; i >= 0; i--) { var dt = new Date(t0.getTime()); dt.setDate(dt.getDate() - i); var dk = ymd_(dt); sIdx[dk] = series.length; series.push({ d: dk, n: 0 }); }
    leads.forEach(function(l){ if (!l.created) return; var j = sIdx[ymd_(l.created)]; if (j !== undefined) series[j].n++; });
    stats.leadsSeries = series;

    stats.upcomingViewings = appts.filter(function(a){ return ['Scheduled','Confirmed'].indexOf(a.status) !== -1 && a.scheduledAt && new Date(a.scheduledAt) >= now; })
      .sort(function(x, y){ return new Date(x.scheduledAt) - new Date(y.scheduledAt); }).slice(0, 4)
      .map(function(a){ var p = pMap[a.propertyId], l = lMap[a.leadId];
        return { id: a.id, when: a.scheduledAt, status: a.status, title: p ? p.title : 'Property #' + a.propertyId,
          address: addrOf(p), image: imgOf(p), lead: l ? l.fullName : '', agent: a.agent }; });

    stats.recentProperties = props.slice(-4).reverse().map(function(p){
      return { id: p.id, title: p.title, address: addrOf(p), price: p.price, listingType: p.listingType, rentFrequency: p.rentFrequency,
        status: p.status, image: imgOf(p), created: p.created, referenceCode: p.referenceCode }; });

    var order = ['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won']; // cumulative — all enter at New, Lost drops out
    stats.funnelSteps = order.map(function(s, k){ return { stage: s, count: k === 0 ? leads.length : count(leads, function(l){ return order.indexOf(l.status) >= k; }) }; });
    stats.conversionRate = leads.length ? Math.round(stats.wonLeads / leads.length * 1000) / 10 : 0;

    return ok_({ data: stats });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== File Upload Functions ==============

// Get or create ASSETS folder
function getAssetsFolder() {
  try {
    var it = DriveApp.getFoldersByName(ASSETS_FOLDER_NAME);
    if (it.hasNext()) return it.next();
    var f = DriveApp.createFolder(ASSETS_FOLDER_NAME);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return f;
  } catch (e) { Logger.log('Error getting ASSETS folder: ' + e); return null; }
}

// Agency Branding
function getAgencyBranding() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('AGENCY_BRANDING');
    var b = raw ? JSON.parse(raw) : {"name":"RS Estates","logo":"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg","phone":"0901 234 567","address":"Hà Nội & TP. Hồ Chí Minh, Việt Nam","slogan":"Nền tảng bất động sản cao cấp hàng đầu"};
    return ok_({ branding: b });
  } catch(e) { return ok_({ branding: {"name":"RS Estates","logo":"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiGXxCe0WNNedmFqSWeF761f7Kshhc-NP5ChRQKz9fr97cO8VaarvD0KlCwqHojJVBWv-RAxfOqMI5rD4H78KnARyOc6QgwL1nRRFWf5xNQ1d9F9HfAoLPPGlTyP0GwNl4n-INMEsWLQ4Y7zJtz5bOdAnc2ePH9-uCRgshlo6BsS6gJEz6fhrxL-5U5O3sX/s160/channels4_profile.jpg","phone":"0901 234 567","address":"Hà Nội & TP. Hồ Chí Minh, Việt Nam","slogan":"Nền tảng bất động sản cao cấp hàng đầu"} }); }
}
function saveAgencyBranding(branding, username) {
  try {
    if (userRole_(username) !== 'Admin') return err_('Access denied');
    PropertiesService.getScriptProperties().setProperty('AGENCY_BRANDING', JSON.stringify(branding || {}));
    addLog_(username, 'Agency Branding Updated', 'Updated branding: ' + (branding && branding.name));
    return ok_({ message: 'Đã lưu nhận diện thương hiệu thành công!', branding: branding });
  } catch(e) { return err_('Error: ' + e); }
}

// Upload profile image
function uploadProfileImage(base64Data, filename, username) {
  try {
    if (!userRole_(username)) return err_('Access denied'); // signed-in staff only — never anonymous file hosting
    if (String(base64Data || '').length > 8000000) return err_('Image too large (max ~5MB)');
    var folder = getAssetsFolder();
    if (!folder) return err_('Failed to create ASSETS folder');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data.split(',')[1] || base64Data), 'image/jpeg', filename);
    var file = folder.createFile(blob);
    file.setName(username + '_' + new Date().getTime() + '_' + filename).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    addLog_(username, 'Profile Image Uploaded', 'Uploaded profile image: ' + file.getName());
    return ok_({ fileId: file.getId(), fileUrl: 'https://lh3.google.com/u/0/d/' + file.getId(), fileName: file.getName() });
  } catch (e) { return err_('Upload error: ' + e); }
}

// Update user settings (profile image, theme, colors)
function updateUserSettings(username, settings) {
  try {
    var u = userRows_(), i = findRow_(u.data, U.NAME, username);
    if (i === -1) return err_('User not found');
    var row = i + 1, put = function(col, val){ if (val !== undefined) u.sh.getRange(row, col + 1).setValue(val); };
    put(U.IMG, settings.profileImage); put(U.THEME, settings.themeMode); put(U.COLORS, settings.customColors);
    u.sh.getRange(row, U.UPDATED + 1, 1, 2).setValues([[nowIso_(), username]]);
    addLog_(username, 'Settings Updated', 'Updated user settings');
    return ok_({ message:'Settings updated successfully!' });
  } catch (e) { return err_('Error: ' + e); }
}

// Get user settings
function getUserSettings(username) {
  try {
    var d = userRows_().data, i = findRow_(d, U.NAME, username);
    if (i === -1) return err_('User not found');
    var r = d[i];
    return ok_({ settings: { profileImage:r[U.IMG] || '', themeMode:r[U.THEME] || 'light', customColors:r[U.COLORS] || '' } });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== App Default Theme (global, all users / first load) ==============
// stored in ScriptProperties: DEFAULT_THEME_ID + DEFAULT_THEME_VARS (resolved css-var json)
function getDefaultTheme() {
  try {
    var p = PropertiesService.getScriptProperties();
    return { success: true, id: p.getProperty('DEFAULT_THEME_ID') || '', vars: p.getProperty('DEFAULT_THEME_VARS') || '' };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

// admin-only: set the theme every visitor gets on first load
function setDefaultTheme(themeId, varsJson, username) {
  try {
    if (userRole_(username) !== 'Admin') return { success: false, message: 'Not authorized' };
    var p = PropertiesService.getScriptProperties();
    p.setProperty('DEFAULT_THEME_ID', String(themeId || ''));
    p.setProperty('DEFAULT_THEME_VARS', String(varsJson || ''));
    addLog_(username, 'Default Theme Set', 'App default theme → ' + themeId);
    return { success: true, message: 'Default theme saved for all users!' };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

// ============== App Config (money defaults — one Script Properties JSON) ==============
// commissionPctRent 100 = one month's rent; renewalIncrementPct = yearly bump default; roundRobin = auto-assign web leads
var CFG_DEFAULTS = { commissionPctSale: 1, commissionPctRent: 100, agentSharePct: 40, renewalIncrementPct: 10, roundRobin: 0 };
function appCfg_() {
  var cfg = {}; try { cfg = JSON.parse(PropertiesService.getScriptProperties().getProperty('APP_CFG') || '{}'); } catch (e) {}
  return Object.assign({}, CFG_DEFAULTS, cfg);
}
function getAppConfig(callerUser) {
  if (!userRole_(callerUser)) return err_('Access denied');
  return ok_({ cfg: appCfg_() });
}
function setAppConfig(cfg, currentUser) {
  if (userRole_(currentUser) !== 'Admin') return err_('Access denied');
  var cur = appCfg_(), clean = {};
  Object.keys(CFG_DEFAULTS).forEach(function(k){ var v = parseFloat(cfg && cfg[k]); clean[k] = isNaN(v) ? cur[k] : v; });
  PropertiesService.getScriptProperties().setProperty('APP_CFG', JSON.stringify(clean));
  addLog_(currentUser, 'App Config Updated', JSON.stringify(clean));
  return ok_({ message: 'Config saved!', cfg: clean });
}

// ============== Helper Functions ==============

// Add log entry (json-row sheet) — `changes` = [{f,a,b}] field-level before→after, empty for non-edits
function addLog_(user, action, details, changes) {
  try { JDB.insert(SHEETS.LOGS, { user: user, action: action, details: details, changes: changes || [] }); }
  catch (e) { Logger.log('Error adding log: ' + e); }
}

// ============== Field-level change history (before → after, only what actually moved) ==============
var MONEY_F_ = { price:1, dealAmount:1, commissionAmt:1, agentShareAmt:1, tokenAmount:1, monthlyRent:1,
                 securityDeposit:1, budgetMin:1, budgetMax:1, depositRefund:1, MonthlyTarget:1 };
var diffVal_ = function(f, v) {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length + ' item' + (v.length === 1 ? '' : 's');
  if (MONEY_F_[f]) return docMoney_(v);
  if (typeof v === 'object') return String(JSON.stringify(v)).substr(0, 60);
  return String(v);
};
var sameVal_ = function(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a || []) === JSON.stringify(b || []);
  var ea = (a === null || a === undefined || a === ''), eb = (b === null || b === undefined || b === '');
  if (ea || eb) return ea && eb;
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return String(a) === String(b);
};
// spec: { field:'Label' } — only fields present in the patch AND actually different come back
var diffFields_ = function(before, after, spec) {
  var out = [];
  Object.keys(spec).forEach(function(f) {
    if (!(f in after) || sameVal_((before || {})[f], after[f])) return;
    out.push({ f: spec[f], a: diffVal_(f, (before || {})[f]), b: diffVal_(f, after[f]) });
  });
  return out;
};
var diffText_ = function(ch){ return ch.length ? ch.map(function(c){ return c.f + ': ' + c.a + ' → ' + c.b; }).join(' · ') : 'no field changes'; };
var FIELD_LABELS = {
  property: { title:'Title', description:'Description', propertyType:'Type', listingType:'Listing', price:'Price',
    rentFrequency:'Rent Frequency', areaSize:'Area Size', areaUnit:'Area Unit', bedrooms:'Bedrooms', bathrooms:'Bathrooms',
    locationId:'Location', address:'Address', ownerName:'Owner', ownerPhone:'Owner Phone', ownerId:'Owner Record',
    isFeatured:'Featured', status:'Status', assignedAgent:'Agent', images:'Photos', amenityIds:'Amenities' },
  lead: { fullName:'Name', phone:'Phone', email:'Email', source:'Source', interestType:'Interest', status:'Status',
    assignedAgent:'Agent', budgetMin:'Budget Min', budgetMax:'Budget Max', propertyId:'Property',
    preferredLocationId:'Preferred Location', lostReason:'Lost Reason', message:'Message' },
  deal: { dealType:'Type', propertyId:'Property', leadId:'Lead', buyerName:'Buyer', buyerPhone:'Buyer Phone',
    dealAmount:'Deal Amount', commissionPct:'Commission %', commissionAmt:'Commission', agentSharePct:'Agent Share %',
    agentShareAmt:'Agent Share', tokenAmount:'Token', status:'Status', agent:'Agent', closedAt:'Closed On',
    cancellationReason:'Cancellation Reason', payments:'Payments', agentPaidAt:'Agent Paid' },
  appointment: { leadId:'Lead', propertyId:'Property', agent:'Agent', scheduledAt:'Scheduled', durationMinutes:'Duration',
    status:'Status', notes:'Notes', cancellationReason:'Cancellation Reason', feedback:'Feedback' },
  followup: { leadId:'Lead', type:'Type', dueAt:'Due', status:'Status', notes:'Notes', assignedAgent:'Agent' }
};

// ============== Duplicate property detection (same flat listed twice = commission dispute) ==============
var normTxt_ = function(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
var digits_  = function(s){ return String(s || '').replace(/\D/g, ''); };
// every signal requires the same location, so callers can safely bucket by locationId first
var dupSignals_ = function(a, b) {
  var sc = 0, why = [];
  var pa = digits_(a.ownerPhone);
  if (pa.length >= 9 && pa === digits_(b.ownerPhone)) { sc += 3; why.push('same owner phone'); }
  var ad = normTxt_(a.address);
  if (ad && ad === normTxt_(b.address)) { sc += 3; why.push('identical address'); }
  var ti = normTxt_(a.title);
  if (ti && ti === normTxt_(b.title)) { sc += 2; why.push('identical title'); }
  if (a.propertyType === b.propertyType && a.listingType === b.listingType && a.areaSize && b.areaSize
      && Math.abs(a.areaSize - b.areaSize) <= a.areaSize * 0.02 && String(a.bedrooms) === String(b.bedrooms)) {
    sc += 2; why.push('same type, size and bedrooms'); // alone this is 2 — a block of identical flats must NOT flag
  }
  return { score: sc, why: why };
};
var propDupes_ = function(cand, all, excludeId) {
  if (!cand.locationId) return [];
  // excludeId == null -> compare against everything (import rows have no id yet; `undefined != null` is false, which would skip them)
  return all.filter(function(p){ return !p.deleted && (excludeId == null || p.id != excludeId) && p.locationId == cand.locationId; })
    .map(function(p) { var s = dupSignals_(cand, p);
      return s.score >= 3 ? { id: p.id, referenceCode: p.referenceCode || (p.id ? '#' + p.id : 'another row in this file'), title: p.title || '',
        status: p.status || '', assignedAgent: p.assignedAgent || '', score: s.score, reasons: s.why } : null; })
    .filter(Boolean).sort(function(x, y){ return y.score - x.score; });
};

// duplicate clusters across the whole book — drives the Reports "Possible Duplicates" tab
function getPropertyDuplicates(callerUser) {
  try {
    if (!gate_(callerUser, 'properties', 'v')) return err_('Access denied');
    var all = JDB.readAll(SHEETS.PROPERTIES).filter(function(p){ return !p.deleted; });
    var seen = {}, out = [];
    all.forEach(function(p) {
      propDupes_(p, all, p.id).forEach(function(m) {
        var k = Math.min(p.id, m.id) + ':' + Math.max(p.id, m.id);
        if (seen[k]) return; // A-vs-B and B-vs-A are one finding
        seen[k] = 1;
        out.push({ aRef: p.referenceCode || ('#' + p.id), aTitle: p.title || '', aAgent: p.assignedAgent || '', aStatus: p.status || '',
          bRef: m.referenceCode, bTitle: m.title, bAgent: m.assignedAgent, bStatus: m.status,
          score: m.score, why: m.reasons.join(', '),
          crossAgent: (p.assignedAgent || '') !== (m.assignedAgent || '') ? 'Yes' : 'No' });
      });
    });
    return ok_({ data: out.sort(function(x, y){ return (y.crossAgent === 'Yes') - (x.crossAgent === 'Yes') || y.score - x.score; }) });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== RBAC Backend ==============

// create + seed Roles sheet if missing (idempotent / self-healing)
function ensureRbac_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ROLES_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ROLES_SHEET);
    sh.appendRow(['role_key','label','color','sort_order','is_super','hidden_signup','permissions']);
    sh.getRange(1, 1, 1, 7).setBackground('#001f3f').setFontColor('white').setFontWeight('bold');
    RBAC_ROLE_DEFS.forEach(function(r, i){
      sh.appendRow([r.key, r.label, r.color, i, r.is_super, r.hidden_signup, JSON.stringify(rbacDefaultPerms_(r.key))]);
    });
  }
  return sh;
}

function readRoles_() {
  var data = ensureRbac_().getDataRange().getValues(), out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[ROLE_C.KEY]) continue;
    var perms = {}; try { perms = JSON.parse(r[ROLE_C.PERMS] || '{}'); } catch (e) {}
    var defs = rbacDefaultPerms_(r[ROLE_C.KEY]); // self-heal: pages added after this row was stored get their defaults
    Object.keys(defs).forEach(function(k){ if (!perms[k]) perms[k] = defs[k]; });
    out.push({ key:r[ROLE_C.KEY], label:r[ROLE_C.LABEL], color:r[ROLE_C.COLOR], sort:Number(r[ROLE_C.SORT])||0,
               is_super:Number(r[ROLE_C.SUPER])?1:0, hidden_signup:Number(r[ROLE_C.HIDDEN])?1:0, perms:perms });
  }
  out.sort(function(a,b){ return a.sort - b.sort; });
  return out;
}
function roleByKey_(key){ var a = readRoles_(); for (var i=0;i<a.length;i++) if (a[i].key===key) return a[i]; return null; }
function canEditRbac_(role){ return RBAC_EDIT_ROLES.indexOf(role) !== -1; }
function rbacPermsFor_(role){ var r = roleByKey_(role); return r ? r.perms : rbacDefaultPerms_(role); }
function hasPerm_(role, page, perm){ var r = roleByKey_(role); return !!(r && r.perms && r.perms[page] && r.perms[page][perm || 'v']); }

// derive role from username server-side — don't trust a client-passed role
function userRole_(username) {
  var s = sh_(USERS_SHEET); if (!s) return null;
  var d = s.getDataRange().getValues(), i = findRow_(d, U.NAME, username);
  return i === -1 ? null : d[i][U.ROLE];
}
function gate_(username, page, perm) { return hasPerm_(userRole_(username), page, perm); }

// caller's own perms — refresh menus on restored sessions
function getMyPermissions(callerUser) {
  var role = userRole_(callerUser);
  return { success:true, perms: rbacPermsFor_(role), canEdit: canEditRbac_(role) };
}

// full matrix for the editor page (gated)
function getRbacMatrix(callerUser) {
  if (!canEditRbac_(userRole_(callerUser))) return { success:false, message:'Access denied' };
  var roles = readRoles_(), perms = {};
  roles.forEach(function(r){ perms[r.key] = r.perms; });
  return { success:true, pages:RBAC_PAGES,
    roles: roles.map(function(r){ return { key:r.key, label:r.label, color:r.color, is_super:r.is_super }; }),
    perms: perms };
}

// toggle one cell (v/a/e/d) — implied-view logic + owner-row lock
function toggleRbac(roleKey, pageKey, perm, value, callerUser) {
  if (!canEditRbac_(userRole_(callerUser))) return { success:false, message:'Access denied' };
  if (['v','a','e','d'].indexOf(perm) === -1) return { success:false, message:'Bad permission' };
  var sh = ensureRbac_(), data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][ROLE_C.KEY] === roleKey) {
      if (Number(data[i][ROLE_C.SUPER]) === 1) return { success:false, message:'Admin (owner) permissions are locked' };
      var p = {}; try { p = JSON.parse(data[i][ROLE_C.PERMS] || '{}'); } catch (e) {}
      if (!p[pageKey]) p[pageKey] = { v:0, a:0, e:0, d:0 };
      p[pageKey][perm] = value ? 1 : 0;
      if (perm === 'v' && !value) { p[pageKey].a = 0; p[pageKey].e = 0; p[pageKey].d = 0; }
      if (perm !== 'v' && value) p[pageKey].v = 1;
      sh.getRange(i + 1, ROLE_C.PERMS + 1).setValue(JSON.stringify(p));
      addLog_(callerUser, 'Permissions Updated', roleKey + ' · ' + pageKey + ' · ' + perm + '=' + (value ? 1 : 0));
      return { success:true, message:'Saved' };
    }
  }
  return { success:false, message:'Role not found' };
}

// activity logs for the viewer (gated) — last 60 days via date-keyed readRange
function getLogs(callerUser) {
  if (!gate_(callerUser, 'logs', 'v')) return err_('Access denied');
  return ok_({ data: JDB.readRange(SHEETS.LOGS, ymd_(new Date(Date.now() - 60 * 864e5).toISOString()))
    .filter(function(x){ return !x.deleted; })
    .map(function(x){ return { Timestamp: x.created, User: x.user, Action: x.action, Details: x.details, Changes: x.changes || [] }; })
    .reverse() }); // newest first
}

// ============== Lookups (form dropdown data — any signed-in user) ==============
var toIso_ = function(v){ if (!v) return null; var d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); };
var pick_ = function(d, keys){ var o = {}; keys.forEach(function(k){ if (d[k] !== undefined) o[k] = d[k]; }); return o; };

function getLookups(callerUser) {
  try {
    var role = userRole_(callerUser);
    if (!role) return err_('Access denied');
    var agents = userRows_().data.slice(1).filter(function(r){ return r[U.STATUS] === 'Active'; })
      .map(function(r){ return { username: r[U.NAME], role: r[U.ROLE] }; });
    return ok_({
      locations: JDB.readAll(SHEETS.LOCATIONS).filter(function(x){ return !x.deleted; })
        .map(function(x){ return { id:x.id, parentId:x.parentId || null, name:x.name, level:x.level }; }),
      amenities: JDB.readAll(SHEETS.AMENITIES).filter(function(x){ return !x.deleted; })
        .map(function(x){ return { id:x.id, name:x.name, icon:x.icon || '' }; }),
      agents: scopeAll_(role) ? agents : agents.filter(function(a){ return a.username === callerUser; }), // agents never browse staff
      enums: ENUMS
    });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Locations (City → Area → Society) ==============
function getLocations(callerUser) {
  try {
    if (!gate_(callerUser, 'locations', 'v')) return err_('Access denied');
    var locs = JDB.readAll(SHEETS.LOCATIONS).filter(function(x){ return !x.deleted; });
    var path = locPath_(locs), usage = {};
    JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ if (!p.deleted) usage[p.locationId] = (usage[p.locationId] || 0) + 1; });
    return ok_({ data: locs.map(function(l){
      return Object.assign({}, l, { path: path(l.id), propertyCount: usage[l.id] || 0 });
    }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

// hierarchy guard: City=no parent, Area under City, Society under Area
var locParentOk_ = function(level, parent) {
  if (level === 'City') return !parent ? '' : 'A City cannot have a parent';
  if (level === 'Area') return parent && parent.level === 'City' ? '' : 'An Area must sit under a City';
  return parent && parent.level === 'Area' ? '' : 'A Society must sit under an Area';
};

function addLocation(d, currentUser) {
  try {
    if (!gate_(currentUser, 'locations', 'a')) return err_('Access denied');
    var name = String(d.name || '').trim();
    if (!name || !inEnum_('locationLevel', d.level)) return err_('Name and level are required');
    var locs = JDB.readAll(SHEETS.LOCATIONS).filter(function(x){ return !x.deleted; });
    var parent = d.parentId ? locs.filter(function(l){ return l.id == d.parentId; })[0] : null;
    var bad = locParentOk_(d.level, parent);
    if (bad) return err_(bad);
    if (locs.some(function(l){ return (l.parentId || null) == (parent ? parent.id : null) && l.name.toLowerCase() === name.toLowerCase(); }))
      return err_('This location already exists here');
    var rec = JDB.insert(SHEETS.LOCATIONS, { name: name, level: d.level, parentId: parent ? parent.id : null,
      slug: uniqueSlug_(SHEETS.LOCATIONS, (parent ? parent.slug + '-' : '') + slug_(name)) });
    addLog_(currentUser, 'Location Added', d.level + ': ' + name);
    return ok_({ message: 'Location added!', id: rec.id });
  } catch (e) { return err_('Error: ' + e); }
}

function updateLocation(d, currentUser) {
  try {
    if (!gate_(currentUser, 'locations', 'e')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.LOCATIONS, d.id);
    if (!cur || cur.deleted) return err_('Location not found');
    var name = String(d.name || '').trim();
    if (!name) return err_('Name is required');
    JDB.update(SHEETS.LOCATIONS, d.id, { name: name }); // slug/level/parent stay — live public URLs
    addLog_(currentUser, 'Location Updated', cur.level + ' #' + d.id + ' → ' + name);
    return ok_({ message: 'Location updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteLocation(id, currentUser) {
  try {
    if (!gate_(currentUser, 'locations', 'd')) return err_('Access denied');
    var locs = JDB.readAll(SHEETS.LOCATIONS).filter(function(x){ return !x.deleted; });
    if (locs.some(function(l){ return l.parentId == id; })) return err_('Delete or move child locations first');
    if (JDB.readAll(SHEETS.PROPERTIES).some(function(p){ return !p.deleted && p.locationId == id; }))
      return err_('Location has properties — move them first');
    JDB.remove(SHEETS.LOCATIONS, id);
    addLog_(currentUser, 'Location Deleted', '#' + id);
    return ok_({ message: 'Location deleted!' });
  } catch (e) { return err_('Error: ' + e); }
}

function bulkImportLocations(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'locations', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var live = JDB.readAll(SHEETS.LOCATIONS).filter(function(x){ return !x.deleted; });
    var out = [], errors = [];
    var findByName = function(n) { // sheet first, then batch (parents can arrive in the same csv)
      n = String(n || '').trim().toLowerCase();
      return live.filter(function(l){ return l.name.toLowerCase() === n; })[0] ||
             out.filter(function(l){ return l.name.toLowerCase() === n; })[0] || null;
    };
    rows.forEach(function(r, i) {
      var name = String(r.Name || '').trim(), level = String(r.Level || '').trim();
      if (!name || !inEnum_('locationLevel', level)) { errors.push('Row ' + (i + 1) + ': Name/Level invalid'); return; }
      var parent = r.Parent ? findByName(r.Parent) : null;
      if (r.Parent && !parent) { errors.push('Row ' + (i + 1) + ': parent "' + r.Parent + '" not found'); return; }
      var bad = locParentOk_(level, parent);
      if (bad) { errors.push('Row ' + (i + 1) + ': ' + bad); return; }
      var dup = live.concat(out).some(function(l){ return l.level === level && l.name.toLowerCase() === name.toLowerCase(); });
      if (dup) { errors.push('Row ' + (i + 1) + ': duplicate ' + name); return; }
      out.push({ name: name, level: level, parentId: parent && parent.id ? parent.id : null,
        _p: parent && !parent.id ? parent : null, // in-batch parent — id resolved inside the insert lock
        slug: uniqueSlug_(SHEETS.LOCATIONS, (parent ? parent.slug + '-' : '') + slug_(name)) });
    });
    jdbBulkInsert_(SHEETS.LOCATIONS, out, function(r) { if (r._p) { r.parentId = r._p.id; delete r._p; } });
    addLog_(currentUser, 'Bulk Import', 'Locations: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Amenities (Admin-only taxonomy) ==============
function getAmenities(callerUser) {
  try {
    if (!gate_(callerUser, 'amenities', 'v')) return err_('Access denied');
    var usage = {};
    JDB.readAll(SHEETS.PROPERTIES).forEach(function(p) {
      if (!p.deleted) (p.amenityIds || []).forEach(function(id){ usage[id] = (usage[id] || 0) + 1; });
    });
    return ok_({ data: JDB.readAll(SHEETS.AMENITIES).filter(function(x){ return !x.deleted; })
      .map(function(a){ return Object.assign({}, a, { propertyCount: usage[a.id] || 0 }); }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

function addAmenity(d, currentUser) {
  try {
    if (!gate_(currentUser, 'amenities', 'a')) return err_('Access denied');
    var name = String(d.name || '').trim();
    if (!name) return err_('Name is required');
    if (JDB.readAll(SHEETS.AMENITIES).some(function(a){ return !a.deleted && a.name.toLowerCase() === name.toLowerCase(); }))
      return err_('Amenity already exists'); // one taxonomy, no near-duplicates
    var rec = JDB.insert(SHEETS.AMENITIES, { name: name, icon: String(d.icon || '').trim() });
    addLog_(currentUser, 'Amenity Added', name);
    return ok_({ message: 'Amenity added!', id: rec.id });
  } catch (e) { return err_('Error: ' + e); }
}

function updateAmenity(d, currentUser) {
  try {
    if (!gate_(currentUser, 'amenities', 'e')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.AMENITIES, d.id);
    if (!cur || cur.deleted) return err_('Amenity not found');
    var name = String(d.name || '').trim();
    if (!name) return err_('Name is required');
    if (JDB.readAll(SHEETS.AMENITIES).some(function(a){ return !a.deleted && a.id != d.id && a.name.toLowerCase() === name.toLowerCase(); }))
      return err_('Another amenity already has this name');
    JDB.update(SHEETS.AMENITIES, d.id, { name: name, icon: String(d.icon || '').trim() });
    addLog_(currentUser, 'Amenity Updated', '#' + d.id + ' ' + name);
    return ok_({ message: 'Amenity updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteAmenity(id, currentUser) {
  try {
    if (!gate_(currentUser, 'amenities', 'd')) return err_('Access denied');
    JDB.remove(SHEETS.AMENITIES, id); // readers resolve against active list — stale tags just drop off
    addLog_(currentUser, 'Amenity Deleted', '#' + id);
    return ok_({ message: 'Amenity deleted!' });
  } catch (e) { return err_('Error: ' + e); }
}

function bulkImportAmenities(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'amenities', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var existing = JDB.readAll(SHEETS.AMENITIES).filter(function(a){ return !a.deleted; })
      .map(function(a){ return a.name.toLowerCase(); });
    var out = [], errors = [];
    rows.forEach(function(r, i) {
      var name = String(r.Name || '').trim();
      if (!name) { errors.push('Row ' + (i + 1) + ': missing Name'); return; }
      if (existing.indexOf(name.toLowerCase()) !== -1) { errors.push('Row ' + (i + 1) + ': duplicate ' + name); return; }
      existing.push(name.toLowerCase());
      out.push({ name: name, icon: String(r.Icon || '').trim() });
    });
    jdbBulkInsert_(SHEETS.AMENITIES, out);
    addLog_(currentUser, 'Bulk Import', 'Amenities: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Properties (inventory core) ==============
// sanitize form payload -> patch; returns error string on bad input
function propPatch_(d) {
  var p = {
    title: String(d.title || '').trim(),
    description: String(d.description || ''),
    propertyType: d.propertyType, listingType: d.listingType,
    price: parseFloat(d.price) || 0,
    rentFrequency: d.listingType === 'Rent' ? (inEnum_('rentFrequency', d.rentFrequency) ? d.rentFrequency : 'Monthly') : '',
    areaSize: parseFloat(d.areaSize) || 0,
    areaUnit: d.areaUnit,
    bedrooms: d.bedrooms === '' || d.bedrooms == null ? null : parseInt(d.bedrooms, 10),
    bathrooms: d.bathrooms === '' || d.bathrooms == null ? null : parseInt(d.bathrooms, 10),
    locationId: parseInt(d.locationId, 10) || 0,
    address: String(d.address || '').trim(),
    latitude: d.latitude === '' || d.latitude == null ? null : parseFloat(d.latitude),
    longitude: d.longitude === '' || d.longitude == null ? null : parseFloat(d.longitude),
    ownerName: String(d.ownerName || '').trim(),   // never public
    ownerPhone: String(d.ownerPhone || '').trim(), // never public
    ownerId: parseInt(d.ownerId, 10) || null,      // Owners registry link — optional, free-text stays for back-compat
    isFeatured: d.isFeatured ? 1 : 0,
    images: Array.isArray(d.images) ? d.images.slice(0, 15) : [],
    amenityIds: Array.isArray(d.amenityIds) ? d.amenityIds.map(function(x){ return parseInt(x, 10); }).filter(Boolean) : []
  };
  if (!p.title) return 'Title is required';
  if (!inEnum_('propertyType', p.propertyType)) return 'Invalid property type';
  if (!inEnum_('listingType', p.listingType)) return 'Invalid listing type';
  if (!(p.price > 0)) return 'Price is required';
  if (!(p.areaSize > 0) || !inEnum_('areaUnit', p.areaUnit)) return 'Area size and unit are required';
  if (!p.locationId) return 'Location is required';
  if (!p.ownerName || !p.ownerPhone) return 'Owner name and phone are required';
  return p;
}

function getProperties(callerUser) {
  try {
    if (!gate_(callerUser, 'properties', 'v')) return err_('Access denied'); // agents read ALL — matching buyers needs full inventory
    var locs = JDB.readAll(SHEETS.LOCATIONS), path = locPath_(locs);
    return ok_({ data: JDB.readAll(SHEETS.PROPERTIES).filter(function(p){ return !p.deleted; })
      .map(function(p){ return Object.assign({}, p, { locationPath: path(p.locationId) }); }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

function addProperty(d, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'a')) return err_('Access denied');
    var role = userRole_(currentUser), p = propPatch_(d);
    if (typeof p === 'string') return err_(p);
    p.status = 'Draft'; p.viewsCount = 0; p.publishedAt = null; // goes live on first status move out of Draft
    p.assignedAgent = scopeAll_(role) && d.assignedAgent ? d.assignedAgent : currentUser; // agents never assign others
    if (p.assignedAgent !== currentUser && !userRole_(p.assignedAgent)) return err_('Unknown agent');
    p.createdBy = currentUser;
    var dupes = propDupes_(p, JDB.readAll(SHEETS.PROPERTIES), null); // same flat twice = commission dispute later
    if (dupes.length && !d.confirmDupe) return err_('This looks like an existing listing', { dupes: dupes });
    var locs = JDB.readAll(SHEETS.LOCATIONS), city = rootCity_(locs, p.locationId);
    jdbBulkInsert_(SHEETS.PROPERTIES, [p], function(r) { // id-derived fields set inside the lock
      r.referenceCode = 'RS-' + city + '-' + (1000 + r.id);
      r.slug = uniqueSlug_(SHEETS.PROPERTIES, slug_(r.title) + '-' + r.id);
    });
    addLog_(currentUser, 'Property Added', p.referenceCode + ' ' + p.title);
    if (dupes.length) addLog_(currentUser, 'Duplicate Override', p.referenceCode + ' added despite matching ' + // override is on the record
      dupes.map(function(x){ return x.referenceCode; }).join(', '), dupes.map(function(x){ return { f: x.referenceCode, a: 'flagged', b: x.reasons.join(', ') }; }));
    return ok_({ message: 'Property added as Draft — publish it when ready!', id: p.id });
  } catch (e) { return err_('Error: ' + e); }
}

function updateProperty(d, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.PROPERTIES, d.id);
    if (!cur || cur.deleted) return err_('Property not found');
    if (!scopeAll_(role) && cur.assignedAgent !== currentUser) return err_('You can only edit your own listings');
    var p = propPatch_(d);
    if (typeof p === 'string') return err_(p);
    var upDupes = propDupes_(p, JDB.readAll(SHEETS.PROPERTIES), d.id);
    if (upDupes.length && !d.confirmDupe) return err_('This looks like an existing listing', { dupes: upDupes });
    if (scopeAll_(role) && d.assignedAgent) p.assignedAgent = d.assignedAgent;
    var st = d.status && inEnum_('propertyStatus', d.status) ? d.status : cur.status;
    if (st !== cur.status) {
      if ((st === 'Sold' || st === 'Rented') && !scopeAll_(role))
        return err_('Only Manager/Admin can close inventory — raise it through the lead pipeline');
      p.status = st;
      if (st !== 'Draft' && !cur.publishedAt) p.publishedAt = nowIso_(); // first go-live stamp
    }
    if (r2_(p.price) !== r2_(cur.price)) // price moved -> immutable history line, server-stamped
      p.priceHistory = (cur.priceHistory || []).concat([{ date: nowIso_(), oldPrice: cur.price, newPrice: p.price, changedBy: currentUser }]);
    JDB.update(SHEETS.PROPERTIES, d.id, p);
    var chP = diffFields_(cur, p, FIELD_LABELS.property);
    addLog_(currentUser, 'Property Updated', (cur.referenceCode || '#' + d.id) + ' — ' + diffText_(chP), chP);
    return ok_({ message: 'Property updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteProperty(id, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'd')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.PROPERTIES, id);
    if (!cur || cur.deleted) return err_('Property not found');
    JDB.remove(SHEETS.PROPERTIES, id);
    addLog_(currentUser, 'Property Deleted', cur.referenceCode || '#' + id);
    return ok_({ message: 'Property deleted!' });
  } catch (e) { return err_('Error: ' + e); }
}

function uploadPropertyImage(base64Data, filename, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'a') && !gate_(currentUser, 'properties', 'e')) return err_('Access denied');
    var folder = getAssetsFolder();
    if (!folder) return err_('Failed to open ASSETS folder');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data.split(',')[1] || base64Data), 'image/jpeg', filename);
    var file = folder.createFile(blob);
    file.setName('prop_' + new Date().getTime() + '_' + filename).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return ok_({ url: 'https://lh3.google.com/u/0/d/' + file.getId(), fileId: file.getId() });
  } catch (e) { return err_('Upload error: ' + e); }
}

function bulkImportProperties(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var role = userRole_(currentUser);
    var locs = JDB.readAll(SHEETS.LOCATIONS).filter(function(x){ return !x.deleted; });
    var users = {}; userRows_().data.slice(1).forEach(function(r){ if (r[U.STATUS] === 'Active') users[r[U.NAME]] = 1; });
    var out = [], errors = [], existing = JDB.readAll(SHEETS.PROPERTIES); // dedupe against the sheet AND within this batch
    rows.forEach(function(r, i) {
      var d = { title: r.Title, propertyType: r.PropertyType, listingType: r.ListingType, price: r.Price,
        rentFrequency: r.RentFrequency, areaSize: r.AreaSize, areaUnit: r.AreaUnit, bedrooms: r.Bedrooms, bathrooms: r.Bathrooms,
        address: r.Address, ownerName: r.OwnerName, ownerPhone: r.OwnerPhone };
      var loc = locs.filter(function(l){ return l.name.toLowerCase() === String(r.Location || '').trim().toLowerCase(); })[0];
      if (!loc) { errors.push('Row ' + (i + 1) + ': location "' + (r.Location || '') + '" not found'); return; }
      d.locationId = loc.id;
      var p = propPatch_(d);
      if (typeof p === 'string') { errors.push('Row ' + (i + 1) + ': ' + p); return; }
      var dup = propDupes_(p, existing.concat(out), null)[0];
      if (dup) { errors.push('Row ' + (i + 1) + ': duplicate of ' + dup.referenceCode + ' (' + dup.reasons.join(', ') + ')'); return; }
      p.status = 'Draft'; p.viewsCount = 0; p.publishedAt = null; p.createdBy = currentUser;
      p.assignedAgent = scopeAll_(role) && r.AssignedAgent && users[r.AssignedAgent] ? r.AssignedAgent : currentUser;
      out.push(p);
    });
    jdbBulkInsert_(SHEETS.PROPERTIES, out, function(p) { // ids exist here — inside the lock
      p.referenceCode = 'RS-' + rootCity_(locs, p.locationId) + '-' + (1000 + p.id);
      p.slug = uniqueSlug_(SHEETS.PROPERTIES, slug_(p.title) + '-' + p.id);
    });
    addLog_(currentUser, 'Bulk Import', 'Properties: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Leads (pipeline core — Agent reads are HARD own-scoped) ==============
function getLeads(callerUser) {
  try {
    if (!gate_(callerUser, 'leads', 'v')) return err_('Access denied');
    var role = userRole_(callerUser);
    var props = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ props[p.id] = p; });
    var locs = JDB.readAll(SHEETS.LOCATIONS), path = locPath_(locs);
    var data = JDB.readAll(SHEETS.LEADS).filter(function(l){ return !l.deleted; });
    if (!scopeAll_(role)) data = data.filter(function(l){ return l.assignedAgent === callerUser; }); // scope in the query layer, not the view
    return ok_({ data: data.map(function(l) {
      var p = props[l.propertyId];
      return Object.assign({}, l, { propertyTitle: p ? p.title : '', propertyRef: p ? p.referenceCode : '',
        preferredLocationPath: l.preferredLocationId ? path(l.preferredLocationId) : '' });
    }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

var openLeadByPhone_ = function(phone) {
  return JDB.find(SHEETS.LEADS, function(l) {
    return !l.deleted && l.phone === phone && ['Won','Lost'].indexOf(l.status) === -1;
  });
};

function addLead(d, currentUser) {
  try {
    if (!gate_(currentUser, 'leads', 'a')) return err_('Access denied');
    var role = userRole_(currentUser);
    var name = String(d.fullName || '').trim(), phone = normPhone_(d.phone);
    if (!name || phone.replace(/\D/g, '').length < 9) return err_('Full name and a valid phone are required');
    if (!inEnum_('interestType', d.interestType)) return err_('Interest type is required');
    var dup = openLeadByPhone_(phone);
    if (dup) return err_('Open lead with this phone already exists (#' + dup.id + ' · ' + dup.fullName + ')'); // phone = identity key
    var rec0 = {
      fullName: name, phone: phone, email: String(d.email || '').trim(),
      source: inEnum_('leadSource', d.source) ? d.source : 'Other',
      interestType: d.interestType,
      propertyId: parseInt(d.propertyId, 10) || null,
      preferredLocationId: parseInt(d.preferredLocationId, 10) || null,
      budgetMin: parseFloat(d.budgetMin) || null, budgetMax: parseFloat(d.budgetMax) || null,
      message: String(d.message || ''),
      status: 'New', lostReason: '',
      assignedAgent: scopeAll_(role) ? String(d.assignedAgent || '') : currentUser, // force-set for agents — never trust the body
      createdBy: currentUser
    };
    if (rec0.assignedAgent && rec0.assignedAgent !== currentUser && !userRole_(rec0.assignedAgent)) return err_('Unknown agent');
    var rec = JDB.insert(SHEETS.LEADS, rec0);
    addLog_(currentUser, 'Lead Added', '#' + rec.id + ' ' + name + ' (' + phone + ')');
    return ok_({ message: 'Lead added!', id: rec.id });
  } catch (e) { return err_('Error: ' + e); }
}

function updateLead(d, currentUser) {
  try {
    if (!gate_(currentUser, 'leads', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.LEADS, d.id);
    if (!cur || cur.deleted) return err_('Lead not found');
    if (!scopeAll_(role) && cur.assignedAgent !== currentUser) return err_('You can only update your own leads');
    var patch = pick_(d, ['fullName','email','interestType','message']);
    if (patch.fullName !== undefined) { patch.fullName = String(patch.fullName).trim(); if (!patch.fullName) return err_('Name is required'); }
    if (d.phone !== undefined) {
      var phone = normPhone_(d.phone);
      if (phone.replace(/\D/g, '').length < 9) return err_('Invalid phone');
      var dup = openLeadByPhone_(phone);
      if (dup && dup.id != d.id) return err_('Open lead with this phone already exists (#' + dup.id + ')');
      patch.phone = phone;
    }
    if (d.source !== undefined && inEnum_('leadSource', d.source)) patch.source = d.source;
    if (d.propertyId !== undefined) patch.propertyId = parseInt(d.propertyId, 10) || null;
    if (d.preferredLocationId !== undefined) patch.preferredLocationId = parseInt(d.preferredLocationId, 10) || null;
    if (d.budgetMin !== undefined) patch.budgetMin = parseFloat(d.budgetMin) || null;
    if (d.budgetMax !== undefined) patch.budgetMax = parseFloat(d.budgetMax) || null;
    if (d.assignedAgent !== undefined && scopeAll_(role)) {
      patch.assignedAgent = String(d.assignedAgent || ''); // assignment = Admin/Manager only
      if (patch.assignedAgent && !userRole_(patch.assignedAgent)) return err_('Unknown agent'); // typo = record lost to every own-scope
    }
    if (d.status !== undefined) {
      if (!inEnum_('leadStatus', d.status)) return err_('Invalid status');
      if (d.status === 'Lost') {
        if (!String(d.lostReason || '').trim()) return err_('Lost reason is required — it is the only signal that tells you why');
        patch.status = 'Lost';
        patch.lostReason = String(d.lostReason).trim(); // reason edits persist even when status stays Lost
      } else if (d.status !== cur.status) {
        patch.status = d.status;
        patch.lostReason = '';
      }
    }
    JDB.update(SHEETS.LEADS, d.id, patch);
    var chL = diffFields_(cur, patch, FIELD_LABELS.lead);
    addLog_(currentUser, 'Lead Updated', '#' + d.id + ' — ' + diffText_(chL), chL);
    return ok_({ message: 'Lead updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

// quick-assign from the unassigned queue (Admin/Manager only)
function assignLead(id, agentUsername, currentUser) {
  try {
    if (!scopeAll_(userRole_(currentUser)) || !gate_(currentUser, 'leads', 'e')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.LEADS, id);
    if (!cur || cur.deleted) return err_('Lead not found');
    var u = userRows_().data, i = findRow_(u, U.NAME, agentUsername);
    if (i === -1 || u[i][U.STATUS] !== 'Active') return err_('Target agent not found or inactive');
    JDB.update(SHEETS.LEADS, id, { assignedAgent: agentUsername }); // status moves stay explicit — assignment isn't contact
    addLog_(currentUser, 'Lead Assigned', '#' + id + ' → ' + agentUsername);
    return ok_({ message: 'Lead assigned to ' + agentUsername + '!' });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteLead(id, currentUser) {
  try {
    if (!gate_(currentUser, 'leads', 'd')) return err_('Access denied'); // agents never delete — failed leads stay visible to managers
    var cur = JDB.byId(SHEETS.LEADS, id);
    if (!cur || cur.deleted) return err_('Lead not found');
    JDB.remove(SHEETS.LEADS, id);
    addLog_(currentUser, 'Lead Deleted', '#' + id + ' ' + cur.fullName);
    return ok_({ message: 'Lead deleted!' });
  } catch (e) { return err_('Error: ' + e); }
}

function bulkImportLeads(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'leads', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var role = userRole_(currentUser);
    var users = {}; userRows_().data.slice(1).forEach(function(r){ if (r[U.STATUS] === 'Active') users[r[U.NAME]] = 1; });
    var openPhones = {};
    JDB.readAll(SHEETS.LEADS).forEach(function(l){ if (!l.deleted && ['Won','Lost'].indexOf(l.status) === -1) openPhones[l.phone] = 1; });
    var out = [], errors = [];
    rows.forEach(function(r, i) {
      var name = String(r.FullName || '').trim(), phone = normPhone_(r.Phone);
      if (!name || phone.replace(/\D/g, '').length < 9) { errors.push('Row ' + (i + 1) + ': FullName/Phone invalid'); return; }
      if (openPhones[phone]) { errors.push('Row ' + (i + 1) + ': open lead exists for ' + phone); return; }
      openPhones[phone] = 1;
      var status = inEnum_('leadStatus', r.Status) ? r.Status : 'New';
      out.push({ fullName: name, phone: phone, email: String(r.Email || '').trim(),
        source: inEnum_('leadSource', r.Source) ? r.Source : 'Other',
        interestType: inEnum_('interestType', r.InterestType) ? r.InterestType : 'Buy',
        propertyId: null, preferredLocationId: null,
        budgetMin: parseFloat(r.BudgetMin) || null, budgetMax: parseFloat(r.BudgetMax) || null,
        message: String(r.Message || ''), status: status,
        lostReason: status === 'Lost' ? String(r.LostReason || 'Imported as Lost') : '',
        assignedAgent: scopeAll_(role) && r.AssignedAgent && users[r.AssignedAgent] ? r.AssignedAgent : (scopeAll_(role) ? '' : currentUser),
        createdBy: currentUser });
    });
    jdbBulkInsert_(SHEETS.LEADS, out);
    addLog_(currentUser, 'Bulk Import', 'Leads: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

// public enquiry — INSERT-only, hard-locked payload, everything else server-assigned
function publicSubmitEnquiry(d) {
  try {
    d = d || {};
    if (String(d.website || '').trim()) return ok_({ message: 'Thank you!' }); // honeypot — swallow bots silently
    var name = String(d.fullName || '').trim(), phone = normPhone_(d.phone);
    if (!name || phone.replace(/\D/g, '').length < 9) return err_('Please enter your name and a valid phone number');
    var cache = CacheService.getScriptCache(), key = 'enq_' + phone;
    var hits = parseInt(cache.get(key) || '0');
    if (hits >= 3) return err_('Too many enquiries from this number — please try again later');
    cache.put(key, String(hits + 1), 3600); // 3/hour per phone
    var propertyId = parseInt(d.propertyId, 10) || null;
    if (propertyId) { var pr = JDB.byId(SHEETS.PROPERTIES, propertyId); if (!pr || !pubVisible_(pr)) propertyId = null; } // public may only reference public listings
    var dup = openLeadByPhone_(phone);
    if (dup) { // same visitor again -> append to timeline instead of a duplicate lead
      JDB.insert(SHEETS.FOLLOWUPS, { leadId: dup.id, assignedAgent: dup.assignedAgent || '', type: 'Note',
        notes: 'New website enquiry: ' + String(d.message || '').substr(0, 500) + (propertyId ? ' (property #' + propertyId + ')' : ''),
        dueAt: null, status: 'Completed', completedAt: nowIso_(), reminderSent: 0, createdBy: '' });
      addLog_('public', 'Enquiry (repeat)', name + ' · ' + phone + ' → lead #' + dup.id);
      return ok_({ message: 'Thank you! Our team will contact you shortly.' });
    }
    var agent = '';
    if (appCfg_().roundRobin) { // round-robin website leads across active agents — pointer bumped in-lock
      var ag = userRows_().data.slice(1).filter(function(r){ return r[U.STATUS] === 'Active' && r[U.ROLE] === 'Agent'; });
      if (ag.length) {
        var rrLock = LockService.getScriptLock(); rrLock.waitLock(5000);
        try {
          var sp = PropertiesService.getScriptProperties();
          var ptr = parseInt(sp.getProperty('RR_PTR') || '0', 10) % ag.length;
          agent = ag[ptr][U.NAME];
          sp.setProperty('RR_PTR', String(ptr + 1));
        } finally { rrLock.releaseLock(); }
        try { MailApp.sendEmail(ag.filter(function(r){ return r[U.NAME] === agent; })[0][U.EMAIL],
          'CRM: new website lead assigned to you', 'New lead: ' + name + ' (' + phone + ')\n\n— Real Estate CRM'); } catch (eMail) {}
      }
    }
    JDB.insert(SHEETS.LEADS, {
      fullName: name.substr(0, 100), phone: phone.substr(0, 20), email: String(d.email || '').trim().substr(0, 150),
      message: (String(d.message || '').substr(0, 1000) + (d.preferredTime ? '\nPreferred viewing: ' + String(d.preferredTime).substr(0, 30) : '')),
      interestType: inEnum_('interestType', d.interestType) ? d.interestType : 'Buy',
      propertyId: propertyId, preferredLocationId: null, budgetMin: null, budgetMax: null,
      source: 'Website', status: 'New', lostReason: '', assignedAgent: agent, createdBy: '' // '' createdBy = public web form
    });
    addLog_('public', 'Enquiry Received', name + ' · ' + phone + (propertyId ? ' · property #' + propertyId : '') + (agent ? ' → ' + agent : ''));
    return ok_({ message: 'Thank you! Our team will contact you shortly.' });
  } catch (e) { return err_('Something went wrong — please try again'); }
}

// ============== Follow-Ups (activity log + reminder queue in one — dueAt NULL = logged activity) ==============
function getFollowUps(callerUser) {
  try {
    if (!gate_(callerUser, 'followups', 'v')) return err_('Access denied');
    var role = userRole_(callerUser);
    var leads = {}; JDB.readAll(SHEETS.LEADS).forEach(function(l){ leads[l.id] = l; });
    var data = JDB.readAll(SHEETS.FOLLOWUPS).filter(function(f){ return !f.deleted; });
    if (!scopeAll_(role)) data = data.filter(function(f){ return f.assignedAgent === callerUser; });
    return ok_({ data: data.map(function(f) {
      var l = leads[f.leadId];
      return Object.assign({}, f, { leadName: l ? l.fullName : '#' + f.leadId, leadPhone: l ? l.phone : '', leadStatus: l ? l.status : '' });
    }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

function addFollowUp(d, currentUser) {
  try {
    if (!gate_(currentUser, 'followups', 'a')) return err_('Access denied');
    var role = userRole_(currentUser), lead = JDB.byId(SHEETS.LEADS, d.leadId);
    if (!lead || lead.deleted) return err_('Lead not found');
    if (!scopeAll_(role) && lead.assignedAgent !== currentUser) return err_('You can only log follow-ups on your own leads');
    if (!inEnum_('followUpType', d.type)) return err_('Type is required');
    var dueAt = toIso_(d.dueAt);
    var fuAgent = scopeAll_(role) ? String(d.assignedAgent || currentUser) : currentUser; // managers delegate, agents own it
    if (!userRole_(fuAgent)) return err_('Unknown agent');
    var rec = JDB.insert(SHEETS.FOLLOWUPS, {
      leadId: lead.id,
      assignedAgent: fuAgent,
      type: d.type, notes: String(d.notes || ''),
      dueAt: dueAt,
      status: dueAt ? 'Pending' : 'Completed',           // no due date = logged past activity
      completedAt: dueAt ? null : nowIso_(),
      reminderSent: 0, createdBy: currentUser
    });
    addLog_(currentUser, 'Follow-Up Added', '#' + rec.id + ' [' + d.type + '] lead #' + lead.id);
    return ok_({ message: dueAt ? 'Follow-up scheduled!' : 'Activity logged!', id: rec.id });
  } catch (e) { return err_('Error: ' + e); }
}

function updateFollowUp(d, currentUser) {
  try {
    if (!gate_(currentUser, 'followups', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.FOLLOWUPS, d.id);
    if (!cur || cur.deleted) return err_('Follow-up not found');
    if (!scopeAll_(role) && cur.assignedAgent !== currentUser) return err_('You can only update your own follow-ups');
    var patch = {};
    if (d.type !== undefined && inEnum_('followUpType', d.type)) patch.type = d.type;
    if (d.notes !== undefined) patch.notes = String(d.notes || '');
    if (d.assignedAgent !== undefined && scopeAll_(role)) {
      patch.assignedAgent = String(d.assignedAgent || cur.assignedAgent);
      if (!userRole_(patch.assignedAgent)) return err_('Unknown agent');
    }
    if (d.dueAt !== undefined) {
      var newDue = toIso_(d.dueAt);
      if (String(newDue || '').substr(0, 16) !== String(cur.dueAt || '').substr(0, 16)) { // minute precision — dt-local round trips drop seconds
        patch.dueAt = newDue;
        patch.reminderSent = 0; // rescheduled -> remind again
      }
    }
    if (d.status !== undefined && d.status !== cur.status) {
      if (!inEnum_('followUpStatus', d.status)) return err_('Invalid status');
      patch.status = d.status; // mistakes -> Cancelled, row stays visible (audit trail, not a diary)
      patch.completedAt = d.status === 'Completed' ? nowIso_() : null;
    }
    JDB.update(SHEETS.FOLLOWUPS, d.id, patch);
    var chF = diffFields_(cur, patch, FIELD_LABELS.followup);
    addLog_(currentUser, 'Follow-Up Updated', '#' + d.id + ' — ' + diffText_(chF), chF);
    return ok_({ message: 'Follow-up updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteFollowUp(id, currentUser) {
  try {
    if (!gate_(currentUser, 'followups', 'd')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.FOLLOWUPS, id);
    if (!cur || cur.deleted) return err_('Follow-up not found');
    JDB.remove(SHEETS.FOLLOWUPS, id);
    addLog_(currentUser, 'Follow-Up Deleted', '#' + id);
    return ok_({ message: 'Follow-up deleted!' });
  } catch (e) { return err_('Error: ' + e); }
}

function bulkImportFollowUps(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'followups', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var role = userRole_(currentUser);
    var byPhone = {};
    JDB.readAll(SHEETS.LEADS).forEach(function(l){ if (!l.deleted) byPhone[l.phone] = l; });
    var out = [], errors = [];
    rows.forEach(function(r, i) {
      var lead = byPhone[normPhone_(r.LeadPhone)];
      if (!lead) { errors.push('Row ' + (i + 1) + ': no lead with phone ' + (r.LeadPhone || '')); return; }
      if (!scopeAll_(role) && lead.assignedAgent !== currentUser) { errors.push('Row ' + (i + 1) + ': not your lead'); return; }
      if (!inEnum_('followUpType', r.Type)) { errors.push('Row ' + (i + 1) + ': bad Type'); return; }
      var dueAt = toIso_(r.DueAt);
      out.push({ leadId: lead.id,
        assignedAgent: scopeAll_(role) && r.AssignedAgent && userRole_(r.AssignedAgent) ? r.AssignedAgent : currentUser,
        type: r.Type, notes: String(r.Notes || ''), dueAt: dueAt,
        status: dueAt ? 'Pending' : 'Completed', completedAt: dueAt ? null : nowIso_(),
        reminderSent: 0, createdBy: currentUser });
    });
    jdbBulkInsert_(SHEETS.FOLLOWUPS, out);
    addLog_(currentUser, 'Bulk Import', 'Follow-Ups: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Appointments (viewing scheduler) ==============
// overlap among the same agent's live bookings — computed at write time, never stored
var apptConflict_ = function(agent, startIso, minutes, exceptId) {
  var s = new Date(startIso).getTime(), e = s + (parseInt(minutes, 10) || 30) * 60000;
  return JDB.readAll(SHEETS.APPOINTMENTS).find(function(a) {
    if (a.deleted || a.id == exceptId || a.agent !== agent) return false;
    if (['Scheduled','Confirmed'].indexOf(a.status) === -1) return false;
    var as = new Date(a.scheduledAt).getTime(), ae = as + (a.durationMinutes || 30) * 60000;
    return s < ae && as < e;
  }) || null;
};

function getAppointments(callerUser) {
  try {
    if (!gate_(callerUser, 'appointments', 'v')) return err_('Access denied');
    var role = userRole_(callerUser);
    var leads = {}; JDB.readAll(SHEETS.LEADS).forEach(function(l){ leads[l.id] = l; });
    var props = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ props[p.id] = p; });
    var data = JDB.readAll(SHEETS.APPOINTMENTS).filter(function(a){ return !a.deleted; });
    if (!scopeAll_(role)) data = data.filter(function(a){ return a.agent === callerUser; });
    return ok_({ data: data.map(function(a) {
      var l = leads[a.leadId], p = props[a.propertyId];
      return Object.assign({}, a, { leadName: l ? l.fullName : '#' + a.leadId, leadPhone: l ? l.phone : '',
        propertyTitle: p ? p.title : '#' + a.propertyId, propertyRef: p ? p.referenceCode : '' });
    }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

function addAppointment(d, currentUser) {
  try {
    if (!gate_(currentUser, 'appointments', 'a')) return err_('Access denied');
    var role = userRole_(currentUser);
    var lead = JDB.byId(SHEETS.LEADS, d.leadId);
    if (!lead || lead.deleted) return err_('Lead not found');
    if (!scopeAll_(role) && lead.assignedAgent !== currentUser) return err_('You can only book viewings for your own leads'); // blocks Own-scope bypass via joins
    var prop = JDB.byId(SHEETS.PROPERTIES, d.propertyId);
    if (!prop || prop.deleted) return err_('Property not found');
    var when = toIso_(d.scheduledAt);
    if (!when) return err_('Date & time are required');
    var mins = parseInt(d.durationMinutes, 10) || 30;
    if (mins < 5 || mins > 480) return err_('Invalid duration (5–480 minutes)'); // negative/zero would invert the conflict window
    var agent = scopeAll_(role) ? String(d.agent || currentUser) : currentUser;
    if (!userRole_(agent)) return err_('Unknown agent');
    var clash = apptConflict_(agent, when, mins, null);
    if (clash) return err_('Conflict: ' + agent + ' already has a viewing at ' + clash.scheduledAt.replace('T', ' ').substr(0, 16) + ' (#' + clash.id + ')');
    var rec = JDB.insert(SHEETS.APPOINTMENTS, {
      leadId: lead.id, propertyId: prop.id, agent: agent,
      scheduledAt: when, durationMinutes: mins,
      status: 'Scheduled', notes: String(d.notes || ''), cancellationReason: '',
      reminderSent: 0, createdBy: currentUser
    });
    if (lead.status === 'New' || lead.status === 'Contacted' || lead.status === 'Qualified')
      JDB.update(SHEETS.LEADS, lead.id, { status: 'Viewing Scheduled' }); // pipeline follows the booking
    addLog_(currentUser, 'Appointment Added', '#' + rec.id + ' ' + (prop.referenceCode || '') + ' @ ' + when);
    return ok_({ message: 'Viewing scheduled!', id: rec.id });
  } catch (e) { return err_('Error: ' + e); }
}

function updateAppointment(d, currentUser) {
  try {
    if (!gate_(currentUser, 'appointments', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.APPOINTMENTS, d.id);
    if (!cur || cur.deleted) return err_('Appointment not found');
    if (!scopeAll_(role) && cur.agent !== currentUser) return err_('You can only update your own appointments');
    var patch = {};
    if (d.notes !== undefined) patch.notes = String(d.notes || '');
    if (d.agent !== undefined && scopeAll_(role)) {
      patch.agent = String(d.agent || cur.agent);
      if (!userRole_(patch.agent)) return err_('Unknown agent');
    }
    var when = d.scheduledAt !== undefined ? toIso_(d.scheduledAt) : cur.scheduledAt;
    var mins = d.durationMinutes !== undefined ? (parseInt(d.durationMinutes, 10) || 30) : (cur.durationMinutes || 30);
    if (mins < 5 || mins > 480) return err_('Invalid duration (5–480 minutes)');
    var timeChanged = String(when || '').substr(0, 16) !== String(cur.scheduledAt || '').substr(0, 16) || mins !== (cur.durationMinutes || 30); // minute precision
    var newStatus = d.status !== undefined && d.status !== cur.status ? d.status : null;
    if (newStatus && !inEnum_('appointmentStatus', newStatus)) return err_('Invalid status');
    var liveAfter = ['Scheduled', 'Confirmed'].indexOf(newStatus || cur.status) !== -1;
    var reactivated = newStatus && ['Scheduled', 'Confirmed'].indexOf(newStatus) !== -1 && ['Scheduled', 'Confirmed'].indexOf(cur.status) === -1;
    var agentChanged = patch.agent && patch.agent !== cur.agent;
    if (!when) return err_('Date & time are required');
    if (liveAfter && (timeChanged || agentChanged || reactivated)) { // any way back onto the live calendar re-checks the slot
      var clash = apptConflict_(patch.agent || cur.agent, when, mins, cur.id);
      if (clash) return err_('Conflict: overlapping viewing #' + clash.id + ' at ' + clash.scheduledAt.replace('T', ' ').substr(0, 16));
    }
    if (timeChanged) { patch.scheduledAt = when; patch.durationMinutes = mins; patch.reminderSent = 0; } // rescheduled -> re-confirm
    if (newStatus) {
      if (newStatus === 'Cancelled' && !String(d.cancellationReason || '').trim()) return err_('Cancellation reason is required');
      patch.status = newStatus; // cancellation is a status, not a row removal — no-show rates ARE the metric
      patch.cancellationReason = newStatus === 'Cancelled' ? String(d.cancellationReason).trim() : '';
      if (reactivated) patch.reminderSent = 0;
    } else if (cur.status === 'Cancelled' && d.cancellationReason !== undefined) {
      patch.cancellationReason = String(d.cancellationReason).trim(); // reason edits persist even when status stays Cancelled
    }
    JDB.update(SHEETS.APPOINTMENTS, d.id, patch);
    var chA = diffFields_(cur, patch, FIELD_LABELS.appointment);
    addLog_(currentUser, 'Appointment Updated', '#' + d.id + ' — ' + diffText_(chA), chA);
    return ok_({ message: 'Appointment updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteAppointment(id, currentUser) {
  try {
    if (!gate_(currentUser, 'appointments', 'd')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.APPOINTMENTS, id);
    if (!cur || cur.deleted) return err_('Appointment not found');
    JDB.remove(SHEETS.APPOINTMENTS, id);
    addLog_(currentUser, 'Appointment Deleted', '#' + id);
    return ok_({ message: 'Appointment deleted!' });
  } catch (e) { return err_('Error: ' + e); }
}

function bulkImportAppointments(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'appointments', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var role = userRole_(currentUser);
    var byPhone = {}; JDB.readAll(SHEETS.LEADS).forEach(function(l){ if (!l.deleted) byPhone[l.phone] = l; });
    var byRef = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ if (!p.deleted && p.referenceCode) byRef[p.referenceCode] = p; });
    var out = [], errors = [];
    rows.forEach(function(r, i) {
      var lead = byPhone[normPhone_(r.LeadPhone)], prop = byRef[String(r.PropertyRef || '').trim()];
      if (!lead) { errors.push('Row ' + (i + 1) + ': no lead with phone ' + (r.LeadPhone || '')); return; }
      if (!prop) { errors.push('Row ' + (i + 1) + ': no property with ref ' + (r.PropertyRef || '')); return; }
      if (!scopeAll_(role) && lead.assignedAgent !== currentUser) { errors.push('Row ' + (i + 1) + ': not your lead'); return; }
      var when = toIso_(r.ScheduledAt);
      if (!when) { errors.push('Row ' + (i + 1) + ': bad ScheduledAt'); return; }
      var mins = parseInt(r.DurationMinutes, 10) || 30;
      if (mins < 5 || mins > 480) { errors.push('Row ' + (i + 1) + ': invalid duration'); return; }
      var agent = scopeAll_(role) && r.Agent && userRole_(r.Agent) ? String(r.Agent) : currentUser;
      var clashNew = out.find(function(o) {
        if (o.agent !== agent) return false;
        var s = new Date(when).getTime(), e = s + mins * 60000;
        var os = new Date(o.scheduledAt).getTime(), oe = os + o.durationMinutes * 60000;
        return s < oe && os < e;
      });
      if (clashNew || apptConflict_(agent, when, mins, null)) { errors.push('Row ' + (i + 1) + ': time conflict for ' + agent); return; }
      out.push({ leadId: lead.id, propertyId: prop.id, agent: agent, scheduledAt: when, durationMinutes: mins,
        status: 'Scheduled', notes: String(r.Notes || ''), cancellationReason: '', reminderSent: 0, createdBy: currentUser });
    });
    jdbBulkInsert_(SHEETS.APPOINTMENTS, out);
    addLog_(currentUser, 'Bulk Import', 'Appointments: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Public Portal (read-only surface — NO auth, strict projection) ==============
// ============== Deals (money layer — commission split + embedded payments[]) ==============
var openDealForProp_ = function(propertyId) {
  return JDB.find(SHEETS.DEALS, function(x){ return !x.deleted && x.propertyId == propertyId && ['Completed','Cancelled'].indexOf(x.status) === -1; });
};
var dealCalc_ = function(rec) { // ONE money source — server always recomputes, client preview mirrors this exact math
  rec.dealAmount = r2_(rec.dealAmount);
  rec.commissionAmt = r2_(rec.dealAmount * (rec.commissionPct || 0) / 100);
  rec.agentShareAmt = r2_(rec.commissionAmt * (rec.agentSharePct || 0) / 100);
  return rec;
};
var dealPaid_ = function(x){ return r2_((x.payments || []).reduce(function(s, q){ return s + (q.amount || 0); }, 0)); };

function getDeals(callerUser) {
  try {
    if (!gate_(callerUser, 'deals', 'v')) return err_('Access denied');
    var role = userRole_(callerUser);
    var props = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ props[p.id] = p; });
    var data = JDB.readAll(SHEETS.DEALS).filter(function(x){ return !x.deleted; });
    if (!scopeAll_(role)) data = data.filter(function(x){ return x.agent === callerUser; });
    return ok_({ data: data.map(function(x) {
      var p = props[x.propertyId] || {}, paid = dealPaid_(x);
      return Object.assign({}, x, { propertyTitle: p.title || '', propertyRef: p.referenceCode || '', paid: paid, balance: r2_(x.dealAmount - paid) });
    }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

function addDeal(d, currentUser) {
  try {
    if (!gate_(currentUser, 'deals', 'a')) return err_('Access denied');
    var role = userRole_(currentUser), cfg = appCfg_();
    var prop = JDB.byId(SHEETS.PROPERTIES, d.propertyId);
    if (!prop || prop.deleted) return err_('Property not found');
    if (['Draft','Sold','Rented','Withdrawn'].indexOf(prop.status) !== -1) return err_('Property is ' + prop.status + ' — only live listings take deals');
    if (openDealForProp_(prop.id)) return err_('Property already has an open deal');
    if (!scopeAll_(role) && prop.assignedAgent !== currentUser) return err_('You can only open deals on your own listings');
    var lead = d.leadId ? JDB.byId(SHEETS.LEADS, d.leadId) : null;
    if (d.leadId && (!lead || lead.deleted)) return err_('Lead not found');
    if (lead && !scopeAll_(role) && lead.assignedAgent !== currentUser) return err_('Not your lead');
    var amt = parseFloat(d.dealAmount);
    if (!(amt > 0)) return err_('Deal amount is required');
    var name = String(d.buyerName || (lead && lead.fullName) || '').trim();
    var phone = normPhone_(d.buyerPhone || (lead && lead.phone) || '');
    if (!name || phone.replace(/\D/g, '').length < 9) return err_('Buyer name and a valid phone are required');
    var agent = scopeAll_(role) ? String(d.agent || currentUser) : currentUser;
    if (!userRole_(agent)) return err_('Unknown agent');
    var rec = dealCalc_({
      dealType: prop.listingType, propertyId: prop.id, leadId: lead ? lead.id : null,
      buyerName: name, buyerPhone: phone, agent: agent, dealAmount: amt,
      commissionPct: d.commissionPct !== undefined && d.commissionPct !== '' ? (parseFloat(d.commissionPct) || 0)
        : (prop.listingType === 'Rent' ? cfg.commissionPctRent : cfg.commissionPctSale),
      agentSharePct: d.agentSharePct !== undefined && d.agentSharePct !== '' ? (parseFloat(d.agentSharePct) || 0) : cfg.agentSharePct,
      agentPaidAt: null, tokenAmount: r2_(parseFloat(d.tokenAmount) || 0),
      payments: [], status: 'Token', closedAt: null, cancellationReason: '',
      notes: String(d.notes || ''), createdBy: currentUser
    });
    if (rec.tokenAmount > 0) rec.payments.push({ date: nowIso_(), amount: Math.min(rec.tokenAmount, rec.dealAmount),
      method: inEnum_('paymentMethod', d.tokenMethod) ? d.tokenMethod : 'Cash', ref: '', notes: 'Token money', receivedBy: currentUser });
    rec = JDB.insert(SHEETS.DEALS, rec);
    JDB.update(SHEETS.PROPERTIES, prop.id, { status: 'Reserved' }); // deal on the table -> off the market
    if (lead && ['Negotiating','Won','Lost'].indexOf(lead.status) === -1) JDB.update(SHEETS.LEADS, lead.id, { status: 'Negotiating' });
    addLog_(currentUser, 'Deal Added', '#' + rec.id + ' ' + (prop.referenceCode || '') + ' ' + name + ' @ ' + rec.dealAmount);
    return ok_({ message: 'Deal opened — property reserved!', id: rec.id });
  } catch (e) { return err_('Error: ' + e); }
}

function updateDeal(d, currentUser) {
  try {
    if (!gate_(currentUser, 'deals', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.DEALS, d.id);
    if (!cur || cur.deleted) return err_('Deal not found');
    if (!scopeAll_(role) && cur.agent !== currentUser) return err_('You can only update your own deals');
    var closed = ['Completed','Cancelled'].indexOf(cur.status) !== -1;
    var patch = {};
    if (!closed) { // money fields freeze once the deal closes
      if (d.buyerName !== undefined) { patch.buyerName = String(d.buyerName).trim(); if (!patch.buyerName) return err_('Buyer name is required'); }
      if (d.buyerPhone !== undefined) { patch.buyerPhone = normPhone_(d.buyerPhone); if (patch.buyerPhone.replace(/\D/g, '').length < 9) return err_('Invalid phone'); }
      if (d.dealAmount !== undefined) {
        patch.dealAmount = parseFloat(d.dealAmount);
        if (!(patch.dealAmount > 0)) return err_('Invalid amount');
        var paid = dealPaid_(cur);
        if (r2_(patch.dealAmount) < paid) return err_('Amount cannot go below what is already paid (' + paid + ')');
      }
      if (d.commissionPct !== undefined) patch.commissionPct = parseFloat(d.commissionPct) || 0;
      if (d.agentSharePct !== undefined) patch.agentSharePct = parseFloat(d.agentSharePct) || 0;
      if (d.agent !== undefined && scopeAll_(role)) { patch.agent = String(d.agent || cur.agent); if (!userRole_(patch.agent)) return err_('Unknown agent'); }
    }
    if (d.notes !== undefined) patch.notes = String(d.notes || '');
    if (d.status !== undefined && d.status !== cur.status) {
      if (!inEnum_('dealStatus', d.status)) return err_('Invalid status');
      if (closed) return err_('Deal is ' + cur.status + ' — closed deals do not move');
      if (['Completed','Cancelled'].indexOf(d.status) !== -1 && !scopeAll_(role)) return err_('Only Manager/Admin close or cancel deals');
      patch.status = d.status;
      if (d.status === 'Cancelled') {
        if (!String(d.cancellationReason || '').trim()) return err_('Cancellation reason is required');
        patch.cancellationReason = String(d.cancellationReason).trim();
      }
      if (d.status === 'Completed') patch.closedAt = nowIso_();
    }
    var rec = dealCalc_(Object.assign({}, cur, patch));
    patch.commissionAmt = rec.commissionAmt; patch.agentShareAmt = rec.agentShareAmt; // server math, never the client's
    JDB.update(SHEETS.DEALS, d.id, patch);
    var prop = JDB.byId(SHEETS.PROPERTIES, cur.propertyId);
    if (patch.status === 'Completed' && prop) { // side-effects: inventory closes, lead wins, rent deal births a tenancy
      JDB.update(SHEETS.PROPERTIES, prop.id, { status: cur.dealType === 'Rent' ? 'Rented' : 'Sold' });
      if (cur.leadId) JDB.update(SHEETS.LEADS, cur.leadId, { status: 'Won', lostReason: '' });
      if (cur.dealType === 'Rent' && !JDB.find(SHEETS.TENANCIES, function(t){ return !t.deleted && t.propertyId == prop.id && t.status === 'Active'; })) {
        JDB.insert(SHEETS.TENANCIES, { propertyId: prop.id, dealId: cur.id, tenantName: rec.buyerName, tenantPhone: rec.buyerPhone,
          monthlyRent: rec.dealAmount, securityDeposit: r2_(parseFloat(d.securityDeposit) || 0),
          startDate: ymd_(nowIso_()), endDate: d.endDate ? ymd_(d.endDate) : null,
          rentDueDay: Math.min(28, Math.max(1, parseInt(d.rentDueDay, 10) || 5)),
          status: 'Active', rentLog: [], renewals: [], maintenance: [], depositRefund: null, notes: '', createdBy: currentUser });
      }
    }
    if (patch.status === 'Cancelled' && prop && prop.status === 'Reserved') JDB.update(SHEETS.PROPERTIES, prop.id, { status: 'Available' }); // release only what this deal held
    var chD = diffFields_(cur, patch, FIELD_LABELS.deal);
    addLog_(currentUser, 'Deal Updated', '#' + d.id + ' — ' + diffText_(chD), chD);
    return ok_({ message: patch.status === 'Completed'
      ? 'Deal completed — property ' + (cur.dealType === 'Rent' ? 'Rented, tenancy created!' : 'Sold!') : 'Deal updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

function addDealPayment(dealId, p, currentUser) {
  try {
    if (!gate_(currentUser, 'deals', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.DEALS, dealId);
    if (!cur || cur.deleted) return err_('Deal not found');
    if (!scopeAll_(role) && cur.agent !== currentUser) return err_('Not your deal');
    if (cur.status === 'Cancelled') return err_('Deal is cancelled');
    var amt = r2_(parseFloat(p.amount) || 0);
    if (!(amt > 0)) return err_('Payment amount is required');
    var paid = dealPaid_(cur);
    if (paid + amt > cur.dealAmount + 0.01) return err_('Overpay blocked — balance is ' + r2_(cur.dealAmount - paid));
    JDB.update(SHEETS.DEALS, dealId, { payments: (cur.payments || []).concat([{ date: toIso_(p.date) || nowIso_(), amount: amt,
      method: inEnum_('paymentMethod', p.method) ? p.method : 'Cash', ref: String(p.ref || ''), notes: String(p.notes || ''), receivedBy: currentUser }]) });
    addLog_(currentUser, 'Deal Payment', '#' + dealId + ' +' + amt + ' (' + r2_(paid + amt) + '/' + cur.dealAmount + ')');
    return ok_({ message: 'Payment recorded!', balance: r2_(cur.dealAmount - paid - amt) });
  } catch (e) { return err_('Error: ' + e); }
}

function markAgentPaid(dealId, currentUser) {
  try {
    if (!scopeAll_(userRole_(currentUser)) || !gate_(currentUser, 'deals', 'e')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.DEALS, dealId);
    if (!cur || cur.deleted) return err_('Deal not found');
    if (cur.status !== 'Completed') return err_('Only completed deals pay out');
    if (cur.agentPaidAt) return err_('Already paid on ' + String(cur.agentPaidAt).substr(0, 10));
    JDB.update(SHEETS.DEALS, dealId, { agentPaidAt: nowIso_() });
    addLog_(currentUser, 'Agent Commission Paid', '#' + dealId + ' ' + cur.agent + ' · ' + cur.agentShareAmt);
    return ok_({ message: 'Agent share marked paid!' });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteDeal(id, currentUser) {
  try {
    if (!gate_(currentUser, 'deals', 'd')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.DEALS, id);
    if (!cur || cur.deleted) return err_('Deal not found');
    if (cur.status === 'Completed') return err_('Completed deals are the books — Cancel is the only way out');
    JDB.remove(SHEETS.DEALS, id);
    var prop = JDB.byId(SHEETS.PROPERTIES, cur.propertyId);
    if (prop && prop.status === 'Reserved') JDB.update(SHEETS.PROPERTIES, prop.id, { status: 'Available' });
    addLog_(currentUser, 'Deal Deleted', '#' + id);
    return ok_({ message: 'Deal deleted — property released!' });
  } catch (e) { return err_('Error: ' + e); }
}

function bulkImportDeals(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'deals', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var role = userRole_(currentUser), cfg = appCfg_();
    var byRef = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ if (!p.deleted) byRef[String(p.referenceCode || '').toUpperCase()] = p; });
    var openProp = {}; JDB.readAll(SHEETS.DEALS).forEach(function(x){ if (!x.deleted && ['Completed','Cancelled'].indexOf(x.status) === -1) openProp[x.propertyId] = 1; });
    var out = [], errors = [];
    rows.forEach(function(r, i) {
      var p = byRef[String(r.PropertyRef || '').trim().toUpperCase()];
      if (!p) { errors.push('Row ' + (i + 1) + ': property ref "' + (r.PropertyRef || '') + '" not found'); return; }
      if (openProp[p.id]) { errors.push('Row ' + (i + 1) + ': open deal exists for ' + p.referenceCode); return; }
      if (!scopeAll_(role) && p.assignedAgent !== currentUser) { errors.push('Row ' + (i + 1) + ': not your listing'); return; }
      var amt = parseFloat(r.DealAmount), name = String(r.BuyerName || '').trim(), phone = normPhone_(r.BuyerPhone);
      if (!(amt > 0) || !name || phone.replace(/\D/g, '').length < 9) { errors.push('Row ' + (i + 1) + ': BuyerName/BuyerPhone/DealAmount invalid'); return; }
      openProp[p.id] = 1;
      out.push(dealCalc_({ dealType: p.listingType, propertyId: p.id, leadId: null, buyerName: name, buyerPhone: phone,
        agent: scopeAll_(role) && r.Agent && userRole_(r.Agent) ? r.Agent : currentUser, dealAmount: amt,
        commissionPct: parseFloat(r.CommissionPct) || (p.listingType === 'Rent' ? cfg.commissionPctRent : cfg.commissionPctSale),
        agentSharePct: parseFloat(r.AgentSharePct) || cfg.agentSharePct, agentPaidAt: null,
        tokenAmount: r2_(parseFloat(r.TokenAmount) || 0), payments: [],
        status: inEnum_('dealStatus', r.Status) && ['Completed','Cancelled'].indexOf(r.Status) === -1 ? r.Status : 'Token',
        closedAt: null, cancellationReason: '', notes: String(r.Notes || ''), createdBy: currentUser }));
    });
    jdbBulkInsert_(SHEETS.DEALS, out);
    if (out.length) JDB.patchMany(SHEETS.PROPERTIES, out.map(function(x){ return x.propertyId; }), { status: 'Reserved' });
    addLog_(currentUser, 'Bulk Import', 'Deals: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Offers (negotiation log — embedded on the lead, ONE Accepted max) ==============
function addOffer(leadId, o, currentUser) {
  try {
    if (!gate_(currentUser, 'leads', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), lead = JDB.byId(SHEETS.LEADS, leadId);
    if (!lead || lead.deleted) return err_('Lead not found');
    if (!scopeAll_(role) && lead.assignedAgent !== currentUser) return err_('Not your lead');
    var amt = r2_(parseFloat(o.amount) || 0);
    if (!(amt > 0)) return err_('Offer amount is required');
    var offers = (lead.offers || []).concat([{ id: (lead.offers || []).reduce(function(m, x){ return Math.max(m, x.id || 0); }, 0) + 1,
      date: nowIso_(), amount: amt, by: ENUMS.offerBy.indexOf(o.by) !== -1 ? o.by : 'Buyer', status: 'Open',
      notes: String(o.notes || ''), addedBy: currentUser }]);
    var patch = { offers: offers };
    if (['New','Contacted','Qualified','Viewing Scheduled'].indexOf(lead.status) !== -1) patch.status = 'Negotiating'; // an offer IS negotiation
    JDB.update(SHEETS.LEADS, leadId, patch);
    addLog_(currentUser, 'Offer Added', 'lead #' + leadId + ' ' + (o.by || 'Buyer') + ' ' + amt);
    return ok_({ message: 'Offer logged!' });
  } catch (e) { return err_('Error: ' + e); }
}

function updateOffer(leadId, offerId, status, currentUser) {
  try {
    if (!gate_(currentUser, 'leads', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), lead = JDB.byId(SHEETS.LEADS, leadId);
    if (!lead || lead.deleted) return err_('Lead not found');
    if (!scopeAll_(role) && lead.assignedAgent !== currentUser) return err_('Not your lead');
    if (ENUMS.offerStatus.indexOf(status) === -1) return err_('Invalid status');
    var found = 0;
    var offers = (lead.offers || []).map(function(x) {
      if (x.id == offerId) { found = 1; return Object.assign({}, x, { status: status }); }
      return status === 'Accepted' && ['Open','Countered'].indexOf(x.status) !== -1 ? Object.assign({}, x, { status: 'Rejected' }) : x; // accepting folds the rest
    });
    if (!found) return err_('Offer not found');
    JDB.update(SHEETS.LEADS, leadId, { offers: offers });
    addLog_(currentUser, 'Offer ' + status, 'lead #' + leadId + ' offer #' + offerId);
    return ok_({ message: 'Offer ' + status.toLowerCase() + '!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Owners (party registry — phone-keyed, never public) ==============
function getOwners(callerUser) {
  try {
    if (!gate_(callerUser, 'owners', 'v')) return err_('Access denied');
    var propsByOwner = {}, dealVal = {};
    var props = JDB.readAll(SHEETS.PROPERTIES).filter(function(p){ return !p.deleted; });
    props.forEach(function(p){ if (p.ownerId) (propsByOwner[p.ownerId] = propsByOwner[p.ownerId] || []).push(p); });
    var propOwner = {}; props.forEach(function(p){ if (p.ownerId) propOwner[p.id] = p.ownerId; });
    JDB.readAll(SHEETS.DEALS).forEach(function(x){
      if (!x.deleted && x.status === 'Completed' && propOwner[x.propertyId])
        dealVal[propOwner[x.propertyId]] = r2_((dealVal[propOwner[x.propertyId]] || 0) + x.dealAmount);
    });
    return ok_({ data: JDB.readAll(SHEETS.OWNERS).filter(function(x){ return !x.deleted; }).map(function(o){
      return Object.assign({}, o, { propertyCount: (propsByOwner[o.id] || []).length, totalBusiness: dealVal[o.id] || 0 });
    }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

var ownerByPhone_ = function(phone){ return JDB.find(SHEETS.OWNERS, function(o){ return !o.deleted && o.phone === phone; }); };

function addOwner(d, currentUser) {
  try {
    if (!gate_(currentUser, 'owners', 'a')) return err_('Access denied');
    var name = String(d.name || '').trim(), phone = normPhone_(d.phone);
    if (!name || phone.replace(/\D/g, '').length < 9) return err_('Name and a valid phone are required');
    var dup = ownerByPhone_(phone);
    if (dup) return err_('Owner with this phone already exists (#' + dup.id + ' · ' + dup.name + ')');
    var rec = JDB.insert(SHEETS.OWNERS, { name: name, phone: phone, email: String(d.email || '').trim(),
      cnic: String(d.cnic || '').trim(), address: String(d.address || '').trim(), notes: String(d.notes || ''), createdBy: currentUser });
    addLog_(currentUser, 'Owner Added', '#' + rec.id + ' ' + name);
    return ok_({ message: 'Owner added!', id: rec.id, owner: rec });
  } catch (e) { return err_('Error: ' + e); }
}

function updateOwner(d, currentUser) {
  try {
    if (!gate_(currentUser, 'owners', 'e')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.OWNERS, d.id);
    if (!cur || cur.deleted) return err_('Owner not found');
    var patch = pick_(d, ['name','email','cnic','address','notes']);
    if (patch.name !== undefined) { patch.name = String(patch.name).trim(); if (!patch.name) return err_('Name is required'); }
    if (d.phone !== undefined) {
      var phone = normPhone_(d.phone);
      if (phone.replace(/\D/g, '').length < 9) return err_('Invalid phone');
      var dup = ownerByPhone_(phone);
      if (dup && dup.id != d.id) return err_('Another owner already has this phone');
      patch.phone = phone;
    }
    JDB.update(SHEETS.OWNERS, d.id, patch);
    addLog_(currentUser, 'Owner Updated', '#' + d.id);
    return ok_({ message: 'Owner updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

function bulkImportOwners(rows, currentUser) {
  try {
    if (!gate_(currentUser, 'owners', 'a')) return err_('Access denied');
    if (!rows || !rows.length) return err_('No rows to import');
    var phones = {}; JDB.readAll(SHEETS.OWNERS).forEach(function(o){ if (!o.deleted) phones[o.phone] = 1; });
    var out = [], errors = [];
    rows.forEach(function(r, i) {
      var name = String(r.Name || '').trim(), phone = normPhone_(r.Phone);
      if (!name || phone.replace(/\D/g, '').length < 9) { errors.push('Row ' + (i + 1) + ': Name/Phone invalid'); return; }
      if (phones[phone]) { errors.push('Row ' + (i + 1) + ': owner exists for ' + phone); return; }
      phones[phone] = 1;
      out.push({ name: name, phone: phone, email: String(r.Email || '').trim(), cnic: String(r.CNIC || '').trim(),
        address: String(r.Address || '').trim(), notes: String(r.Notes || ''), createdBy: currentUser });
    });
    jdbBulkInsert_(SHEETS.OWNERS, out);
    addLog_(currentUser, 'Bulk Import', 'Owners: ' + out.length + ' imported, ' + errors.length + ' skipped');
    return ok_({ count: out.length, errors: errors });
  } catch (e) { return err_('Error: ' + e); }
}

function deleteOwner(id, currentUser) {
  try {
    if (!gate_(currentUser, 'owners', 'd')) return err_('Access denied');
    var cur = JDB.byId(SHEETS.OWNERS, id);
    if (!cur || cur.deleted) return err_('Owner not found');
    if (JDB.readAll(SHEETS.PROPERTIES).some(function(p){ return !p.deleted && p.ownerId == id; }))
      return err_('Owner has linked properties — unlink or delete them first');
    JDB.remove(SHEETS.OWNERS, id);
    addLog_(currentUser, 'Owner Deleted', '#' + id + ' ' + cur.name);
    return ok_({ message: 'Owner deleted!' });
  } catch (e) { return err_('Error: ' + e); }
}

// acquisition flow: Sell / Rent Out lead -> dedup owner by phone, hand prefill back to the property form
function convertLeadToProperty(leadId, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'a')) return err_('Access denied');
    var role = userRole_(currentUser), lead = JDB.byId(SHEETS.LEADS, leadId);
    if (!lead || lead.deleted) return err_('Lead not found');
    if (!scopeAll_(role) && lead.assignedAgent !== currentUser) return err_('Not your lead');
    if (['Sell','Rent Out'].indexOf(lead.interestType) === -1) return err_('Only Sell / Rent Out leads convert to listings');
    var owner = ownerByPhone_(lead.phone);
    if (!owner) {
      owner = JDB.insert(SHEETS.OWNERS, { name: lead.fullName, phone: lead.phone, email: lead.email || '',
        cnic: '', address: '', notes: 'From lead #' + lead.id, createdBy: currentUser });
      addLog_(currentUser, 'Owner Added', '#' + owner.id + ' ' + owner.name + ' (from lead #' + lead.id + ')');
    }
    return ok_({ prefill: { ownerId: owner.id, ownerName: owner.name, ownerPhone: owner.phone,
      listingType: lead.interestType === 'Rent Out' ? 'Rent' : 'Sale',
      locationId: lead.preferredLocationId || '', description: lead.message || '', fromLeadId: lead.id } });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Property documents & expenses (embedded — never public) ==============
function uploadPropertyDoc(propertyId, base64Data, filename, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.PROPERTIES, propertyId);
    if (!cur || cur.deleted) return err_('Property not found');
    if (!scopeAll_(role) && cur.assignedAgent !== currentUser) return err_('Not your listing');
    var folder = getAssetsFolder();
    if (!folder) return err_('Failed to open ASSETS folder');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data.split(',')[1] || base64Data), 'application/octet-stream', filename);
    var file = folder.createFile(blob);
    file.setName('doc_' + new Date().getTime() + '_' + filename).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var doc = { name: filename, url: 'https://drive.google.com/file/d/' + file.getId() + '/view', uploadedBy: currentUser, uploadedAt: nowIso_() };
    JDB.update(SHEETS.PROPERTIES, propertyId, { documents: (cur.documents || []).concat([doc]) });
    addLog_(currentUser, 'Property Doc Added', (cur.referenceCode || '#' + propertyId) + ' · ' + filename);
    return ok_({ message: 'Document uploaded!', doc: doc });
  } catch (e) { return err_('Upload error: ' + e); }
}

function removePropertyDoc(propertyId, url, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.PROPERTIES, propertyId);
    if (!cur || cur.deleted) return err_('Property not found');
    if (!scopeAll_(role) && cur.assignedAgent !== currentUser) return err_('Not your listing');
    JDB.update(SHEETS.PROPERTIES, propertyId, { documents: (cur.documents || []).filter(function(x){ return x.url !== url; }) });
    addLog_(currentUser, 'Property Doc Removed', cur.referenceCode || '#' + propertyId);
    return ok_({ message: 'Document removed!' });
  } catch (e) { return err_('Error: ' + e); }
}

function addPropertyExpense(propertyId, e0, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.PROPERTIES, propertyId);
    if (!cur || cur.deleted) return err_('Property not found');
    if (!scopeAll_(role) && cur.assignedAgent !== currentUser) return err_('Not your listing');
    var amt = r2_(parseFloat(e0.amount) || 0);
    if (!(amt > 0)) return err_('Expense amount is required');
    JDB.update(SHEETS.PROPERTIES, propertyId, { expenses: (cur.expenses || []).concat([{ date: ymd_(e0.date || nowIso_()),
      category: ENUMS.expenseCategory.indexOf(e0.category) !== -1 ? e0.category : 'Other', amount: amt,
      notes: String(e0.notes || ''), addedBy: currentUser }]) });
    addLog_(currentUser, 'Property Expense', (cur.referenceCode || '#' + propertyId) + ' ' + amt);
    return ok_({ message: 'Expense logged!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Tenancies (rental management — auto-born from completed Rent deals) ==============
var tenMonths_ = function(t) { // months of rent expected so far — derived, never stored
  var s = new Date(t.startDate + 'T00:00:00'), now = new Date();
  var m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (now.getDate() >= (t.rentDueDay || 5)) m++;
  return Math.max(0, m);
};
var tenCollected_ = function(t){ return r2_((t.rentLog || []).reduce(function(s, q){ return s + (q.amount || 0); }, 0)); };

function getTenancies(callerUser) {
  try {
    if (!gate_(callerUser, 'tenancies', 'v')) return err_('Access denied');
    var role = userRole_(callerUser);
    var props = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ props[p.id] = p; });
    var data = JDB.readAll(SHEETS.TENANCIES).filter(function(x){ return !x.deleted; });
    if (!scopeAll_(role)) data = data.filter(function(x){ var p = props[x.propertyId]; return p && p.assignedAgent === callerUser; }); // scope rides the listing
    return ok_({ data: data.map(function(t) {
      var p = props[t.propertyId] || {};
      var expected = t.status === 'Active' ? r2_(tenMonths_(t) * t.monthlyRent) : tenCollected_(t);
      return Object.assign({}, t, { propertyTitle: p.title || '', propertyRef: p.referenceCode || '', agent: p.assignedAgent || '',
        collected: tenCollected_(t), expected: expected, arrears: Math.max(0, r2_(expected - tenCollected_(t))) });
    }).reverse() });
  } catch (e) { return err_('Error: ' + e); }
}

var tenGate_ = function(id, callerUser, perm) { // shared guard -> {t, p} or error string
  if (!gate_(callerUser, 'tenancies', perm)) return 'Access denied';
  var t = JDB.byId(SHEETS.TENANCIES, id);
  if (!t || t.deleted) return 'Tenancy not found';
  var p = JDB.byId(SHEETS.PROPERTIES, t.propertyId);
  if (!scopeAll_(userRole_(callerUser)) && (!p || p.assignedAgent !== callerUser)) return 'Not your tenancy';
  return { t: t, p: p };
};

function collectRent(id, d, currentUser) {
  try {
    var g = tenGate_(id, currentUser, 'e');
    if (typeof g === 'string') return err_(g);
    if (g.t.status !== 'Active') return err_('Tenancy has ended');
    var month = String(d.month || '').substr(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return err_('Month is required (YYYY-MM)');
    if ((g.t.rentLog || []).some(function(q){ return q.month === month; })) return err_(month + ' is already collected');
    var amt = r2_(parseFloat(d.amount) || 0);
    if (!(amt > 0)) return err_('Amount is required');
    JDB.update(SHEETS.TENANCIES, id, { rentLog: (g.t.rentLog || []).concat([{ month: month, amount: amt, paidAt: nowIso_(),
      method: inEnum_('paymentMethod', d.method) ? d.method : 'Cash', ref: String(d.ref || ''), receivedBy: currentUser }]) });
    addLog_(currentUser, 'Rent Collected', (g.p && g.p.referenceCode || '#' + id) + ' ' + month + ' ' + amt);
    return ok_({ message: 'Rent for ' + month + ' collected!' });
  } catch (e) { return err_('Error: ' + e); }
}

function renewTenancy(id, d, currentUser) {
  try {
    var g = tenGate_(id, currentUser, 'e');
    if (typeof g === 'string') return err_(g);
    if (!scopeAll_(userRole_(currentUser))) return err_('Only Manager/Admin renew contracts');
    if (g.t.status !== 'Active') return err_('Tenancy has ended');
    var newRent = r2_(parseFloat(d.newRent) || 0);
    if (!(newRent > 0)) return err_('New rent is required');
    JDB.update(SHEETS.TENANCIES, id, { monthlyRent: newRent, endDate: d.newEndDate ? ymd_(d.newEndDate) : g.t.endDate,
      renewals: (g.t.renewals || []).concat([{ date: nowIso_(), oldRent: g.t.monthlyRent, newRent: newRent,
        newEndDate: d.newEndDate ? ymd_(d.newEndDate) : g.t.endDate, notes: String(d.notes || ''), byUser: currentUser }]) });
    addLog_(currentUser, 'Tenancy Renewed', '#' + id + ' rent ' + g.t.monthlyRent + ' → ' + newRent);
    return ok_({ message: 'Tenancy renewed!' });
  } catch (e) { return err_('Error: ' + e); }
}

function endTenancy(id, d, currentUser) {
  try {
    var g = tenGate_(id, currentUser, 'e');
    if (typeof g === 'string') return err_(g);
    if (!scopeAll_(userRole_(currentUser))) return err_('Only Manager/Admin end tenancies');
    if (g.t.status !== 'Active') return err_('Already ended');
    var deductions = r2_(parseFloat(d.deductions) || 0);
    if (deductions > (g.t.securityDeposit || 0)) return err_('Deductions exceed the deposit (' + g.t.securityDeposit + ')');
    JDB.update(SHEETS.TENANCIES, id, { status: 'Ended', endDate: ymd_(nowIso_()),
      depositRefund: { amount: r2_((g.t.securityDeposit || 0) - deductions), deductions: deductions, notes: String(d.notes || ''), refundedAt: nowIso_() } });
    if (g.p && g.p.status === 'Rented') JDB.update(SHEETS.PROPERTIES, g.p.id, { status: 'Available' }); // unit back on the market
    addLog_(currentUser, 'Tenancy Ended', '#' + id + ' refund ' + r2_((g.t.securityDeposit || 0) - deductions));
    return ok_({ message: 'Tenancy ended — property back to Available!' });
  } catch (e) { return err_('Error: ' + e); }
}

function addMaintenance(id, d, currentUser) {
  try {
    var g = tenGate_(id, currentUser, 'e');
    if (typeof g === 'string') return err_(g);
    var issue = String(d.issue || '').trim();
    if (!issue) return err_('Issue description is required');
    JDB.update(SHEETS.TENANCIES, id, { maintenance: (g.t.maintenance || []).concat([{
      id: (g.t.maintenance || []).reduce(function(m, x){ return Math.max(m, x.id || 0); }, 0) + 1,
      date: ymd_(nowIso_()), issue: issue.substr(0, 200), status: 'Open', cost: 0, fixedAt: null, addedBy: currentUser }]) });
    addLog_(currentUser, 'Maintenance Logged', '#' + id + ' ' + issue.substr(0, 60));
    return ok_({ message: 'Maintenance logged!' });
  } catch (e) { return err_('Error: ' + e); }
}

function updateMaintenance(id, mId, d, currentUser) {
  try {
    var g = tenGate_(id, currentUser, 'e');
    if (typeof g === 'string') return err_(g);
    var found = null;
    var list = (g.t.maintenance || []).map(function(x) {
      if (x.id != mId) return x;
      found = Object.assign({}, x);
      if (d.status === 'Fixed' && x.status !== 'Fixed') { found.status = 'Fixed'; found.fixedAt = nowIso_(); }
      if (d.cost !== undefined) found.cost = r2_(parseFloat(d.cost) || 0);
      if (d.issue !== undefined) found.issue = String(d.issue).substr(0, 200);
      return found;
    });
    if (!found) return err_('Maintenance item not found');
    JDB.update(SHEETS.TENANCIES, id, { maintenance: list });
    if (d.status === 'Fixed' && found.cost > 0 && g.p) // fixed with a cost -> mirrors into the property's expense book
      JDB.update(SHEETS.PROPERTIES, g.p.id, { expenses: (JDB.byId(SHEETS.PROPERTIES, g.p.id).expenses || []).concat([{
        date: ymd_(nowIso_()), category: 'Maintenance', amount: found.cost, notes: found.issue, addedBy: currentUser }]) });
    addLog_(currentUser, 'Maintenance Updated', '#' + id + ' item #' + mId + (d.status ? ' → ' + d.status : ''));
    return ok_({ message: 'Maintenance updated!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Viewing feedback (Complete flow — Hot/Warm/Cold) ==============
function completeAppointment(id, d, currentUser) {
  try {
    if (!gate_(currentUser, 'appointments', 'e')) return err_('Access denied');
    var role = userRole_(currentUser), cur = JDB.byId(SHEETS.APPOINTMENTS, id);
    if (!cur || cur.deleted) return err_('Appointment not found');
    if (!scopeAll_(role) && cur.agent !== currentUser) return err_('Not your appointment');
    if (['Cancelled','Completed'].indexOf(cur.status) !== -1) return err_('Appointment is already ' + cur.status);
    JDB.update(SHEETS.APPOINTMENTS, id, { status: 'Completed', feedback: String(d.feedback || ''),
      interestLevel: ENUMS.interestLevel.indexOf(d.interestLevel) !== -1 ? d.interestLevel : null });
    addLog_(currentUser, 'Appointment Completed', '#' + id + (d.interestLevel ? ' [' + d.interestLevel + ']' : ''));
    var lead = JDB.byId(SHEETS.LEADS, cur.leadId); // Hot -> OFFER to move, never force
    var suggest = d.interestLevel === 'Hot' && lead && !lead.deleted && ['Negotiating','Won','Lost'].indexOf(lead.status) === -1;
    return ok_({ message: 'Viewing completed!', suggestNegotiating: !!suggest, leadId: lead ? lead.id : null });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Notifications (computed per user — nothing stored) ==============
function getNotifications(callerUser) {
  try {
    var role = userRole_(callerUser);
    if (!role) return err_('Access denied');
    var all = scopeAll_(role), me = callerUser, now = new Date(), today = ymd_(nowIso_());
    var items = [];
    var leads = JDB.readAll(SHEETS.LEADS).filter(function(l){ return !l.deleted; });
    if (all) {
      var un = leads.filter(function(l){ return !l.assignedAgent && ['Won','Lost'].indexOf(l.status) === -1; }).length;
      if (un) items.push({ icon: 'fa-user-plus', text: un + ' unassigned lead' + (un > 1 ? 's' : '') + ' waiting', page: 'leads' });
    }
    var fus = JDB.readAll(SHEETS.FOLLOWUPS).filter(function(f){ return !f.deleted && (all || f.assignedAgent === me); });
    var od = fus.filter(function(f){ return f.status === 'Pending' && f.dueAt && new Date(f.dueAt) < now; }).length;
    if (od) items.push({ icon: 'fa-triangle-exclamation', text: od + ' overdue follow-up' + (od > 1 ? 's' : ''), page: 'followups' });
    var appts = JDB.readAll(SHEETS.APPOINTMENTS).filter(function(a){ return !a.deleted && (all || a.agent === me); });
    var tv = appts.filter(function(a){ return ['Scheduled','Confirmed'].indexOf(a.status) !== -1 && ymd_(a.scheduledAt) === today; }).length;
    if (tv) items.push({ icon: 'fa-calendar-check', text: tv + ' viewing' + (tv > 1 ? 's' : '') + ' today', page: 'appointments' });
    var deals = JDB.readAll(SHEETS.DEALS).filter(function(x){ return !x.deleted && (all || x.agent === me); });
    var opn = deals.filter(function(x){ return ['Token','Agreement'].indexOf(x.status) !== -1; }).length;
    if (opn) items.push({ icon: 'fa-handshake', text: opn + ' open deal' + (opn > 1 ? 's' : '') + ' in progress', page: 'deals' });
    if (all) {
      var payable = deals.filter(function(x){ return x.status === 'Completed' && !x.agentPaidAt; }).length;
      if (payable) items.push({ icon: 'fa-money-bill-wave', text: payable + ' agent payout' + (payable > 1 ? 's' : '') + ' pending', page: 'deals' });
    }
    var props = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ props[p.id] = p; });
    var tens = JDB.readAll(SHEETS.TENANCIES).filter(function(t) {
      if (t.deleted || t.status !== 'Active') return false;
      var p = props[t.propertyId];
      return all || (p && p.assignedAgent === me);
    });
    var arr = tens.filter(function(t){ return tenMonths_(t) * t.monthlyRent - tenCollected_(t) > 0.01; }).length;
    if (arr) items.push({ icon: 'fa-house-circle-exclamation', text: arr + ' tenanc' + (arr > 1 ? 'ies' : 'y') + ' in arrears', page: 'tenancies' });
    var exp = tens.filter(function(t){ if (!t.endDate) return false; var dd = (new Date(t.endDate) - now) / 864e5; return dd >= 0 && dd <= 30; }).length;
    if (exp) items.push({ icon: 'fa-file-signature', text: exp + ' contract' + (exp > 1 ? 's' : '') + ' expiring within 30 days', page: 'tenancies' });
    return ok_({ items: items });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Trash (Admin window into soft-deletes — restore only, no purge) ==============
function getTrash(callerUser) {
  try {
    if (userRole_(callerUser) !== 'Admin') return err_('Access denied');
    var label = { PROPERTIES: 'Property', LEADS: 'Lead', FOLLOWUPS: 'Follow-Up', APPOINTMENTS: 'Appointment',
                  DEALS: 'Deal', OWNERS: 'Owner', TENANCIES: 'Tenancy', LOCATIONS: 'Location', AMENITIES: 'Amenity' };
    var out = [];
    Object.keys(label).forEach(function(k) {
      JDB.readAll(SHEETS[k]).forEach(function(x) {
        if (!x.deleted) return;
        out.push({ sheet: k, type: label[k], id: x.id, updated: x.updated || x.created,
          title: x.title || x.fullName || x.name || x.buyerName || x.tenantName || x.notes || ('#' + x.id) });
      });
    });
    out.sort(function(a, b){ return String(b.updated).localeCompare(String(a.updated)); });
    return ok_({ data: out });
  } catch (e) { return err_('Error: ' + e); }
}

function restoreRecord(sheetKey, id, currentUser) {
  try {
    if (userRole_(currentUser) !== 'Admin') return err_('Access denied');
    if (!SHEETS[sheetKey]) return err_('Unknown sheet');
    var cur = JDB.byId(SHEETS[sheetKey], id);
    if (!cur || !cur.deleted) return err_('Record not found in trash');
    JDB.update(SHEETS[sheetKey], id, { deleted: 0 });
    addLog_(currentUser, 'Record Restored', sheetKey + ' #' + id);
    return ok_({ message: 'Record restored!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Agreements & printable documents (A4 — ONE html source for preview, print and PDF) ==============
var docMoney_ = function(n){ return Number(n || 0).toLocaleString('vi-VN') + ' ₫'; };
var docDate_ = function(v){ return v ? Utilities.formatDate(new Date(v), Session.getScriptTimeZone(), 'dd MMMM yyyy') : '____________'; };
var padNo_ = function(n){ return String(n).padStart(4, '0'); };
var docNo_ = function(prefix, id){ return prefix + '-' + new Date().getFullYear() + '-' + padNo_(id); };

var docEsc_ = function(s){ return String(s == null ? '' : s).replace(/[&<>]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]; }); };

// consistent professional A4 shell — PT Serif body / PT Sans headings, navy band header, signature+footer per doc body
var docShell_ = function(title, refNo, body) {
  return '<html><head><meta charset="UTF-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
    '<style>' +
    '@page { size: A4; margin: 0; }' +
    // print the navy band + table shading instead of letting the browser strip backgrounds
    '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
    'body { font-family: "PT Serif", Georgia, "Times New Roman", serif; margin: 0; color: #1a1a1a; background: #fff; -webkit-font-smoothing: antialiased; }' +
    '.sheet { width: 210mm; min-height: 297mm; padding: 15mm 15mm 13mm; margin: 0 auto; box-sizing: border-box; }' +
    '.hd { width: 100%; border-bottom: 3px solid #001f3f; padding-bottom: 10px; }' +
    '.hd td { vertical-align: middle; }' +
    '.agency { font-family: "PT Sans", "Segoe UI", Helvetica, Arial, sans-serif; font-size: 21px; font-weight: 700; color: #001f3f; letter-spacing: 1px; }' +
    '.agency small { display: block; font-size: 10px; color: #555; font-weight: 400; letter-spacing: .2px; margin-top: 3px; }' +
    '.doc-meta { font-family: "PT Sans", Helvetica, Arial, sans-serif; text-align: right; font-size: 10.5px; color: #444; line-height: 1.75; }' +
    '.doc-meta b { color: #001f3f; letter-spacing: .4px; }' +
    'h1 { font-family: "PT Sans", Helvetica, Arial, sans-serif; text-align: center; font-size: 17px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #001f3f; margin: 22px 0 3px; }' +
    'h1 + .rule { width: 74px; height: 2px; background: #001f3f; margin: 0 auto 6px; }' +
    '.sub { text-align: center; font-size: 10.5px; color: #666; font-style: italic; margin-bottom: 16px; }' +
    'h2 { font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #001f3f; border-bottom: 1px solid #c9d4e0; padding-bottom: 3px; margin: 17px 0 7px; }' +
    'p, li { font-size: 11.6px; line-height: 1.72; text-align: justify; }' +
    'table.tb { width: 100%; border-collapse: collapse; margin: 6px 0 4px; page-break-inside: avoid; }' +
    'table.tb th { background: #eef2f7; color: #001f3f; font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }' +
    'table.tb th, table.tb td { border: 1px solid #b9c4d1; padding: 6px 9px; font-size: 11.6px; text-align: left; vertical-align: top; }' +
    'table.tb td.r, table.tb th.r { text-align: right; }' +
    'ol.cl { margin: 4px 0 0 17px; padding: 0; } ol.cl li { margin: 7px 0; padding-left: 3px; }' +
    '.total-box { border: 2px solid #001f3f; background: #f4f7fb; padding: 10px 14px; margin-top: 10px; font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #001f3f; text-align: right; letter-spacing: .5px; }' +
    'table.sig { width: 100%; margin-top: 46px; page-break-inside: avoid; } table.sig td { width: 33%; text-align: center; font-size: 11px; padding: 0 12px; }' +
    '.sigline { border-top: 1.4px solid #333; padding-top: 6px; margin-top: 34px; }' +
    '.ft { margin-top: 24px; border-top: 1px solid #c9d4e0; padding-top: 8px; font-family: "PT Sans", Helvetica, Arial, sans-serif; font-size: 9px; color: #777; text-align: center; letter-spacing: .2px; }' +
    '</style></head><body><div class="sheet">' +
    '<table class="hd"><tr>' +
    '<td><div class="agency">RS ESTATES<small>Real Estate Sales · Rentals · Property Management — WhatsApp +92 322 4083545</small></div></td>' +
    '<td class="doc-meta">Document No: <b>' + refNo + '</b><br/>Date of Issue: <b>' + docDate_(nowIso_()) + '</b></td>' +
    '</tr></table>' +
    '<h1>' + title + '</h1><div class="rule"></div>' +
    body +
    '<div class="ft">Generated by RS Estates CRM on ' + docDate_(nowIso_()) + ' · Ref ' + refNo + ' — verify any alteration against agency records.<br/>' +
    'The Schedule of the Property set out above forms an integral part of this document.</div>' +
    '</div></body></html>';
};
var docParties_ = function(aLbl, aName, aPhone, bLbl, bName, bPhone) {
  return '<h2>Parties</h2><table class="tb">' +
    '<tr><th style="width:22%">' + aLbl + '</th><td>' + docEsc_(aName) + (aPhone ? ' &nbsp;·&nbsp; Contact: ' + docEsc_(aPhone) : '') + '</td></tr>' +
    '<tr><th>' + bLbl + '</th><td>' + docEsc_(bName) + (bPhone ? ' &nbsp;·&nbsp; Contact: ' + docEsc_(bPhone) : '') + '</td></tr></table>';
};
// full schedule — every particular of the property that matters to a signed document
var docProperty_ = function(p, path, amens) {
  p = p || {};
  var v = function(x){ return (x === null || x === undefined || x === '') ? '—' : docEsc_(x); };
  var feats = (p.amenityIds || []).map(function(i){ return (amens || {})[i]; }).filter(Boolean).map(docEsc_);
  var demand = p.price ? docMoney_(p.price) + (p.listingType === 'Rent' ? ' per ' + (p.rentFrequency === 'Yearly' ? 'year' : 'month') : '') : '—';
  return '<h2>Schedule of the Property</h2><table class="tb">' +
    '<tr><th style="width:21%">Reference Code</th><td style="width:29%">' + v(p.referenceCode) + '</td><th style="width:21%">Property Type</th><td>' + v(p.propertyType) + '</td></tr>' +
    '<tr><th>Purpose</th><td>' + (p.listingType ? 'For ' + docEsc_(p.listingType) : '—') + '</td><th>Current Status</th><td>' + v(p.status) + '</td></tr>' +
    '<tr><th>Description</th><td colspan="3">' + v(p.title) + '</td></tr>' +
    '<tr><th>Location</th><td colspan="3">' + ((path && p.locationId) ? docEsc_(path(p.locationId)) : '—') + '</td></tr>' +
    '<tr><th>Complete Address</th><td colspan="3">' + v(p.address) + '</td></tr>' +
    '<tr><th>Covered Area</th><td>' + (p.areaSize ? docEsc_(p.areaSize + ' ' + (p.areaUnit || '')) : '—') + '</td>' +
    '<th>Bedrooms / Bathrooms</th><td>' + v(p.bedrooms) + ' / ' + v(p.bathrooms) + '</td></tr>' +
    '<tr><th>Listed Demand</th><td>' + demand + '</td><th>Coordinates</th><td>' + (p.latitude && p.longitude ? docEsc_(p.latitude + ', ' + p.longitude) : '—') + '</td></tr>' +
    '<tr><th>Amenities &amp; Features</th><td colspan="3">' + (feats.length ? feats.join(' &nbsp;·&nbsp; ') : '—') + '</td></tr>' +
    (p.description ? '<tr><th>Further Particulars</th><td colspan="3">' + docEsc_(p.description) + '</td></tr>' : '') +
    '</table>';
};
var docSig_ = function(aLbl, aName, bLbl, bName) {
  return '<table class="sig"><tr>' +
    '<td><div class="sigline"><b>' + aLbl + '</b><br/>' + aName + '</div></td>' +
    '<td><div class="sigline"><b>Witness 1</b><br/>Name &amp; CNIC: ______________</div></td>' +
    '<td><div class="sigline"><b>' + bLbl + '</b><br/>' + bName + '</div></td>' +
    '</tr><tr><td colspan="3" style="padding-top:20px"><div class="sigline" style="width:33%;margin:20px auto 0"><b>Witness 2</b><br/>Name &amp; CNIC: ______________</div></td></tr></table>';
};
var docPayRows_ = function(pays) {
  return (pays || []).map(function(q, i) {
    return '<tr><td>' + (i + 1) + '</td><td>' + docDate_(q.date) + '</td><td>' + (q.method || '—') + '</td><td>' + (q.ref || '—') + '</td><td class="r">' + docMoney_(q.amount) + '</td></tr>';
  }).join('');
};

function buildAgreement(type, id, currentUser) {
  try {
    var role = userRole_(currentUser);
    if (!gate_(currentUser, 'agreements', 'v')) return err_('Access denied');
    var cfg = appCfg_(), locs = JDB.readAll(SHEETS.LOCATIONS), path = locPath_(locs);
    var amens = {}; JDB.readAll(SHEETS.AMENITIES).forEach(function(a){ if (!a.deleted) amens[a.id] = a.name; }); // id -> name for the schedule
    var html = '', title = '', refNo = '';

    if (type === 'rental' || type === 'rentreceipt') { // tenancy-sourced documents
      var t = JDB.byId(SHEETS.TENANCIES, id);
      if (!t || t.deleted) return err_('Tenancy not found');
      var tp = JDB.byId(SHEETS.PROPERTIES, t.propertyId) || {};
      if (!scopeAll_(role) && tp.assignedAgent !== currentUser) return err_('Not your tenancy');
      if (type === 'rental') {
        title = 'Rental Agreement'; refNo = docNo_('AGR', t.id);
        html = docParties_('Landlord (Lessor)', tp.ownerName || '____________', tp.ownerPhone || '', 'Tenant (Lessee)', t.tenantName, t.tenantPhone) +
          docProperty_(tp, path, amens) +
          '<h2>Commercial Terms</h2><table class="tb">' +
          '<tr><th style="width:28%">Monthly Rent</th><td class="r">' + docMoney_(t.monthlyRent) + '</td></tr>' +
          '<tr><th>Security Deposit (refundable)</th><td class="r">' + docMoney_(t.securityDeposit) + '</td></tr>' +
          '<tr><th>Rent Due Date</th><td class="r">' + t.rentDueDay + ' of every calendar month</td></tr>' +
          '<tr><th>Commencement Date</th><td class="r">' + docDate_(t.startDate) + '</td></tr>' +
          '<tr><th>Expiry Date</th><td class="r">' + (t.endDate ? docDate_(t.endDate) : 'Open-ended (renewable)') + '</td></tr>' +
          '<tr><th>Annual Renewal Increment</th><td class="r">' + (cfg.renewalIncrementPct || 10) + '% of the prevailing rent</td></tr></table>' +
          '<h2>Terms &amp; Conditions</h2><ol class="cl">' +
          '<li>The premises shall be used strictly for lawful residential purposes by the Tenant and immediate family, and for no other purpose without the Landlord\'s prior written consent.</li>' +
          '<li>The monthly rent stated above is payable in advance on or before the due date; a delay beyond seven (7) days constitutes a default under this agreement.</li>' +
          '<li>The security deposit is refundable at vacation of the premises after deduction of outstanding dues, utility bills and the cost of damages beyond normal wear and tear.</li>' +
          '<li>All utility charges (electricity, gas, water) and applicable service charges during the tenancy are the Tenant\'s responsibility, payable per actual bills.</li>' +
          '<li>Day-to-day and minor maintenance is the Tenant\'s responsibility; structural repairs and major maintenance remain the Landlord\'s responsibility.</li>' +
          '<li>The Tenant shall not sublet, assign or part with possession of the premises, in whole or in part, without the Landlord\'s prior written consent.</li>' +
          '<li>Either party may terminate this agreement by giving one (1) month prior written notice to the other party.</li>' +
          '<li>On renewal, the rent shall increase by the agreed increment stated in the Commercial Terms unless mutually agreed otherwise in writing.</li>' +
          '<li>The Landlord (or an authorised representative of RS Estates) may inspect the premises at a reasonable time with at least 24 hours prior notice.</li>' +
          '<li>Any dispute arising out of this agreement shall be resolved amicably, failing which it shall be subject to the jurisdiction of the courts of the city where the property is situated.</li></ol>' +
          '<p style="margin-top:14px">IN WITNESS WHEREOF, both parties have read, understood and signed this agreement on <b>' + docDate_(nowIso_()) + '</b> in the presence of the witnesses below.</p>' +
          docSig_('Landlord', tp.ownerName || '', 'Tenant', t.tenantName);
      } else {
        title = 'Rent Statement / Receipt'; refNo = docNo_('REC', t.id);
        var expected = t.status === 'Active' ? r2_(tenMonths_(t) * t.monthlyRent) : tenCollected_(t);
        var arrears = Math.max(0, r2_(expected - tenCollected_(t)));
        html = docParties_('Landlord', tp.ownerName || '____________', tp.ownerPhone || '', 'Tenant', t.tenantName, t.tenantPhone) +
          docProperty_(tp, path, amens) +
          '<h2>Rent Payments Received</h2><table class="tb">' +
          '<tr><th style="width:6%">#</th><th>Rent Month</th><th>Paid On</th><th>Method</th><th>Received By</th><th class="r">Amount</th></tr>' +
          (t.rentLog || []).map(function(q, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + q.month + '</td><td>' + docDate_(q.paidAt) + '</td><td>' + q.method + '</td><td>' + (q.receivedBy || '') + '</td><td class="r">' + docMoney_(q.amount) + '</td></tr>';
          }).join('') +
          '<tr><th colspan="5" class="r">Total Received</th><th class="r">' + docMoney_(tenCollected_(t)) + '</th></tr></table>' +
          '<table class="tb"><tr><th style="width:34%">Rent Expected To Date</th><td class="r">' + docMoney_(expected) + '</td></tr>' +
          '<tr><th>Arrears Outstanding</th><td class="r" style="' + (arrears > 0 ? 'color:#a30000;font-weight:bold' : '') + '">' + docMoney_(arrears) + '</td></tr></table>' +
          (arrears > 0 ? '<div class="total-box">BALANCE DUE: ' + docMoney_(arrears) + '</div>' : '<div class="total-box" style="border-color:#1a6b2f;color:#1a6b2f">ACCOUNT CLEAR — NO ARREARS</div>') +
          docSig_('Authorised Signatory (RS Estates)', '', 'Tenant', t.tenantName);
      }
    } else { // deal-sourced documents
      var d = JDB.byId(SHEETS.DEALS, id);
      if (!d || d.deleted) return err_('Deal not found');
      var dp = JDB.byId(SHEETS.PROPERTIES, d.propertyId) || {};
      if (!scopeAll_(role) && d.agent !== currentUser) return err_('Not your deal');
      var paid = dealPaid_(d), balance = r2_(d.dealAmount - paid);

      if (type === 'sale') {
        if (d.dealType !== 'Sale') return err_('Sale agreements need a Sale deal');
        title = 'Agreement to Sell'; refNo = docNo_('AGR', d.id);
        html = docParties_('Seller (Vendor)', dp.ownerName || '____________', dp.ownerPhone || '', 'Buyer (Vendee)', d.buyerName, d.buyerPhone) +
          docProperty_(dp, path, amens) +
          '<h2>Consideration &amp; Payment</h2><table class="tb">' +
          '<tr><th style="width:34%">Total Sale Consideration</th><td class="r"><b>' + docMoney_(d.dealAmount) + '</b></td></tr>' +
          '<tr><th>Paid To Date</th><td class="r">' + docMoney_(paid) + '</td></tr>' +
          '<tr><th>Balance Payable</th><td class="r">' + docMoney_(balance) + '</td></tr></table>' +
          ((d.payments || []).length ? '<table class="tb"><tr><th style="width:6%">#</th><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr>' + docPayRows_(d.payments) + '</table>' : '') +
          '<h2>Terms &amp; Conditions</h2><ol class="cl">' +
          '<li>The Seller warrants being the lawful owner of the property described above, free from all encumbrances, liens, litigation and prior agreements to sell.</li>' +
          '<li>The token/advance received forms part of the total sale consideration and stands forfeited if the Buyer withdraws without lawful cause; if the Seller withdraws, it is refundable along with an equal amount as agreed compensation.</li>' +
          '<li>The balance sale consideration shall be paid on or before the transfer date mutually agreed between the parties, failing which this agreement may be treated as terminated.</li>' +
          '<li>Legal transfer, registration and mutation of the property in the Buyer\'s name shall be completed upon receipt of the full sale consideration, with vacant possession handed over simultaneously.</li>' +
          '<li>All outstanding dues, taxes, utility bills and society charges up to the date of transfer are the Seller\'s liability; transfer charges and stamp duties are borne as per prevailing law/custom.</li>' +
          '<li>RS Estates has acted as the introducing agency; its commission is payable as separately agreed and does not form a part of this sale consideration.</li>' +
          '<li>The property is agreed to be sold on an as-is-where-is basis as fully described in the Schedule of the Property above, which the Buyer confirms having inspected and accepted; that Schedule forms an integral and binding part of this agreement.</li>' +
          '<li>All fixtures, fittings and permanent installations existing on the premises at the date of this agreement pass to the Buyer with the property unless specifically excluded in writing.</li>' +
          '<li>Time is of the essence in respect of every payment date stated above; the Seller shall provide clear title documents and any required no-objection or clearance certificates on or before the transfer date.</li>' +
          '<li>Any dispute arising out of this agreement shall be subject to the jurisdiction of the courts of the city where the property is situated.</li></ol>' +
          '<p style="margin-top:14px">IN WITNESS WHEREOF, the parties have signed this Agreement to Sell on <b>' + docDate_(nowIso_()) + '</b> in the presence of the witnesses below.</p>' +
          docSig_('Seller', dp.ownerName || '', 'Buyer', d.buyerName);
      } else if (type === 'receipt') {
        title = 'Payment Receipt'; refNo = docNo_('REC', d.id);
        html = '<p>Received with thanks from <b>' + d.buyerName + '</b> (Contact: ' + d.buyerPhone + ') the following payment(s) against ' +
          (d.dealType === 'Rent' ? 'the rental transaction' : 'the purchase') + ' of property <b>' + (dp.referenceCode || '') + '</b> — ' + (dp.title || '') + '.</p>' +
          docProperty_(dp, path, amens) +
          '<h2>Payments Received</h2><table class="tb"><tr><th style="width:6%">#</th><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr>' +
          docPayRows_(d.payments) +
          '<tr><th colspan="4" class="r">Total Received</th><th class="r">' + docMoney_(paid) + '</th></tr></table>' +
          '<table class="tb"><tr><th style="width:34%">Total ' + (d.dealType === 'Rent' ? 'Agreed Amount' : 'Sale Consideration') + '</th><td class="r">' + docMoney_(d.dealAmount) + '</td></tr>' +
          '<tr><th>Balance Remaining</th><td class="r">' + docMoney_(balance) + '</td></tr></table>' +
          '<div class="total-box">TOTAL RECEIVED: ' + docMoney_(paid) + '</div>' +
          '<p style="font-size:11px;color:#555;margin-top:10px">Cheque/online payments are subject to realisation. This receipt supersedes any verbal acknowledgement.</p>' +
          docSig_('Authorised Signatory (RS Estates)', 'Agent: ' + (d.agent || ''), 'Received By (Payer)', d.buyerName);
      } else if (type === 'dues') {
        title = 'Statement of Dues'; refNo = docNo_('DUE', d.id);
        html = docParties_('Payer', d.buyerName, d.buyerPhone, 'Handled By', 'RS Estates — ' + (d.agent || 'Agency Desk'), '') +
          docProperty_(dp, path, amens) +
          '<h2>Account Summary</h2><table class="tb">' +
          '<tr><th style="width:34%">Total ' + (d.dealType === 'Rent' ? 'Agreed Amount' : 'Sale Consideration') + '</th><td class="r">' + docMoney_(d.dealAmount) + '</td></tr>' +
          '<tr><th>Total Paid</th><td class="r">' + docMoney_(paid) + '</td></tr>' +
          '<tr><th>Deal Status</th><td class="r">' + d.status + '</td></tr></table>' +
          ((d.payments || []).length ? '<h2>Payment History</h2><table class="tb"><tr><th style="width:6%">#</th><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr>' + docPayRows_(d.payments) + '</table>' : '') +
          '<div class="total-box">BALANCE DUE: ' + docMoney_(balance) + '</div>' +
          '<p style="font-size:11px;color:#555;margin-top:10px">Kindly settle the outstanding balance at the earliest. For payment arrangements contact your RS Estates agent (' + (d.agent || '') + ').</p>' +
          docSig_('Authorised Signatory (RS Estates)', '', 'Acknowledged By', d.buyerName);
      } else if (type === 'invoice') {
        title = 'Commission Invoice'; refNo = docNo_('INV', d.id);
        html = '<h2>Bill To</h2><table class="tb">' +
          '<tr><th style="width:22%">Client</th><td>' + (dp.ownerName || d.buyerName) + '</td></tr>' +
          '<tr><th>Property</th><td>' + (dp.referenceCode || '') + ' — ' + (dp.title || '') + '</td></tr>' +
          '<tr><th>Transaction</th><td>' + d.dealType + ' · closed ' + docDate_(d.closedAt || d.updated) + ' · handled by ' + (d.agent || '') + '</td></tr></table>' +
          docProperty_(dp, path, amens) +
          '<h2>Charges</h2><table class="tb">' +
          '<tr><th style="width:6%">#</th><th>Description</th><th class="r" style="width:24%">Amount</th></tr>' +
          '<tr><td>1</td><td>Agency commission — ' + (d.dealType === 'Rent' && d.commissionPct == 100 ? 'one month\'s rent' : d.commissionPct + '% of ' + docMoney_(d.dealAmount)) + '</td><td class="r">' + docMoney_(d.commissionAmt) + '</td></tr>' +
          '<tr><th colspan="2" class="r">Total Payable</th><th class="r">' + docMoney_(d.commissionAmt) + '</th></tr></table>' +
          '<div class="total-box">TOTAL: ' + docMoney_(d.commissionAmt) + '</div>' +
          '<p style="font-size:11px;color:#555;margin-top:10px">Payment is due within 7 days of the invoice date. Please quote the invoice number with your payment.</p>' +
          docSig_('Authorised Signatory (RS Estates)', '', 'Client', dp.ownerName || d.buyerName);
      } else {
        return err_('Unknown document type');
      }
    }
    addLog_(currentUser, 'Document Generated', title + ' ' + refNo);
    return ok_({ html: docShell_(title, refNo, html), title: title + ' · ' + refNo, filename: refNo + '.pdf' });
  } catch (e) { return err_('Error: ' + e); }
}

function agreementPdf(type, id, currentUser) {
  try {
    var r = buildAgreement(type, id, currentUser);
    if (!r.success) return r;
    var pdf = Utilities.newBlob(r.html, 'text/html', 'doc.html').getAs('application/pdf');
    return ok_({ base64: Utilities.base64Encode(pdf.getBytes()), filename: r.filename });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== AI Assistant (OpenAI — key lives server-side ONLY, context scoped by role) ==============
var aiCfg_ = function() {
  var p = PropertiesService.getScriptProperties();
  return { key: p.getProperty('AI_KEY') || '', model: p.getProperty('AI_MODEL') || 'gpt-4o-mini' };
};
function getAiConfig(callerUser) {
  if (!userRole_(callerUser)) return err_('Access denied');
  var c = aiCfg_(); // the key itself NEVER leaves the server — only a masked tail
  return ok_({ model: c.model, hasKey: !!c.key, keyTail: c.key ? c.key.slice(-4) : '' });
}
function setAiConfig(key, model, currentUser) {
  if (userRole_(currentUser) !== 'Admin') return err_('Access denied');
  var p = PropertiesService.getScriptProperties();
  if (key && String(key).trim()) p.setProperty('AI_KEY', String(key).trim()); // blank = keep the stored key
  if (model && String(model).trim()) p.setProperty('AI_MODEL', String(model).trim());
  addLog_(currentUser, 'AI Config Updated', 'model → ' + aiCfg_().model); // never log the key
  return ok_({ message: 'AI settings saved!', model: aiCfg_().model, hasKey: !!aiCfg_().key });
}

// compact plain-text snapshot of the caller's OWN scope — the model's single source of truth
var aiContext_ = function(user) {
  var role = userRole_(user), all = scopeAll_(role), me = user, now = new Date();
  var cap = function(arr, n){ return arr.length > n ? arr.slice(0, n) : arr; };
  var L = ['Today: ' + ymd_(nowIso_()) + ' · Viewer: ' + user + ' (' + role + ') · Scope: ' + (all ? 'agency-wide' : 'own records only')];
  var props = JDB.readAll(SHEETS.PROPERTIES).filter(function(p){ return !p.deleted; });
  var pById = {}; props.forEach(function(p){ pById[p.id] = p; });
  var leads = JDB.readAll(SHEETS.LEADS).filter(function(l){ return !l.deleted && (all || l.assignedAgent === me); });
  var deals = JDB.readAll(SHEETS.DEALS).filter(function(x){ return !x.deleted && (all || x.agent === me); });
  var fus = JDB.readAll(SHEETS.FOLLOWUPS).filter(function(f){ return !f.deleted && f.status === 'Pending' && (all || f.assignedAgent === me); });
  var appts = JDB.readAll(SHEETS.APPOINTMENTS).filter(function(a){ return !a.deleted && (all || a.agent === me); });
  var tens = JDB.readAll(SHEETS.TENANCIES).filter(function(t){ var p = pById[t.propertyId]; return !t.deleted && (all || (p && p.assignedAgent === me)); });
  L.push('\nPROPERTIES (' + props.length + ' — agents see ALL inventory by design):');
  cap(props, 60).forEach(function(p) {
    L.push('- ' + p.referenceCode + ' ' + p.title + ' | ' + p.propertyType + '/' + p.listingType + ' | VND ' + p.price + ' | ' + p.status +
      ' | agent:' + (p.assignedAgent || '-') + ' | views:' + (p.viewsCount || 0) +
      (p.publishedAt ? ' | daysListed:' + Math.round((now - new Date(p.publishedAt)) / 864e5) : ''));
  });
  L.push('\nLEADS (' + leads.length + '):');
  cap(leads, 80).forEach(function(l) {
    L.push('- #' + l.id + ' ' + l.fullName + ' ' + l.phone + ' | ' + l.interestType + '/' + l.source + ' | ' + l.status +
      (l.budgetMax ? ' | budget:' + (l.budgetMin || 0) + '-' + l.budgetMax : '') + ' | agent:' + (l.assignedAgent || 'UNASSIGNED') +
      ((l.offers || []).length ? ' | offers:' + l.offers.map(function(o){ return o.amount + '(' + o.status + ')'; }).join(',') : '') +
      (l.status === 'Lost' && l.lostReason ? ' | lostReason:' + l.lostReason : ''));
  });
  L.push('\nDEALS (' + deals.length + '):');
  cap(deals, 50).forEach(function(x) {
    var paid = dealPaid_(x), p = pById[x.propertyId] || {};
    L.push('- #' + x.id + ' ' + (p.referenceCode || '') + ' | ' + x.dealType + ' | buyer:' + x.buyerName + ' | amount:' + x.dealAmount +
      ' paid:' + paid + ' balance:' + r2_(x.dealAmount - paid) + ' | commission:' + x.commissionAmt + ' agentShare:' + x.agentShareAmt +
      (x.status === 'Completed' ? (x.agentPaidAt ? '(paid out)' : '(share PAYABLE)') : '') + ' | ' + x.status + ' | agent:' + x.agent);
  });
  L.push('\nTENANCIES (' + tens.length + '):');
  cap(tens, 40).forEach(function(t) {
    var p = pById[t.propertyId] || {};
    var expected = t.status === 'Active' ? r2_(tenMonths_(t) * t.monthlyRent) : tenCollected_(t);
    L.push('- ' + (p.referenceCode || '') + ' tenant:' + t.tenantName + ' | rent:' + t.monthlyRent + '/mo dueDay:' + t.rentDueDay +
      ' | collected:' + tenCollected_(t) + ' arrears:' + Math.max(0, r2_(expected - tenCollected_(t))) + ' | ' + t.status +
      (t.endDate ? ' | ends:' + t.endDate : ''));
  });
  L.push('\nPENDING FOLLOW-UPS (' + fus.length + '):');
  cap(fus, 40).forEach(function(f) {
    L.push('- lead#' + f.leadId + ' [' + f.type + '] due:' + (f.dueAt || '-') + (f.dueAt && new Date(f.dueAt) < now ? ' OVERDUE' : '') +
      ' agent:' + f.assignedAgent + (f.notes ? ' | ' + String(f.notes).substr(0, 60) : ''));
  });
  var live = appts.filter(function(a){ return ['Scheduled','Confirmed'].indexOf(a.status) !== -1; });
  L.push('\nBOOKED VIEWINGS (' + live.length + '):');
  cap(live, 30).forEach(function(a) {
    var p = pById[a.propertyId] || {};
    L.push('- #' + a.id + ' lead#' + a.leadId + ' ' + (p.referenceCode || '') + ' at ' + String(a.scheduledAt).substr(0, 16) + ' | ' + a.status + ' | agent:' + a.agent);
  });
  return L.join('\n').substr(0, 24000); // hard cap — keeps prompts inside sane token budgets
};

function aiChat(history, currentUser) {
  try {
    if (!gate_(currentUser, 'ai', 'v')) return err_('Access denied');
    var cfg = aiCfg_();
    if (!cfg.key) return err_('No OpenAI API key set yet — an Admin can add one in Settings → AI Assistant.');
    var sys = 'You are RS Assistant, the in-app analyst for the RS Estates real-estate CRM. Answer ONLY from the CRM DATA below — it is the single source of truth. ' +
      'All amounts are VND (use Vietnamese short forms like 4,5 tỷ or 12 triệu where it reads better). Be concise and specific: cite records by reference code or #id. ' +
      'If the data does not contain the answer, say so plainly — never invent records or numbers.\n\n=== CRM DATA ===\n' + aiContext_(currentUser);
    var msgs = [{ role: 'system', content: sys }];
    (Array.isArray(history) ? history : []).slice(-12).forEach(function(m) { // last 12 turns, roles whitelisted, length-capped
      if (m && (m.role === 'user' || m.role === 'assistant') && m.content) msgs.push({ role: m.role, content: String(m.content).substr(0, 4000) });
    });
    if (msgs.length < 2) return err_('Ask a question first');
    var resp = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + cfg.key },
      payload: JSON.stringify({ model: cfg.model, messages: msgs }) // minimal payload — safe across model families
    });
    var code = resp.getResponseCode(), body = resp.getContentText();
    if (code !== 200) {
      var eMsg; try { eMsg = JSON.parse(body).error.message; } catch (e0) { eMsg = 'HTTP ' + code; }
      return err_('OpenAI error: ' + String(eMsg).substr(0, 300));
    }
    var out = JSON.parse(body);
    var reply = out.choices && out.choices[0] && out.choices[0].message ? out.choices[0].message.content : '';
    if (!reply) return err_('The model returned an empty response — try again.');
    var lastQ = msgs.filter(function(m){ return m.role === 'user'; }).pop();
    addLog_(currentUser, 'AI Chat', String(lastQ ? lastQ.content : '').substr(0, 80));
    return ok_({ reply: reply });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Brochure & share pack (server-rendered listing sheet) ==============
var brochureHtml_ = function(p, path, amen, appUrl) {
  var img = ((p.images || []).filter(function(x){ return x.isPrimary; })[0] || (p.images || [])[0] || {}).url || '';
  var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(appUrl + '?p=' + (p.slug || p.id));
  var money = function(n){ return Number(n || 0).toLocaleString('vi-VN') + ' ₫'; };
  var amens = (p.amenityIds || []).map(function(id){ return amen[id] && amen[id].name; }).filter(Boolean).join(' · ');
  return '<html><body style="font-family:Arial;margin:0;padding:24px;color:#222">' +
    '<div style="background:#001f3f;color:#fff;padding:16px 20px;border-radius:8px">' +
    '<div style="font-size:22px;font-weight:bold">' + p.title + '</div>' +
    '<div style="opacity:.8;font-size:13px">' + (p.referenceCode || '') + ' · ' + path(p.locationId) + '</div></div>' +
    (img ? '<img src="' + img + '" style="width:100%;max-height:340px;object-fit:cover;border-radius:8px;margin:14px 0"/>' : '') +
    '<table style="width:100%;font-size:14px;border-collapse:collapse">' +
    '<tr><td style="padding:6px 0"><b>' + p.listingType + ' — ' + money(p.price) + (p.listingType === 'Rent' ? ' / ' + (p.rentFrequency || 'Monthly') : '') + '</b></td>' +
    '<td style="text-align:right">' + p.propertyType + ' · ' + p.areaSize + ' ' + p.areaUnit +
    (p.bedrooms != null ? ' · ' + p.bedrooms + ' bed' : '') + (p.bathrooms != null ? ' · ' + p.bathrooms + ' bath' : '') + '</td></tr></table>' +
    '<p style="font-size:13px;line-height:1.5">' + String(p.description || '').substr(0, 900) + '</p>' +
    (amens ? '<p style="font-size:12px;color:#555"><b>Amenities:</b> ' + amens + '</p>' : '') +
    '<table style="width:100%;margin-top:18px"><tr>' +
    '<td style="font-size:12px;color:#555">RS Estates — verified agency inventory<br/>WhatsApp: +92 322 4083545<br/>Scan to view online →</td>' +
    '<td style="text-align:right"><img src="' + qr + '" width="110" height="110"/></td></tr></table>' +
    '</body></html>';
};

function brochurePdf(propertyId, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'v')) return err_('Access denied');
    var p = JDB.byId(SHEETS.PROPERTIES, propertyId);
    if (!p || p.deleted) return err_('Property not found');
    var locs = JDB.readAll(SHEETS.LOCATIONS), path = locPath_(locs);
    var amen = {}; JDB.readAll(SHEETS.AMENITIES).forEach(function(a){ amen[a.id] = { name: a.name }; });
    var url = ScriptApp.getService().getUrl() || '';
    var pdf = Utilities.newBlob(brochureHtml_(p, path, amen, url), 'text/html', 'b.html').getAs('application/pdf');
    addLog_(currentUser, 'Brochure Generated', p.referenceCode || '#' + propertyId);
    return ok_({ base64: Utilities.base64Encode(pdf.getBytes()), filename: (p.referenceCode || 'listing') + '.pdf' });
  } catch (e) { return err_('Error: ' + e); }
}

function emailPropertyPack(propertyId, toEmail, currentUser) {
  try {
    if (!gate_(currentUser, 'properties', 'v')) return err_('Access denied');
    var to = String(toEmail || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return err_('A valid email is required');
    var p = JDB.byId(SHEETS.PROPERTIES, propertyId);
    if (!p || p.deleted) return err_('Property not found');
    var locs = JDB.readAll(SHEETS.LOCATIONS), path = locPath_(locs);
    var amen = {}; JDB.readAll(SHEETS.AMENITIES).forEach(function(a){ amen[a.id] = { name: a.name }; });
    var url = ScriptApp.getService().getUrl() || '';
    MailApp.sendEmail({ to: to, subject: p.title + ' — ' + (p.referenceCode || 'RS Estates'),
      htmlBody: brochureHtml_(p, path, amen, url) + '<p style="font-family:Arial;font-size:12px"><a href="' + url + '?p=' + (p.slug || p.id) + '">View this listing online</a></p>' });
    addLog_(currentUser, 'Property Emailed', (p.referenceCode || '#' + propertyId) + ' → ' + to);
    return ok_({ message: 'Listing emailed to ' + to + '!' });
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Public Portal ==============
var pubVisible_ = function(p){ return !p.deleted && p.publishedAt && ['Available','Reserved'].indexOf(p.status) !== -1; };
// projection strips ownerName/ownerPhone/assignedAgent/createdBy — serializer, not the template
var pubProp_ = function(p, path, amen) {
  return { id: p.id, referenceCode: p.referenceCode, title: p.title, slug: p.slug, description: p.description,
    propertyType: p.propertyType, listingType: p.listingType, status: p.status, price: p.price, rentFrequency: p.rentFrequency,
    areaSize: p.areaSize, areaUnit: p.areaUnit, bedrooms: p.bedrooms, bathrooms: p.bathrooms,
    locationId: p.locationId, locationPath: path(p.locationId), address: p.address || '',
    latitude: p.latitude, longitude: p.longitude, isFeatured: p.isFeatured ? 1 : 0, viewsCount: p.viewsCount || 0,
    images: p.images || [], amenities: (p.amenityIds || []).map(function(id){ return amen[id]; }).filter(Boolean),
    publishedAt: p.publishedAt };
};

function getPublicPortal() { // one round-trip: visible listings + filter lookups
  try {
    var locs = JDB.readAll(SHEETS.LOCATIONS).filter(function(x){ return !x.deleted; }), path = locPath_(locs);
    var amenList = JDB.readAll(SHEETS.AMENITIES).filter(function(x){ return !x.deleted; });
    var amen = {}; amenList.forEach(function(a){ amen[a.id] = { name: a.name, icon: a.icon || '' }; });
    return ok_({
      properties: JDB.readAll(SHEETS.PROPERTIES).filter(pubVisible_).map(function(p){ return pubProp_(p, path, amen); }).reverse(),
      locations: locs.map(function(l){ return { id: l.id, parentId: l.parentId || null, name: l.name, level: l.level }; }),
      amenities: amenList.map(function(a){ return { id: a.id, name: a.name, icon: a.icon || '' }; })
    });
  } catch (e) { return err_('Error: ' + e); }
}

function publicViewProperty(id) { // detail-page hit -> views_count++ ("how is my listing performing?")
  try {
    var p = JDB.byId(SHEETS.PROPERTIES, id);
    if (!p || !pubVisible_(p)) return err_('Listing not found');
    JDB.increment(SHEETS.PROPERTIES, id, 'viewsCount'); // in-lock counter — concurrent hits never lose updates
    return ok_({});
  } catch (e) { return err_('Error: ' + e); }
}

// ============== Reminder Sweeps (idempotent — run setupTriggers() once from the editor) ==============
function sweepFollowUpReminders() {
  var now = new Date();
  var due = JDB.readAll(SHEETS.FOLLOWUPS).filter(function(f) {
    return !f.deleted && f.status === 'Pending' && !f.reminderSent && f.dueAt && new Date(f.dueAt) <= now;
  });
  if (!due.length) return 0;
  var emails = {}; userRows_().data.slice(1).forEach(function(r){ emails[r[U.NAME]] = r[U.EMAIL]; });
  var leads = {}; JDB.readAll(SHEETS.LEADS).forEach(function(l){ leads[l.id] = l; });
  var byAgent = {};
  due.forEach(function(f){ if (f.assignedAgent) (byAgent[f.assignedAgent] = byAgent[f.assignedAgent] || []).push(f); });
  Object.keys(byAgent).forEach(function(agent) {
    var to = emails[agent]; if (!to) return;
    var lines = byAgent[agent].map(function(f) {
      var l = leads[f.leadId] || {};
      return '- [' + f.type + '] ' + (l.fullName || 'Lead #' + f.leadId) + ' (' + (l.phone || '-') + ') due ' +
        String(f.dueAt).replace('T', ' ').substr(0, 16) + (f.notes ? ' — ' + f.notes : '');
    });
    try { MailApp.sendEmail(to, 'CRM: ' + lines.length + ' follow-up(s) due', 'Hello ' + agent + ',\n\nDue follow-ups:\n\n' + lines.join('\n') + '\n\n— Real Estate CRM'); } catch (e) {}
  });
  JDB.patchMany(SHEETS.FOLLOWUPS, due.map(function(f){ return f.id; }), { reminderSent: 1 }); // flag AFTER send -> re-run never double-fires
  addLog_('system', 'Reminder Sweep', 'Follow-ups: ' + due.length + ' reminder(s) sent');
  return due.length;
}

function sweepAppointmentReminders() { // T-24h viewing confirmations
  var now = Date.now(), horizon = now + 24 * 3600000;
  var due = JDB.readAll(SHEETS.APPOINTMENTS).filter(function(a) {
    if (a.deleted || a.reminderSent || ['Scheduled','Confirmed'].indexOf(a.status) === -1) return false;
    var t = new Date(a.scheduledAt).getTime();
    return t >= now && t <= horizon; // future-only — a stale past booking is a status problem, not a reminder
  });
  if (!due.length) return 0;
  var emails = {}; userRows_().data.slice(1).forEach(function(r){ emails[r[U.NAME]] = r[U.EMAIL]; });
  var leads = {}; JDB.readAll(SHEETS.LEADS).forEach(function(l){ leads[l.id] = l; });
  var props = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ props[p.id] = p; });
  due.forEach(function(a) {
    var to = emails[a.agent]; if (!to) return;
    var l = leads[a.leadId] || {}, p = props[a.propertyId] || {};
    var wa = l.phone ? 'https://wa.me/' + String(l.phone).replace(/\D/g, '') : '';
    try {
      MailApp.sendEmail(to, 'CRM: viewing in <24h — ' + (p.referenceCode || '#' + a.propertyId),
        'Hello ' + a.agent + ',\n\nViewing tomorrow:\n\nLead: ' + (l.fullName || '-') + ' (' + (l.phone || '-') + ')\nProperty: ' +
        (p.title || '-') + ' [' + (p.referenceCode || '') + ']\nWhen: ' + String(a.scheduledAt).replace('T', ' ').substr(0, 16) +
        ' (' + (a.durationMinutes || 30) + ' min)\n\nConfirm with the lead on WhatsApp: ' + wa + '\n\n— Real Estate CRM');
    } catch (e) {}
  });
  JDB.patchMany(SHEETS.APPOINTMENTS, due.map(function(a){ return a.id; }), { reminderSent: 1 });
  addLog_('system', 'Reminder Sweep', 'Appointments: ' + due.length + ' confirmation reminder(s) sent');
  return due.length;
}

// daily digest per agent: tenancies in arrears + contracts expiring within 30 days
function sweepRentReminders() {
  var props = {}; JDB.readAll(SHEETS.PROPERTIES).forEach(function(p){ props[p.id] = p; });
  var emails = {}; userRows_().data.slice(1).forEach(function(r){ emails[r[U.NAME]] = r[U.EMAIL]; });
  var now = new Date(), byAgent = {};
  JDB.readAll(SHEETS.TENANCIES).forEach(function(t) {
    if (t.deleted || t.status !== 'Active') return;
    var p = props[t.propertyId]; if (!p || !p.assignedAgent) return;
    var arrears = r2_(tenMonths_(t) * t.monthlyRent - tenCollected_(t));
    var dd = t.endDate ? (new Date(t.endDate) - now) / 864e5 : null;
    var lines = [];
    if (arrears > 0.01) lines.push('- ARREARS ' + arrears + ': ' + (p.referenceCode || '#' + t.propertyId) + ' · ' + t.tenantName + ' (' + t.tenantPhone + ')');
    if (dd !== null && dd >= 0 && dd <= 30) lines.push('- EXPIRES ' + t.endDate + ': ' + (p.referenceCode || '#' + t.propertyId) + ' · ' + t.tenantName + ' — renew?');
    if (lines.length) (byAgent[p.assignedAgent] = byAgent[p.assignedAgent] || []).push.apply(byAgent[p.assignedAgent], lines);
  });
  var n = 0;
  Object.keys(byAgent).forEach(function(a) {
    var to = emails[a]; if (!to) return;
    try { MailApp.sendEmail(to, 'CRM: rent & contract attention (' + byAgent[a].length + ')',
      'Hello ' + a + ',\n\n' + byAgent[a].join('\n') + '\n\n— Real Estate CRM'); n++; } catch (e) {}
  });
  if (n) addLog_('system', 'Rent Sweep', n + ' agent digest(s) sent');
  return n;
}

function setupTriggers() { // run ONCE from the Apps Script editor
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (['sweepFollowUpReminders', 'sweepAppointmentReminders', 'sweepRentReminders'].indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sweepFollowUpReminders').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('sweepAppointmentReminders').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('sweepRentReminders').timeBased().everyDays(1).atHour(9).create();
  return 'Triggers installed: hourly reminder sweeps + daily rent sweep';
}

// ============== Setup Demo Data Function ==============
// Single setup entry point — wipes ALL sheets and rebuilds fresh with demo data
// ONE-SHOT: after the first run it refuses (this fn is google.script.run-callable on a public portal —
// an anonymous visitor must never be able to nuke live data). To rebuild: delete the SETUP_DONE
// script property (Project Settings → Script properties) and run again from the editor.
function setupDemoData() {
  var sp = PropertiesService.getScriptProperties();
  if (sp.getProperty('SETUP_DONE') === '1') // guard outside try — throw must hit the editor log, not the catch
    throw new Error('Setup already ran. Delete the SETUP_DONE script property (Project Settings → Script properties) and run again to rebuild.');
  try {
    var ss = ss_();

    // temp sheet first — a spreadsheet must always keep >=1 sheet
    var temp = ss.insertSheet('__temp_' + new Date().getTime());
    ss.getSheets().forEach(function(sh){ if (sh.getSheetId() !== temp.getSheetId()) ss.deleteSheet(sh); });

    // reset JDB id counters — wiped sheets must restart at 1
    Object.keys(SHEETS).forEach(function(k){ sp.deleteProperty('JID_' + SHEETS[k]); });

    // ============== Users (classic row-per-record — the ONE exception) ==============
    var usersSheet = ss.insertSheet(USERS_SHEET);
    usersSheet.appendRow(['Username', 'Email', 'Password', 'Role', 'Status', 'ProfileImage', 'ThemeMode', 'CustomColors', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'MonthlyTarget']);
    usersSheet.getRange(1, 1, 1, 13).setBackground('#001f3f').setFontColor('white').setFontWeight('bold');
    var daysAgo = function(n, h){ return new Date(Date.now() - n * 864e5 + (h || 0) * 3600000).toISOString(); };
    var inDays  = function(n, h){ return new Date(Date.now() + n * 864e5 + (h || 0) * 3600000).toISOString(); };
    var demoUsers = [
      ['admin',    'admin@demo.com',    'admin123',   'Admin',   'Active'],
      ['manager1', 'manager1@demo.com', 'manager123', 'Manager', 'Active'],
      ['agent1',   'agent1@demo.com',   'agent123',   'Agent',   'Active'],
      ['agent2',   'agent2@demo.com',   'agent123',   'Agent',   'Active'],
      ['agent3',   'agent3@demo.com',   'agent123',   'Agent',   'Active'],
      ['agent4',   'agent4@demo.com',   'agent123',   'Agent',   'Inactive']
    ];
    usersSheet.getRange(2, 1, demoUsers.length, 13).setValues(demoUsers.map(function(u, i) {
      var ts = daysAgo(demoUsers.length - i + 20);
      return [u[0], u[1], u[2], u[3], u[4], DEFAULT_LOGO, 'light', '', ts, 'System', ts, 'System', u[3] === 'Agent' ? 30000000 : 0];
    }));

    // Roles (RBAC) — seeds Admin/Manager/Agent with the spec matrix
    ensureRbac_(ss);

    // ============== Locations (City → Area → Society) — ids 1..15 in array order ==============
    jdbBulkInsert_(SHEETS.LOCATIONS, [
      { name:'Lahore',         level:'City',    parentId:null, slug:'lahore',               created:daysAgo(20) },
      { name:'Karachi',        level:'City',    parentId:null, slug:'karachi',              created:daysAgo(20) },
      { name:'Islamabad',      level:'City',    parentId:null, slug:'islamabad',            created:daysAgo(20) },
      { name:'DHA Lahore',     level:'Area',    parentId:1,    slug:'dha-lahore',           created:daysAgo(20) },
      { name:'Bahria Town',    level:'Area',    parentId:1,    slug:'bahria-town',          created:daysAgo(20) },
      { name:'Gulberg',        level:'Area',    parentId:1,    slug:'gulberg',              created:daysAgo(20) },
      { name:'DHA Karachi',    level:'Area',    parentId:2,    slug:'dha-karachi',          created:daysAgo(19) },
      { name:'Clifton',        level:'Area',    parentId:2,    slug:'clifton',              created:daysAgo(19) },
      { name:'G-11',           level:'Area',    parentId:3,    slug:'g-11',                 created:daysAgo(19) },
      { name:'Bahria Enclave', level:'Area',    parentId:3,    slug:'bahria-enclave',       created:daysAgo(19) },
      { name:'Phase 5',        level:'Society', parentId:4,    slug:'dha-lahore-phase-5',   created:daysAgo(18) },
      { name:'Phase 6',        level:'Society', parentId:4,    slug:'dha-lahore-phase-6',   created:daysAgo(18) },
      { name:'Sector C',       level:'Society', parentId:5,    slug:'bahria-town-sector-c', created:daysAgo(18) },
      { name:'Phase 8',        level:'Society', parentId:7,    slug:'dha-karachi-phase-8',  created:daysAgo(18) },
      { name:'Block 4',        level:'Society', parentId:8,    slug:'clifton-block-4',      created:daysAgo(18) },
      { name:'Sector D',       level:'Society', parentId:5,    slug:'bahria-town-sector-d', created:daysAgo(17) },
      { name:'Sector E',       level:'Society', parentId:5,    slug:'bahria-town-sector-e', created:daysAgo(17) },
      { name:'Block 7',        level:'Society', parentId:8,    slug:'clifton-block-7',      created:daysAgo(17) },
      { name:'Phase 7',        level:'Society', parentId:4,    slug:'dha-lahore-phase-7',   created:daysAgo(16) },
      { name:'Sector B',       level:'Society', parentId:10,   slug:'bahria-enclave-sector-b', created:daysAgo(16) }
    ]);

    // ============== Amenities — ids 1..12 ==============
    jdbBulkInsert_(SHEETS.AMENITIES, [
      { name:'Electricity Backup', icon:'fa-bolt',               created:daysAgo(17) },
      { name:'Parking Space',      icon:'fa-car',                created:daysAgo(17) },
      { name:'Servant Quarter',    icon:'fa-user-tie',           created:daysAgo(17) },
      { name:'Garden / Lawn',      icon:'fa-tree',               created:daysAgo(17) },
      { name:'Swimming Pool',      icon:'fa-person-swimming',    created:daysAgo(17) },
      { name:'Security Staff',     icon:'fa-shield-halved',      created:daysAgo(17) },
      { name:'Elevator / Lift',    icon:'fa-elevator',           created:daysAgo(17) },
      { name:'Corner Plot',        icon:'fa-vector-square',      created:daysAgo(17) },
      { name:'Furnished',          icon:'fa-couch',              created:daysAgo(17) },
      { name:'Gas Connection',     icon:'fa-fire-flame-simple',  created:daysAgo(17) },
      { name:'Basement',           icon:'fa-stairs',             created:daysAgo(17) },
      { name:'Balcony',            icon:'fa-building',           created:daysAgo(17) },
      { name:'Water Boring',       icon:'fa-droplet',            created:daysAgo(16) },
      { name:'Solar Panels',       icon:'fa-solar-panel',        created:daysAgo(16) },
      { name:'Store Room',         icon:'fa-box',                created:daysAgo(16) },
      { name:'Study Room',         icon:'fa-book-open',          created:daysAgo(16) },
      { name:'Laundry Area',       icon:'fa-soap',               created:daysAgo(16) },
      { name:'Roof Terrace',       icon:'fa-sun',                created:daysAgo(16) },
      { name:'Home Theatre',       icon:'fa-film',               created:daysAgo(16) },
      { name:'Nearby Park',        icon:'fa-tree-city',          created:daysAgo(16) }
    ]);

    // ============== Properties — ids 1..12 (generic demo data, picsum placeholder images) ==============
    var img = function(seed){ return [
      { url:'https://picsum.photos/seed/' + seed + 'a/800/500', isPrimary:1, sortOrder:0 },
      { url:'https://picsum.photos/seed/' + seed + 'b/800/500', isPrimary:0, sortOrder:1 },
      { url:'https://picsum.photos/seed/' + seed + 'c/800/500', isPrimary:0, sortOrder:2 }
    ]; };
    jdbBulkInsert_(SHEETS.PROPERTIES, [
      { referenceCode:'RS-LAH-1001', title:'10 Marla Modern House Phase 5', slug:'10-marla-modern-house-phase-5-1',
        description:'Brand new double-storey house with imported fittings, solid wood doors and a landscaped lawn. Walking distance to the main park and commercial area.',
        propertyType:'House', listingType:'Sale', status:'Available', price:45000000, rentFrequency:'',
        areaSize:10, areaUnit:'Marla', bedrooms:4, bathrooms:5, locationId:11, address:'Street 12, Phase 5',
        latitude:31.4676, longitude:74.4107, ownerName:'Owner 1', ownerPhone:'03005000001',
        assignedAgent:'agent1', isFeatured:1, viewsCount:245, publishedAt:daysAgo(12), images:img('re1'), amenityIds:[1,2,4,6,10], createdBy:'admin', created:daysAgo(14) },
      { referenceCode:'RS-LAH-1002', title:'5 Marla Brand New House Phase 6', slug:'5-marla-brand-new-house-phase-6-2',
        description:'Stylish 5 marla house on a 40ft road — ideal first home with modern kitchen and 3 spacious bedrooms.',
        propertyType:'House', listingType:'Sale', status:'Available', price:27500000, rentFrequency:'',
        areaSize:5, areaUnit:'Marla', bedrooms:3, bathrooms:4, locationId:12, address:'Block C, Phase 6',
        latitude:31.4832, longitude:74.4421, ownerName:'Owner 2', ownerPhone:'03005000002',
        assignedAgent:'agent2', isFeatured:1, viewsCount:189, publishedAt:daysAgo(11), images:img('re2'), amenityIds:[1,2,10], createdBy:'manager1', created:daysAgo(13) },
      { referenceCode:'RS-LAH-1003', title:'1 Kanal Luxury Villa Sector C', slug:'1-kanal-luxury-villa-sector-c-3',
        description:'Designer villa with swimming pool, home theatre, basement and servant quarters. Facing park, fully furnished.',
        propertyType:'House', listingType:'Sale', status:'Reserved', price:82500000, rentFrequency:'',
        areaSize:1, areaUnit:'Kanal', bedrooms:5, bathrooms:6, locationId:13, address:'Sector C, Main Boulevard',
        latitude:31.3684, longitude:74.1801, ownerName:'Owner 3', ownerPhone:'03005000003',
        assignedAgent:'agent1', isFeatured:0, viewsCount:312, publishedAt:daysAgo(10), images:img('re3'), amenityIds:[1,2,3,4,5,6,9,11], createdBy:'admin', created:daysAgo(12) },
      { referenceCode:'RS-LAH-1004', title:'2 Bed Apartment Gulberg', slug:'2-bed-apartment-gulberg-4',
        description:'Well-maintained apartment near Main Market with lift, standby generator and 24/7 security.',
        propertyType:'Flat', listingType:'Rent', status:'Available', price:125000, rentFrequency:'Monthly',
        areaSize:1200, areaUnit:'Sq Ft', bedrooms:2, bathrooms:2, locationId:6, address:'Main Market vicinity',
        latitude:31.5102, longitude:74.3441, ownerName:'Owner 4', ownerPhone:'03005000004',
        assignedAgent:'agent3', isFeatured:0, viewsCount:98, publishedAt:daysAgo(9), images:img('re4'), amenityIds:[1,2,6,7], createdBy:'manager1', created:daysAgo(10) },
      { referenceCode:'RS-KAR-1005', title:'500 Sq Yd Bungalow Phase 8', slug:'500-sq-yd-bungalow-phase-8-5',
        description:'Owner-built bungalow with basement, roof-top terrace and separate servant block. Prime Phase 8 location.',
        propertyType:'House', listingType:'Sale', status:'Available', price:95000000, rentFrequency:'',
        areaSize:500, areaUnit:'Sq Yd', bedrooms:5, bathrooms:5, locationId:14, address:'Phase 8, near park',
        latitude:24.7896, longitude:67.1215, ownerName:'Owner 5', ownerPhone:'03005000005',
        assignedAgent:'agent2', isFeatured:1, viewsCount:421, publishedAt:daysAgo(8), images:img('re5'), amenityIds:[1,2,3,4,6,11], createdBy:'admin', created:daysAgo(9) },
      { referenceCode:'RS-KAR-1006', title:'3 Bed Sea View Apartment Block 4', slug:'3-bed-sea-view-apartment-block-4-6',
        description:'High-floor apartment with open sea view, gym and community pool. Fully furnished, ready to move.',
        propertyType:'Flat', listingType:'Rent', status:'Available', price:185000, rentFrequency:'Monthly',
        areaSize:2100, areaUnit:'Sq Ft', bedrooms:3, bathrooms:3, locationId:15, address:'Block 4, seafront tower',
        latitude:24.8138, longitude:67.0300, ownerName:'Owner 6', ownerPhone:'03005000006',
        assignedAgent:'agent3', isFeatured:0, viewsCount:156, publishedAt:daysAgo(7), images:img('re6'), amenityIds:[1,2,5,6,7,9,12], createdBy:'manager1', created:daysAgo(8) },
      { referenceCode:'RS-ISL-1007', title:'10 Marla Double Storey G-11', slug:'10-marla-double-storey-g-11-7',
        description:'Solid construction near Markaz — was live, owner paused the sale (withdrawn from portal).',
        propertyType:'House', listingType:'Sale', status:'Withdrawn', price:52500000, rentFrequency:'',
        areaSize:10, areaUnit:'Marla', bedrooms:5, bathrooms:4, locationId:9, address:'G-11/3',
        latitude:33.6693, longitude:72.9971, ownerName:'Owner 7', ownerPhone:'03005000007',
        assignedAgent:'agent1', isFeatured:0, viewsCount:134, publishedAt:daysAgo(7), images:img('re7'), amenityIds:[1,2,10], createdBy:'admin', created:daysAgo(8) },
      { referenceCode:'RS-ISL-1008', title:'5 Marla Plot Bahria Enclave', slug:'5-marla-plot-bahria-enclave-8',
        description:'Level, possession-ready plot on a 30ft road — all dues clear, ideal for immediate construction.',
        propertyType:'Plot', listingType:'Sale', status:'Reserved', price:9800000, rentFrequency:'',
        areaSize:5, areaUnit:'Marla', bedrooms:null, bathrooms:null, locationId:10, address:'Sector A',
        latitude:33.6844, longitude:73.1338, ownerName:'Owner 8', ownerPhone:'03005000008',
        assignedAgent:'agent2', isFeatured:0, viewsCount:87, publishedAt:daysAgo(6), images:img('re8'), amenityIds:[8], createdBy:'manager1', created:daysAgo(7) },
      { referenceCode:'RS-LAH-1009', title:'Commercial Shop Gulberg Main Boulevard', slug:'commercial-shop-gulberg-main-boulevard-9',
        description:'Ground-floor shop with wide frontage on the main boulevard — high footfall, ideal for retail brands.',
        propertyType:'Shop', listingType:'Rent', status:'Rented', price:350000, rentFrequency:'Monthly',
        areaSize:800, areaUnit:'Sq Ft', bedrooms:null, bathrooms:1, locationId:6, address:'Main Boulevard',
        latitude:31.5152, longitude:74.3481, ownerName:'Owner 9', ownerPhone:'03005000009',
        assignedAgent:'agent3', isFeatured:0, viewsCount:76, publishedAt:daysAgo(5), images:img('re9'), amenityIds:[1,6], createdBy:'admin', created:daysAgo(6) },
      { referenceCode:'RS-LAH-1010', title:'Upper Portion 10 Marla Phase 5', slug:'upper-portion-10-marla-phase-5-10',
        description:'Separate-entrance upper portion with 3 beds and servant room. Rented out via the CRM pipeline.',
        propertyType:'Upper Portion', listingType:'Rent', status:'Rented', price:95000, rentFrequency:'Monthly',
        areaSize:10, areaUnit:'Marla', bedrooms:3, bathrooms:3, locationId:11, address:'Street 9, Phase 5',
        latitude:31.4659, longitude:74.4090, ownerName:'Owner 10', ownerPhone:'03005000010',
        assignedAgent:'agent1', isFeatured:0, viewsCount:203, publishedAt:daysAgo(13), images:img('re10'), amenityIds:[1,2,10], createdBy:'manager1', created:daysAgo(14) },
      { referenceCode:'RS-KAR-1011', title:'1 Kanal House DHA Karachi', slug:'1-kanal-house-dha-karachi-11',
        description:'Architect-designed family home, sold through the agency — kept for record and reporting.',
        propertyType:'House', listingType:'Sale', status:'Sold', price:110000000, rentFrequency:'',
        areaSize:1, areaUnit:'Kanal', bedrooms:6, bathrooms:6, locationId:14, address:'Phase 8',
        latitude:24.7910, longitude:67.1189, ownerName:'Owner 11', ownerPhone:'03005000011',
        assignedAgent:'agent2', isFeatured:0, viewsCount:385, publishedAt:daysAgo(15), images:img('re11'), amenityIds:[1,2,3,4,6], createdBy:'admin', created:daysAgo(16) },
      { referenceCode:'RS-LAH-1012', title:'8 Marla House Bahria Sector C', slug:'8-marla-house-bahria-sector-c-12',
        description:'Listing being prepared — photos and owner documents pending. Not yet on the public portal.',
        propertyType:'House', listingType:'Sale', status:'Draft', price:31000000, rentFrequency:'',
        areaSize:8, areaUnit:'Marla', bedrooms:4, bathrooms:4, locationId:13, address:'Sector C',
        latitude:31.3702, longitude:74.1855, ownerName:'Owner 12', ownerPhone:'03005000012',
        assignedAgent:'agent3', isFeatured:0, viewsCount:0, publishedAt:null, images:img('re12'), amenityIds:[1,2], createdBy:'agent3', created:daysAgo(1) },
      { referenceCode:'RS-LAH-1013', title:'7 Marla House Phase 6', slug:'7-marla-house-phase-6-13',
        description:'Well-built family home on a quiet street — solar-ready wiring and a small lawn at the back.',
        propertyType:'House', listingType:'Sale', status:'Available', price:33500000, rentFrequency:'',
        areaSize:7, areaUnit:'Marla', bedrooms:4, bathrooms:4, locationId:12, address:'Street 5, Phase 6',
        latitude:null, longitude:null, ownerName:'Owner 13', ownerPhone:'03005000013',
        assignedAgent:'agent1', isFeatured:0, viewsCount:64, publishedAt:daysAgo(5), images:img('re13'), amenityIds:[1,2,10,14], createdBy:'agent1', created:daysAgo(6) },
      { referenceCode:'RS-KAR-1014', title:'2 Bed Apartment Block 7', slug:'2-bed-apartment-block-7-14',
        description:'Mid-floor apartment with lift access and standby power — walking distance to the park.',
        propertyType:'Flat', listingType:'Rent', status:'Available', price:95000, rentFrequency:'Monthly',
        areaSize:1100, areaUnit:'Sq Ft', bedrooms:2, bathrooms:2, locationId:18, address:'Block 7',
        latitude:null, longitude:null, ownerName:'Owner 14', ownerPhone:'03005000014',
        assignedAgent:'agent2', isFeatured:0, viewsCount:41, publishedAt:daysAgo(5), images:img('re14'), amenityIds:[1,6,7], createdBy:'agent2', created:daysAgo(5) },
      { referenceCode:'RS-ISL-1015', title:'8 Marla Plot Sector B', slug:'8-marla-plot-sector-b-15',
        description:'Level plot near the main gate — all development charges paid, ready for possession.',
        propertyType:'Plot', listingType:'Sale', status:'Available', price:12500000, rentFrequency:'',
        areaSize:8, areaUnit:'Marla', bedrooms:null, bathrooms:null, locationId:20, address:'Sector B',
        latitude:null, longitude:null, ownerName:'Owner 15', ownerPhone:'03005000015',
        assignedAgent:'agent3', isFeatured:0, viewsCount:33, publishedAt:daysAgo(4), images:img('re15'), amenityIds:[8], createdBy:'agent3', created:daysAgo(4) },
      { referenceCode:'RS-LAH-1016', title:'Office Floor Gulberg Boulevard', slug:'office-floor-gulberg-boulevard-16',
        description:'Open-plan office floor with dedicated parking and backup power — ideal for a software house.',
        propertyType:'Office', listingType:'Rent', status:'Available', price:275000, rentFrequency:'Monthly',
        areaSize:2400, areaUnit:'Sq Ft', bedrooms:null, bathrooms:2, locationId:6, address:'Main Boulevard',
        latitude:null, longitude:null, ownerName:'Owner 16', ownerPhone:'03005000016',
        assignedAgent:'agent2', isFeatured:0, viewsCount:58, publishedAt:daysAgo(4), images:img('re16'), amenityIds:[1,6,7,15], createdBy:'manager1', created:daysAgo(4) },
      { referenceCode:'RS-LAH-1017', title:'5 Marla House Phase 7', slug:'5-marla-house-phase-7-17',
        description:'Compact double-storey sold through the agency — retained for records and reporting.',
        propertyType:'House', listingType:'Sale', status:'Sold', price:29500000, rentFrequency:'',
        areaSize:5, areaUnit:'Marla', bedrooms:3, bathrooms:3, locationId:19, address:'Phase 7',
        latitude:null, longitude:null, ownerName:'Owner 17', ownerPhone:'03005000017',
        assignedAgent:'agent3', isFeatured:0, viewsCount:210, publishedAt:daysAgo(24), images:img('re17'), amenityIds:[1,2], createdBy:'agent3', created:daysAgo(25) },
      { referenceCode:'RS-KAR-1018', title:'300 Sq Yd House Phase 8', slug:'300-sq-yd-house-phase-8-18',
        description:'Corner house with a sea-breeze terrace — recently renovated kitchen and bathrooms.',
        propertyType:'House', listingType:'Sale', status:'Available', price:65000000, rentFrequency:'',
        areaSize:300, areaUnit:'Sq Yd', bedrooms:4, bathrooms:5, locationId:14, address:'Phase 8',
        latitude:null, longitude:null, ownerName:'Owner 18', ownerPhone:'03005000018',
        assignedAgent:'agent2', isFeatured:1, viewsCount:149, publishedAt:daysAgo(3), images:img('re18'), amenityIds:[1,2,4,6,18], createdBy:'agent2', created:daysAgo(3) },
      { referenceCode:'RS-LAH-1019', title:'1 Bed Studio Gulberg', slug:'1-bed-studio-gulberg-19',
        description:'Furnished studio near the commercial strip — let through the CRM pipeline.',
        propertyType:'Flat', listingType:'Rent', status:'Rented', price:65000, rentFrequency:'Monthly',
        areaSize:550, areaUnit:'Sq Ft', bedrooms:1, bathrooms:1, locationId:6, address:'Commercial strip',
        latitude:null, longitude:null, ownerName:'Owner 19', ownerPhone:'03005000019',
        assignedAgent:'agent1', isFeatured:0, viewsCount:88, publishedAt:daysAgo(55), images:img('re19'), amenityIds:[1,7,9], createdBy:'agent1', created:daysAgo(56) },
      { referenceCode:'RS-ISL-1020', title:'Farm House Sector B', slug:'farm-house-sector-b-20',
        description:'4 kanal farm house with lawns, pool and staff quarters — event-ready with ample parking.',
        propertyType:'Farm House', listingType:'Sale', status:'Available', price:145000000, rentFrequency:'',
        areaSize:4, areaUnit:'Kanal', bedrooms:6, bathrooms:7, locationId:20, address:'Sector B',
        latitude:null, longitude:null, ownerName:'Owner 20', ownerPhone:'03005000020',
        assignedAgent:'agent3', isFeatured:0, viewsCount:176, publishedAt:daysAgo(2), images:img('re20'), amenityIds:[1,2,3,4,5,6], createdBy:'admin', created:daysAgo(2) }
    ]);

    // ============== Leads — ids 1..10 (2 unassigned public web leads) ==============
    jdbBulkInsert_(SHEETS.LEADS, [
      { fullName:'Lead 1',    phone:'03001000001', email:'lead1@demo.com',  source:'Website',    interestType:'Buy',
        propertyId:1, preferredLocationId:11, budgetMin:40000000, budgetMax:50000000, message:'Interested in the Phase 5 house — is the price negotiable?',
        status:'Negotiating', lostReason:'', assignedAgent:'agent1', createdBy:'', created:daysAgo(10),
        offers:[{ id:1, date:daysAgo(4), amount:42000000, by:'Buyer', status:'Countered', notes:'Opening offer after first viewing', addedBy:'agent1' },
                { id:2, date:daysAgo(2), amount:43500000, by:'Seller', status:'Open', notes:'Owner counter — final offer', addedBy:'agent1' }] },
      { fullName:'Lead 2',    phone:'03001000002', email:'lead2@demo.com',   source:'WhatsApp',   interestType:'Rent',
        propertyId:4, preferredLocationId:6, budgetMin:100000, budgetMax:140000, message:'Looking for a 2-bed near Main Market.',
        status:'Viewing Scheduled', lostReason:'', assignedAgent:'agent3', createdBy:'manager1', created:daysAgo(6) },
      { fullName:'Lead 3', phone:'03001000003', email:'',                        source:'Facebook',   interestType:'Buy',
        propertyId:5, preferredLocationId:14, budgetMin:80000000, budgetMax:100000000, message:'Saw the Phase 8 bungalow ad.',
        status:'Qualified', lostReason:'', assignedAgent:'agent2', createdBy:'agent2', created:daysAgo(5) },
      { fullName:'Lead 4',   phone:'03001000004', email:'lead4@demo.com', source:'Phone Call', interestType:'Buy',
        propertyId:2, preferredLocationId:12, budgetMin:25000000, budgetMax:30000000, message:'',
        status:'Contacted', lostReason:'', assignedAgent:'agent2', createdBy:'agent2', created:daysAgo(4) },
      { fullName:'Lead 5',   phone:'03001000005', email:'lead5@demo.com',  source:'Referral',   interestType:'Buy',
        propertyId:3, preferredLocationId:13, budgetMin:75000000, budgetMax:90000000, message:'Referred by an existing client.',
        status:'Won', lostReason:'', assignedAgent:'agent1', createdBy:'manager1', created:daysAgo(12) },
      { fullName:'Lead 6',   phone:'03001000006', email:'',                        source:'Website',    interestType:'Rent',
        propertyId:6, preferredLocationId:15, budgetMin:120000, budgetMax:160000, message:'Sea view apartment enquiry.',
        status:'Lost', lostReason:'Budget too low — rented a smaller unit elsewhere', assignedAgent:'agent3', createdBy:'', created:daysAgo(9) },
      { fullName:'Lead 7',  phone:'03001000007', email:'lead7@demo.com',  source:'Referral',   interestType:'Sell',
        propertyId:null, preferredLocationId:4, budgetMin:null, budgetMax:null, message:'Wants to list a 1 kanal house in DHA.',
        status:'Contacted', lostReason:'', assignedAgent:'agent1', createdBy:'agent1', created:daysAgo(3) },
      { fullName:'Lead 8',    phone:'03001000008', email:'lead8@demo.com', source:'Website',    interestType:'Buy',
        propertyId:8, preferredLocationId:10, budgetMin:9000000, budgetMax:11000000, message:'Is the Bahria Enclave plot still available?',
        status:'New', lostReason:'', assignedAgent:'', createdBy:'', created:daysAgo(1) },
      { fullName:'Lead 9',    phone:'03001000009', email:'',                        source:'Website',    interestType:'Rent',
        propertyId:9, preferredLocationId:6, budgetMin:250000, budgetMax:400000, message:'Need a shop for a mobile accessories brand.',
        status:'New', lostReason:'', assignedAgent:'', createdBy:'', created:daysAgo(0, -3) },
      { fullName:'Lead 10',    phone:'03001000010', email:'lead10@demo.com',   source:'Walk-in',    interestType:'Buy',
        propertyId:null, preferredLocationId:11, budgetMin:35000000, budgetMax:48000000, message:'Walked into the Phase 5 office.',
        status:'New', lostReason:'', assignedAgent:'agent2', createdBy:'agent2', created:daysAgo(2) },
      { fullName:'Lead 11', phone:'03001000011', email:'lead11@demo.com', source:'Website',    interestType:'Buy',  propertyId:13, preferredLocationId:12,
        budgetMin:30000000, budgetMax:36000000, message:'Asked for a video tour of the Phase 6 house.', status:'New', lostReason:'', assignedAgent:'', createdBy:'', created:daysAgo(1) },
      { fullName:'Lead 12', phone:'03001000012', email:'',                source:'WhatsApp',   interestType:'Rent', propertyId:14, preferredLocationId:18,
        budgetMin:80000, budgetMax:100000, message:'Needs a 2-bed close to the park.', status:'Contacted', lostReason:'', assignedAgent:'agent2', createdBy:'agent2', created:daysAgo(2) },
      { fullName:'Lead 13', phone:'03001000013', email:'lead13@demo.com', source:'Facebook',   interestType:'Buy',  propertyId:15, preferredLocationId:20,
        budgetMin:10000000, budgetMax:13000000, message:'Investor — wants possession-ready plots only.', status:'Qualified', lostReason:'', assignedAgent:'agent3', createdBy:'agent3', created:daysAgo(3) },
      { fullName:'Lead 14', phone:'03001000014', email:'',                source:'Referral',   interestType:'Rent', propertyId:16, preferredLocationId:6,
        budgetMin:250000, budgetMax:300000, message:'Software house looking for an office floor.', status:'Viewing Scheduled', lostReason:'', assignedAgent:'agent2', createdBy:'manager1', created:daysAgo(2) },
      { fullName:'Lead 15', phone:'03001000015', email:'lead15@demo.com', source:'Website',    interestType:'Buy',  propertyId:18, preferredLocationId:14,
        budgetMin:55000000, budgetMax:62000000, message:'Liked the corner house listing.', status:'Negotiating', lostReason:'', assignedAgent:'agent2', createdBy:'', created:daysAgo(4),
        offers:[{ id:1, date:daysAgo(1), amount:58000000, by:'Buyer', status:'Open', notes:'Offer after the second visit', addedBy:'agent2' }] },
      { fullName:'Lead 16', phone:'03001000016', email:'',                source:'Walk-in',    interestType:'Sell', propertyId:null, preferredLocationId:4,
        budgetMin:null, budgetMax:null, message:'Wants to list a 10 marla house in DHA.', status:'New', lostReason:'', assignedAgent:'agent1', createdBy:'agent1', created:daysAgo(1) },
      { fullName:'Lead 17', phone:'03001000017', email:'',                source:'Phone Call', interestType:'Buy',  propertyId:20, preferredLocationId:10,
        budgetMin:120000000, budgetMax:150000000, message:'Farm house for family events.', status:'Contacted', lostReason:'', assignedAgent:'agent3', createdBy:'agent3', created:daysAgo(2) },
      { fullName:'Lead 18', phone:'03001000018', email:'',                source:'Website',    interestType:'Rent', propertyId:14, preferredLocationId:18,
        budgetMin:70000, budgetMax:90000, message:'', status:'Lost', lostReason:'Chose a unit in another block', assignedAgent:'agent2', createdBy:'', created:daysAgo(6) },
      { fullName:'Lead 19', phone:'03001000019', email:'lead19@demo.com', source:'Referral',   interestType:'Buy',  propertyId:2, preferredLocationId:12,
        budgetMin:25000000, budgetMax:30000000, message:'Referred by a past buyer.', status:'Qualified', lostReason:'', assignedAgent:'agent2', createdBy:'agent2', created:daysAgo(3) },
      { fullName:'Lead 20', phone:'03001000020', email:'',                source:'Website',    interestType:'Rent Out', propertyId:null, preferredLocationId:6,
        budgetMin:null, budgetMax:null, message:'Wants to rent out an office floor in Gulberg.', status:'New', lostReason:'', assignedAgent:'', createdBy:'', created:daysAgo(0, -4) }
    ]);

    // ============== Follow-Ups — ids 1..10 (overdue + due-today + logged activity mix) ==============
    jdbBulkInsert_(SHEETS.FOLLOWUPS, [
      { leadId:1,  assignedAgent:'agent1', type:'Call',     notes:'Discuss final offer — client hinted at 43M', dueAt:daysAgo(1, -2), status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'manager1', created:daysAgo(3) },
      { leadId:2,  assignedAgent:'agent3', type:'WhatsApp', notes:'Share viewing directions and parking info',  dueAt:inDays(0, 2),  status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent3',   created:daysAgo(2) },
      { leadId:3,  assignedAgent:'agent2', type:'Call',     notes:'Qualification follow-through — financing?',  dueAt:inDays(1),     status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent2',   created:daysAgo(2) },
      { leadId:4,  assignedAgent:'agent2', type:'Email',    notes:'Send Phase 6 payment plan PDF',              dueAt:inDays(2),     status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'manager1', created:daysAgo(1) },
      { leadId:5,  assignedAgent:'agent1', type:'Note',     notes:'Token money received — deal closed at 80M',  dueAt:null,          status:'Completed', completedAt:daysAgo(11), reminderSent:0, createdBy:'agent1',   created:daysAgo(11) },
      { leadId:6,  assignedAgent:'agent3', type:'Call',     notes:'Final call — went with a cheaper unit',      dueAt:null,          status:'Completed', completedAt:daysAgo(8),  reminderSent:0, createdBy:'agent3',   created:daysAgo(8) },
      { leadId:7,  assignedAgent:'agent1', type:'Meeting',  notes:'Visit seller property for valuation',        dueAt:inDays(3),     status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent1',   created:daysAgo(1) },
      { leadId:10, assignedAgent:'agent2', type:'Call',     notes:'First call after walk-in visit',             dueAt:daysAgo(1),    status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent2',   created:daysAgo(2) },
      { leadId:1,  assignedAgent:'agent1', type:'WhatsApp', notes:'Sent updated photos and floor plan',         dueAt:null,          status:'Completed', completedAt:daysAgo(3),  reminderSent:0, createdBy:'agent1',   created:daysAgo(3) },
      { leadId:4,  assignedAgent:'agent2', type:'Call',     notes:'Confirm interest before the weekend',        dueAt:inDays(0, 4),  status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent2',   created:daysAgo(1) },
      { leadId:11, assignedAgent:'manager1', type:'Call',    notes:'First contact — assign an agent after',      dueAt:inDays(0, 3),  status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'manager1', created:daysAgo(0, -2) },
      { leadId:12, assignedAgent:'agent2', type:'WhatsApp', notes:'Sent Block 7 apartment photos',              dueAt:null,          status:'Completed', completedAt:daysAgo(1),  reminderSent:0, createdBy:'agent2',   created:daysAgo(1) },
      { leadId:13, assignedAgent:'agent3', type:'Call',     notes:'Confirm plot size preference before visit',  dueAt:inDays(1, 2),  status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent3',   created:daysAgo(2) },
      { leadId:14, assignedAgent:'agent2', type:'Meeting',  notes:'Office floor walk-through with their CTO',   dueAt:inDays(2),     status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'manager1', created:daysAgo(1) },
      { leadId:15, assignedAgent:'agent2', type:'Call',     notes:'Chase the counter offer',                    dueAt:daysAgo(1, 3), status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent2',   created:daysAgo(2) },
      { leadId:16, assignedAgent:'agent1', type:'Meeting',  notes:'Valuation visit for the DHA house',          dueAt:inDays(1),     status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent1',   created:daysAgo(1) },
      { leadId:17, assignedAgent:'agent3', type:'Email',    notes:'Send farm house event-lawn photos',          dueAt:inDays(3),     status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent3',   created:daysAgo(1) },
      { leadId:18, assignedAgent:'agent2', type:'Note',     notes:'Final call — took a unit in another block',  dueAt:null,          status:'Completed', completedAt:daysAgo(6),  reminderSent:0, createdBy:'agent2',   created:daysAgo(6) },
      { leadId:19, assignedAgent:'agent2', type:'Call',     notes:'Arrange a Phase 6 house visit',              dueAt:inDays(0, 6),  status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'agent2',   created:daysAgo(1) },
      { leadId:20, assignedAgent:'manager1', type:'Call',   notes:'Collect office details for the listing',     dueAt:inDays(0, 5),  status:'Pending',   completedAt:null,        reminderSent:0, createdBy:'manager1', created:daysAgo(0, -3) }
    ]);

    // ============== Appointments — ids 1..8 (today + upcoming + history incl. No Show) ==============
    jdbBulkInsert_(SHEETS.APPOINTMENTS, [
      { leadId:2, propertyId:4, agent:'agent3', scheduledAt:inDays(0, 3),  durationMinutes:45, status:'Confirmed', notes:'Client will bring spouse',            cancellationReason:'', reminderSent:0, createdBy:'agent3',   created:daysAgo(2) },
      { leadId:1, propertyId:1, agent:'agent1', scheduledAt:inDays(1, 2),  durationMinutes:60, status:'Scheduled', notes:'Second visit — measurements',         cancellationReason:'', reminderSent:0, createdBy:'manager1', created:daysAgo(1) },
      { leadId:3, propertyId:5, agent:'agent2', scheduledAt:inDays(2),     durationMinutes:45, status:'Scheduled', notes:'',                                    cancellationReason:'', reminderSent:0, createdBy:'agent2',   created:daysAgo(1) },
      { leadId:10, propertyId:2, agent:'agent2', scheduledAt:inDays(4),    durationMinutes:30, status:'Scheduled', notes:'First viewing',                       cancellationReason:'', reminderSent:0, createdBy:'agent2',   created:daysAgo(1) },
      { leadId:5, propertyId:3, agent:'agent1', scheduledAt:daysAgo(12),   durationMinutes:60, status:'Completed', notes:'Client loved it — token same day',    cancellationReason:'', reminderSent:1, createdBy:'agent1',   created:daysAgo(13),
        interestLevel:'Hot', feedback:'Loved the pool and basement — paid token the same day' },
      { leadId:6, propertyId:6, agent:'agent3', scheduledAt:daysAgo(8),    durationMinutes:45, status:'No Show',   notes:'Did not answer calls at slot time',   cancellationReason:'', reminderSent:1, createdBy:'agent3',   created:daysAgo(9) },
      { leadId:4, propertyId:2, agent:'agent2', scheduledAt:daysAgo(5),    durationMinutes:30, status:'Cancelled', notes:'',                                    cancellationReason:'Client rescheduled — travelling', reminderSent:1, createdBy:'agent2', created:daysAgo(6) },
      { leadId:2, propertyId:6, agent:'agent3', scheduledAt:inDays(1, 5),  durationMinutes:45, status:'Scheduled', notes:'Backup option if Gulberg falls through', cancellationReason:'', reminderSent:0, createdBy:'agent3', created:daysAgo(0, -2) },
      { leadId:11, propertyId:13, agent:'manager1', scheduledAt:inDays(1, 3),  durationMinutes:45, status:'Scheduled', notes:'Unassigned lead — manager covering',   cancellationReason:'', reminderSent:0, createdBy:'manager1', created:daysAgo(0, -1) },
      { leadId:12, propertyId:14, agent:'agent2',   scheduledAt:inDays(1, 6),  durationMinutes:30, status:'Scheduled', notes:'',                                     cancellationReason:'', reminderSent:0, createdBy:'agent2',   created:daysAgo(1) },
      { leadId:13, propertyId:15, agent:'agent3',   scheduledAt:inDays(2, 2),  durationMinutes:30, status:'Scheduled', notes:'Meet at the society gate',             cancellationReason:'', reminderSent:0, createdBy:'agent3',   created:daysAgo(2) },
      { leadId:14, propertyId:16, agent:'agent2',   scheduledAt:inDays(2, 5),  durationMinutes:60, status:'Confirmed', notes:'CTO joining the walk-through',         cancellationReason:'', reminderSent:0, createdBy:'manager1', created:daysAgo(1) },
      { leadId:15, propertyId:18, agent:'agent2',   scheduledAt:daysAgo(3),    durationMinutes:60, status:'Completed', notes:'Second visit',                          cancellationReason:'', reminderSent:1, createdBy:'agent2',   created:daysAgo(4),
        interestLevel:'Hot', feedback:'Loved the corner location — moved to offers' },
      { leadId:17, propertyId:20, agent:'agent3',   scheduledAt:inDays(3, 4),  durationMinutes:60, status:'Scheduled', notes:'Family visit — weekend slot',          cancellationReason:'', reminderSent:0, createdBy:'agent3',   created:daysAgo(1) },
      { leadId:19, propertyId:2,  agent:'agent2',   scheduledAt:inDays(4, 2),  durationMinutes:45, status:'Scheduled', notes:'',                                     cancellationReason:'', reminderSent:0, createdBy:'agent2',   created:daysAgo(1) },
      { leadId:18, propertyId:14, agent:'agent2',   scheduledAt:daysAgo(7),    durationMinutes:30, status:'No Show',   notes:'Did not answer at slot time',          cancellationReason:'', reminderSent:1, createdBy:'agent2',   created:daysAgo(8) },
      { leadId:13, propertyId:8,  agent:'agent3',   scheduledAt:daysAgo(2),    durationMinutes:30, status:'Completed', notes:'',                                     cancellationReason:'', reminderSent:1, createdBy:'agent3',   created:daysAgo(3),
        interestLevel:'Warm', feedback:'Wants a bigger plot on the same road' },
      { leadId:20, propertyId:16, agent:'manager1', scheduledAt:inDays(1, 8),  durationMinutes:30, status:'Scheduled', notes:'Owner-side visit for the new listing', cancellationReason:'', reminderSent:0, createdBy:'manager1', created:daysAgo(0, -3) },
      { leadId:17, propertyId:5,  agent:'agent3',   scheduledAt:inDays(5, 3),  durationMinutes:45, status:'Scheduled', notes:'Backup option — bungalow',             cancellationReason:'', reminderSent:0, createdBy:'agent3',   created:daysAgo(0, -4) },
      { leadId:16, propertyId:1,  agent:'agent1',   scheduledAt:daysAgo(1, 2), durationMinutes:30, status:'Cancelled', notes:'',                                     cancellationReason:'Seller rescheduled the valuation', reminderSent:1, createdBy:'agent1', created:daysAgo(2) }
    ]);

    // ============== Owners — ids 1..20, one per property (registry phone matches each listing's owner phone) ==============
    var ownerNotes = { 1:'Sample note for Owner 1', 4:'Apartment landlord', 9:'Commercial shop owner', 10:'Rents out the upper portion', 19:'Studio landlord' };
    jdbBulkInsert_(SHEETS.OWNERS, Array.from({ length: 20 }, function(_, i) {
      var n = i + 1;
      return { name:'Owner ' + n, phone:'0300' + (5000000 + n), email:'owner' + n + '@demo.com', cnic:'35201' + (20000000 + n),
        address:'House ' + n + ', Street ' + (n % 9 + 1) + ', Demo City', notes: ownerNotes[n] || '',
        createdBy: n % 3 ? 'admin' : 'manager1', created: daysAgo(20 - (n % 10)) };
    }));

    // ============== Deals — 1 open (prop 3 Reserved) + 1 rent Completed (prop 10) + 1 sale Completed (prop 11) ==============
    jdbBulkInsert_(SHEETS.DEALS, [
      { dealType:'Sale', propertyId:3,  leadId:5,    buyerName:'Lead 5',    buyerPhone:'03001000005', agent:'agent1',
        dealAmount:80000000, commissionPct:1,   commissionAmt:800000,  agentSharePct:40, agentShareAmt:320000, agentPaidAt:null,
        tokenAmount:2000000, payments:[{ date:daysAgo(11), amount:2000000, method:'Bank Transfer', ref:'TT-4821', notes:'Token money', receivedBy:'agent1' }],
        status:'Agreement', closedAt:null, cancellationReason:'', notes:'Agreement signing this week', createdBy:'agent1', created:daysAgo(11) },
      { dealType:'Rent', propertyId:10, leadId:null, buyerName:'Tenant 1',     buyerPhone:'03007000001', agent:'agent1',
        dealAmount:95000, commissionPct:100, commissionAmt:95000, agentSharePct:40, agentShareAmt:38000, agentPaidAt:daysAgo(9),
        tokenAmount:0, payments:[{ date:daysAgo(12), amount:95000, method:'Cash', ref:'', notes:'Commission = first month', receivedBy:'agent1' }],
        status:'Completed', closedAt:daysAgo(12), cancellationReason:'', notes:'', createdBy:'agent1', created:daysAgo(12) },
      { dealType:'Sale', propertyId:11, leadId:null, buyerName:'Buyer 1', buyerPhone:'03006000001', agent:'agent2',
        dealAmount:110000000, commissionPct:1, commissionAmt:1100000, agentSharePct:40, agentShareAmt:440000, agentPaidAt:null,
        tokenAmount:5000000, payments:[{ date:daysAgo(16), amount:5000000, method:'Bank Transfer', ref:'TT-3310', notes:'Token money', receivedBy:'agent2' },
                                       { date:daysAgo(14), amount:105000000, method:'Bank Transfer', ref:'TT-3388', notes:'Balance on transfer', receivedBy:'agent2' }],
        status:'Completed', closedAt:daysAgo(14), cancellationReason:'', notes:'Transfer done at registrar office', createdBy:'agent2', created:daysAgo(16) },
      { dealType:'Rent', propertyId:6,  leadId:null, buyerName:'Buyer 2', buyerPhone:'03006000002', agent:'agent3',
        dealAmount:185000, commissionPct:100, commissionAmt:185000, agentSharePct:40, agentShareAmt:74000, agentPaidAt:null,
        tokenAmount:0, payments:[], status:'Cancelled', closedAt:null, cancellationReason:'Tenant backed out before agreement signing',
        notes:'', createdBy:'agent3', created:daysAgo(6) },
      { dealType:'Rent', propertyId:9,  leadId:null, buyerName:'Tenant 2', buyerPhone:'03007000002', agent:'agent3',
        dealAmount:350000, commissionPct:100, commissionAmt:350000, agentSharePct:40, agentShareAmt:140000, agentPaidAt:daysAgo(80),
        tokenAmount:0, payments:[{ date:daysAgo(95), amount:350000, method:'Bank Transfer', ref:'TT-5102', notes:'Commission = first month', receivedBy:'agent3' }],
        status:'Completed', closedAt:daysAgo(95), cancellationReason:'', notes:'Shop let on a 12-month contract', createdBy:'agent3', created:daysAgo(96) },
      { dealType:'Rent', propertyId:4,  leadId:null, buyerName:'Tenant 3', buyerPhone:'03007000003', agent:'agent3',
        dealAmount:125000, commissionPct:100, commissionAmt:125000, agentSharePct:40, agentShareAmt:50000, agentPaidAt:daysAgo(400),
        tokenAmount:0, payments:[{ date:daysAgo(430), amount:125000, method:'Cash', ref:'', notes:'Commission = first month', receivedBy:'agent3' }],
        status:'Completed', closedAt:daysAgo(429), cancellationReason:'', notes:'Tenancy ended after 13 months — unit re-listed', createdBy:'agent3', created:daysAgo(430) },
      { dealType:'Sale', propertyId:8,  leadId:null, buyerName:'Buyer 3', buyerPhone:'03006000003', agent:'agent2',
        dealAmount:9500000, commissionPct:1, commissionAmt:95000, agentSharePct:40, agentShareAmt:38000, agentPaidAt:null,
        tokenAmount:500000, payments:[{ date:daysAgo(2), amount:500000, method:'Cash', ref:'', notes:'Token money', receivedBy:'agent2' }],
        status:'Token', closedAt:null, cancellationReason:'', notes:'Balance on plot transfer at the society office', createdBy:'agent2', created:daysAgo(2) },
      { dealType:'Sale', propertyId:17, leadId:null, buyerName:'Buyer 4', buyerPhone:'03006000004', agent:'agent3',
        dealAmount:29000000, commissionPct:1, commissionAmt:290000, agentSharePct:40, agentShareAmt:116000, agentPaidAt:daysAgo(15),
        tokenAmount:1000000, payments:[{ date:daysAgo(24), amount:1000000, method:'Cash', ref:'', notes:'Token money', receivedBy:'agent3' },
                                       { date:daysAgo(20), amount:28000000, method:'Bank Transfer', ref:'TT-7714', notes:'Balance on transfer', receivedBy:'agent3' }],
        status:'Completed', closedAt:daysAgo(20), cancellationReason:'', notes:'', createdBy:'agent3', created:daysAgo(24) },
      { dealType:'Rent', propertyId:19, leadId:null, buyerName:'Tenant 4', buyerPhone:'03007000004', agent:'agent1',
        dealAmount:65000, commissionPct:100, commissionAmt:65000, agentSharePct:40, agentShareAmt:26000, agentPaidAt:daysAgo(45),
        tokenAmount:0, payments:[{ date:daysAgo(50), amount:65000, method:'Cash', ref:'', notes:'Commission = first month', receivedBy:'agent1' }],
        status:'Completed', closedAt:daysAgo(50), cancellationReason:'', notes:'Furnished studio let', createdBy:'agent1', created:daysAgo(50) }
    ]);

    // ============== Tenancies — Active w/ arrears · Active fully-paid · Ended w/ deposit refund ==============
    // fully-paid rent log up to today — mirrors tenMonths_, so this tenancy reads CLEAR whatever day setup runs
    var rentMonths = function(startIso, dueDay, amt, agent) {
      var out = [], s = new Date(startIso), now = new Date();
      var m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
      if (now.getDate() >= dueDay) m++;
      for (var i = 0; i < Math.max(0, m); i++) {
        var d = new Date(s.getFullYear(), s.getMonth() + i, 1);
        out.push({ month: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2), amount: amt,
          paidAt: new Date(d.getFullYear(), d.getMonth(), Math.min(28, dueDay + 1)).toISOString(),
          method: i % 3 === 0 ? 'Bank Transfer' : 'Cash', ref: '', receivedBy: agent });
      }
      return out;
    };
    jdbBulkInsert_(SHEETS.TENANCIES, [
      { propertyId:10, dealId:2, tenantName:'Tenant 1', tenantPhone:'03007000001',
        monthlyRent:95000, securityDeposit:190000, startDate:ymd_(daysAgo(40)), endDate:ymd_(inDays(20)), rentDueDay:5,
        status:'Active', rentLog:[{ month:ymd_(daysAgo(35)).substr(0, 7), amount:95000, paidAt:daysAgo(35), method:'Cash', ref:'', receivedBy:'agent1' }],
        renewals:[], maintenance:[{ id:1, date:ymd_(daysAgo(6)), issue:'AC service needed in master bedroom', status:'Open', cost:0, fixedAt:null, addedBy:'agent1' }],
        depositRefund:null, notes:'', createdBy:'agent1', created:daysAgo(40) },
      { propertyId:9, dealId:5, tenantName:'Tenant 2', tenantPhone:'03007000002',
        monthlyRent:350000, securityDeposit:700000, startDate:ymd_(daysAgo(95)), endDate:ymd_(inDays(270)), rentDueDay:1,
        status:'Active', rentLog:rentMonths(daysAgo(95), 1, 350000, 'agent3'),
        renewals:[], maintenance:[], depositRefund:null, notes:'Commercial shop — 12-month contract', createdBy:'agent3', created:daysAgo(95) },
      { propertyId:4, dealId:6, tenantName:'Tenant 3', tenantPhone:'03007000003',
        monthlyRent:137500, securityDeposit:250000, startDate:ymd_(daysAgo(430)), endDate:ymd_(daysAgo(30)), rentDueDay:5,
        status:'Ended', rentLog:rentMonths(daysAgo(430), 5, 125000, 'agent3').slice(0, 13),
        renewals:[{ date:daysAgo(65), oldRent:125000, newRent:137500, newEndDate:ymd_(inDays(300)), notes:'Annual renewal — 10% increment', byUser:'manager1' }],
        maintenance:[{ id:1, date:ymd_(daysAgo(200)), issue:'Kitchen tap leakage', status:'Fixed', cost:4500, fixedAt:daysAgo(198), addedBy:'agent3' }],
        depositRefund:{ amount:230000, deductions:20000, notes:'Paint touch-up and one broken window pane', refundedAt:daysAgo(28) },
        notes:'Tenant relocated to another city — unit re-listed', createdBy:'agent3', created:daysAgo(430) },
      { propertyId:19, dealId:9, tenantName:'Tenant 4', tenantPhone:'03007000004',
        monthlyRent:65000, securityDeposit:130000, startDate:ymd_(daysAgo(50)), endDate:ymd_(inDays(315)), rentDueDay:10,
        status:'Active', rentLog:rentMonths(daysAgo(50), 10, 65000, 'agent1'),
        renewals:[], maintenance:[], depositRefund:null, notes:'Furnished studio', createdBy:'agent1', created:daysAgo(50) }
    ]);

    // ============== Activity Logs (json-row like everything else) ==============
    jdbBulkInsert_(SHEETS.LOGS, [
      { user:'admin',    action:'System Setup',      details:'Demo data initialized',                         created:daysAgo(14) },
      { user:'admin',    action:'Property Added',    details:'RS-LAH-1001 10 Marla Modern House Phase 5',     created:daysAgo(14) },
      { user:'manager1', action:'Property Added',    details:'RS-LAH-1004 2 Bed Apartment Gulberg',           created:daysAgo(10) },
      { user:'public',   action:'Enquiry Received',  details:'Lead 1 · 03001000001 · property #1',      created:daysAgo(10) },
      { user:'manager1', action:'Lead Assigned',     details:'#1 → agent1',                                   created:daysAgo(10) },
      { user:'agent1',   action:'Lead Updated',      details:'#5 status → Won',                               created:daysAgo(11) },
      { user:'agent3',   action:'Lead Updated',      details:'#6 status → Lost',                              created:daysAgo(8) },
      { user:'agent2',   action:'Appointment Added', details:'#3 RS-KAR-1005 viewing scheduled',              created:daysAgo(1) },
      { user:'manager1', action:'Property Updated',  details:'RS-KAR-1011 status → Sold',                     created:daysAgo(2) },
      { user:'public',   action:'Enquiry Received',  details:'Lead 8 · 03001000008 · property #8',      created:daysAgo(1) },
      { user:'agent3',   action:'Deal Added',        details:'#8 RS-LAH-1017 Buyer 4 @ 29000000',       created:daysAgo(24) },
      { user:'agent3',   action:'Deal Updated',      details:'#8 → Completed',                          created:daysAgo(20) },
      { user:'agent1',   action:'Rent Collected',    details:'RS-LAH-1019 first month 65000',           created:daysAgo(49) },
      { user:'manager1', action:'Tenancy Renewed',   details:'#3 rent 125000 → 137500',                 created:daysAgo(65) },
      { user:'manager1', action:'Tenancy Ended',     details:'#3 refund 230000',                        created:daysAgo(28) },
      { user:'agent2',   action:'Offer Added',       details:'lead #15 Buyer 58000000',                 created:daysAgo(1) },
      { user:'public',   action:'Enquiry Received',  details:'Lead 11 · 03001000011 · property #13',    created:daysAgo(1) },
      { user:'agent2',   action:'Appointment Added', details:'#12 RS-LAH-1016 viewing scheduled',       created:daysAgo(1) },
      { user:'admin',    action:'Property Added',    details:'RS-ISL-1020 Farm House Sector B',         created:daysAgo(2) }
    ]);

    // drop the temp sheet now that the real sheets exist (guarded — a file can never end up sheet-less)
    if (ss.getSheets().length > 1) ss.deleteSheet(temp);
    usersSheet.getRange('A2:C').setNumberFormat('@'); // numeric-looking usernames/passwords stay text
    usersSheet.autoResizeColumns(1, 13);
    sp.setProperty('SETUP_DONE', '1'); // arm the one-shot guard
    addLog_('admin', 'System Setup', 'Real Estate CRM demo data rebuilt');

    Logger.log('Demo data setup complete'); // editor runs show no return value — log it
    return ok_({
      message: 'Demo data setup complete!',
      summary: { users: demoUsers.length, locations: 20, amenities: 20, properties: 20, leads: 20, followUps: 20, appointments: 20,
                 owners: 20, deals: 9, tenancies: 4, logs: 20 }
    });
  } catch (error) {
    try { // a failed run never strands the temp sheet — clean it if any real sheet already exists
      var tsheets = ss_().getSheets();
      tsheets.forEach(function(sh){ if (tsheets.length > 1 && sh.getName().indexOf('__temp_') === 0) ss_().deleteSheet(sh); });
    } catch (e2) {}
    throw error; // rethrow — silent failures were invisible in the editor
  }
}
