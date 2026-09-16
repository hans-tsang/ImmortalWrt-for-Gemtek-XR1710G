'use strict';
'require rpc';
'require ui';
'require view';

var callStatus = rpc.declare({
	object: 'luci.meshconf',
	method: 'getStatus'
});

var callScanPeers = rpc.declare({
	object: 'luci.meshconf',
	method: 'scanPeers'
});

var callApplyMesh = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyMesh',
	params: [ 'enabled', 'radio', 'mesh_id', 'encryption', 'key', 'bridge_lan' ]
});

var callApplyRoaming = rpc.declare({
	object: 'luci.meshconf',
	method: 'applyRoaming',
	params: [ 'enabled' ]
});

var callApplySync = rpc.declare({
	object: 'luci.meshconf',
	method: 'applySync',
	params: [ 'enabled', 'port', 'key', 'peers', 'keep_channel' ]
});

var callSyncPeer = rpc.declare({
	object: 'luci.meshconf',
	method: 'syncPeer',
	params: [ 'ip', 'direction' ]
});

/* ---------------------------------------------------------------------------
 * Shared design tokens.
 *
 * The canonical values live in docs/design-luci-vlan-ui.md and are mirrored in
 * the Switch view's stylesheet (view/network/switch-vlan.css, see
 * patches/feeds/luci/.../102-align-switch-vlan-design-tokens.patch) so that
 * pages editing the same model read as one product.
 *
 * Surfaces, text and borders map onto the LuCI theme variables instead of
 * being hardcoded: the theme owns its light/dark palette, and the previous
 * fixed palette plus a body-background luminance probe made this page ignore
 * it entirely. Themes that ship a dark mode also set
 * :root[data-darkmode="true"], which is the only extra hook the accents need.
 *
 * Sizes are em-based, never px: the LuCI theme sets the base font size, and
 * only a relative scale keeps the page in step with it.
 * ------------------------------------------------------------------------- */
var css = [
	'.meshconf-page{--ds-surface:var(--background-color-high,#fff);--ds-surface-sunken:var(--background-color-medium,#f6f8fa);--ds-border:var(--border-color-low,#d8dee4);--ds-text:var(--text-color-high,#1f2328);--ds-text-muted:var(--text-color-low,#5c6773);--ds-primary:var(--primary-color-high,#0969da);--ds-ok:#1a7f37;--ds-ok-tint:rgba(26,127,55,.08);--ds-ok-line:rgba(26,127,55,.35);--ds-warn:#bc4c00;--ds-warn-tint:rgba(188,76,0,.08);--ds-warn-line:rgba(188,76,0,.35);--ds-error:#cf222e;--ds-error-tint:rgba(207,34,46,.08);--ds-error-line:rgba(207,34,46,.40);--ds-info:#0969da;--ds-info-tint:rgba(9,105,218,.08);--ds-info-line:rgba(9,105,218,.35);--ds-focus-ring:rgba(9,105,218,.32);--ds-r-sm:4px;--ds-r-md:6px;--ds-r-lg:8px;--ds-r-pill:999px;--ds-sp-1:.25em;--ds-sp-2:.5em;--ds-sp-3:.75em;--ds-sp-4:1em;--ds-sp-5:1.5em;--ds-fs-xs:.8em;--ds-fs-sm:.88em;--ds-fs-base:1em;--ds-fs-lg:1.1em;--ds-fs-2xl:1.6em;--ds-shadow-1:0 1px 2px rgba(16,24,40,.04);line-height:1.5;color:var(--ds-text)}',
	'.meshconf-page :focus-visible{outline:2px solid var(--ds-primary);outline-offset:2px}',
	'.meshconf-page h2{margin:0 0 var(--ds-sp-1);font-size:var(--ds-fs-2xl);line-height:1.3;font-weight:650;color:var(--ds-text)}',
	'.meshconf-page .nm-lede{margin:0 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-section{margin:0 0 var(--ds-sp-5);padding:var(--ds-sp-4) var(--ds-sp-5);border:1px solid var(--ds-border);border-radius:var(--ds-r-lg);background:var(--ds-surface);box-shadow:var(--ds-shadow-1)}',
	'.nm-title{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-sp-3);margin:0;font-size:var(--ds-fs-lg);font-weight:650}',
	'.nm-title .nm-muted{font-size:var(--ds-fs-sm);font-weight:400}',
	'.nm-subtitle{margin:var(--ds-sp-1) 0 var(--ds-sp-4);color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}',
	'.nm-muted{color:var(--ds-text-muted)}',
	'.nm-hint{margin:var(--ds-sp-3) 0 0;font-size:var(--ds-fs-sm);line-height:1.6;color:var(--ds-text-muted)}',
	'',
	/* status pills */
	'.nm-status{display:flex;gap:var(--ds-sp-2);flex-wrap:wrap;align-items:center}',
	'.nm-pill{display:inline-flex;align-items:center;min-height:25px;padding:0 var(--ds-sp-3);border:1px solid var(--ds-border);border-radius:var(--ds-r-pill);background:var(--ds-surface-sunken);font-size:var(--ds-fs-sm);font-weight:600;white-space:nowrap}',
	'.nm-pill.ok{color:var(--ds-ok);border-color:var(--ds-ok-line);background:var(--ds-ok-tint)}',
	'.nm-pill.warn{color:var(--ds-warn);border-color:var(--ds-warn-line);background:var(--ds-warn-tint)}',
	'.nm-pill.info{color:var(--ds-info);border-color:var(--ds-info-line);background:var(--ds-info-tint)}',
	'.nm-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:var(--ds-sp-2);opacity:.85}',
	'.nm-infogrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:var(--ds-sp-2);margin-top:var(--ds-sp-3)}',
	'.nm-info{border:1px solid var(--ds-border);border-radius:var(--ds-r-md);background:var(--ds-surface-sunken);padding:var(--ds-sp-2) var(--ds-sp-3);min-width:0}',
	'.nm-info-label{font-size:var(--ds-fs-xs);font-weight:650;color:var(--ds-text-muted);margin-bottom:var(--ds-sp-1)}',
	'.nm-info-value{font-size:var(--ds-fs-lg);font-weight:650;word-break:break-all;line-height:1.35}',
	'.nm-info-sub{font-size:var(--ds-fs-xs);color:var(--ds-text-muted);margin-top:2px;word-break:break-all}',
	'',
	/* form fields */
	'.nm-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:var(--ds-sp-3);margin-top:var(--ds-sp-3)}',
	'.nm-field{display:flex;flex-direction:column;gap:var(--ds-sp-1);min-width:0}',
	'.nm-field>label{font-size:var(--ds-fs-sm);font-weight:600;color:var(--ds-text-muted)}',
	'.nm-field input,.nm-field select{min-height:34px;border:1px solid var(--ds-border);border-radius:var(--ds-r-sm);padding:var(--ds-sp-1) var(--ds-sp-2);background:var(--ds-surface);color:var(--ds-text);font-size:var(--ds-fs-base);box-sizing:border-box;width:100%;font-family:inherit}',
	'.nm-field input:focus,.nm-field select:focus{border-color:var(--ds-primary);box-shadow:0 0 0 3px var(--ds-focus-ring)}',
	'.nm-field input:focus-visible,.nm-field select:focus-visible{outline:2px solid var(--ds-primary);outline-offset:1px}',
	'.nm-field input:disabled,.nm-field select:disabled{opacity:.55;cursor:not-allowed}',
	'.nm-field.wide{grid-column:1 / -1}',
	'.nm-field.inline{flex-direction:row;align-items:center;gap:var(--ds-sp-2);min-height:34px}',
	'.nm-field.inline>label{font-size:var(--ds-fs-base);font-weight:400;color:var(--ds-text);cursor:pointer;display:inline-flex;align-items:center;gap:var(--ds-sp-2)}',
	'.nm-field.inline input[type=checkbox]{width:16px;height:16px;min-height:0;margin:0;accent-color:var(--ds-primary)}',
	'',
	/* action rows */
	'.nm-actions{display:flex;gap:var(--ds-sp-2);flex-wrap:wrap;margin-top:var(--ds-sp-4);padding-top:var(--ds-sp-3);border-top:1px solid var(--ds-border)}',
	'.nm-actions .cbi-button{min-height:34px}',
	'',
	/* peer / AP tables */
	'.nm-table{width:100%;border-collapse:collapse;margin-top:var(--ds-sp-3);font-size:var(--ds-fs-sm)}',
	'.nm-table th,.nm-table td{border:1px solid var(--ds-border);padding:var(--ds-sp-1) var(--ds-sp-2);text-align:left;vertical-align:top;word-break:break-all}',
	'.nm-table th{background:var(--ds-surface-sunken);font-weight:650;color:var(--ds-text-muted);white-space:nowrap}',
	'.nm-table td.nowrap{white-space:nowrap}',
	'.nm-table .nm-mono,.nm-table .nm-state{font-size:.95em}',
	'.nm-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--ds-fs-xs)}',
	'.nm-state{display:inline-flex;align-items:center;min-height:19px;padding:0 var(--ds-sp-2);border-radius:var(--ds-r-sm);font-size:var(--ds-fs-xs);font-weight:650;background:var(--ds-surface-sunken);color:var(--ds-text-muted)}',
	'.nm-state.estab{background:var(--ds-ok-tint);color:var(--ds-ok)}',
	'.nm-state.off{background:var(--ds-error-tint);color:var(--ds-error)}',
	'',
	/* banners */
	'.nm-banner{display:flex;gap:var(--ds-sp-2);align-items:flex-start;margin:var(--ds-sp-3) 0 0;padding:var(--ds-sp-2) var(--ds-sp-3);border:1px solid var(--ds-warn-line);border-radius:var(--ds-r-md);background:var(--ds-warn-tint);color:var(--ds-warn);font-size:var(--ds-fs-sm);line-height:1.6}',
	'.nm-banner.bad{border-color:var(--ds-error-line);background:var(--ds-error-tint);color:var(--ds-error)}',
	'.nm-banner.info{border-color:var(--ds-info-line);background:var(--ds-info-tint);color:var(--ds-info)}',
	'.nm-banner strong{display:block;margin-bottom:2px}',
	'.nm-banner.hidden{display:none}',
	'.nm-empty{display:flex;flex-direction:column;justify-content:center;min-height:90px;box-sizing:border-box;padding:var(--ds-sp-4);text-align:center;color:var(--ds-text-muted);border:1px dashed var(--ds-border);border-radius:var(--ds-r-md);margin-top:var(--ds-sp-3)}',
	'',
	/* One breakpoint, the same one the Switch view uses. */
	'@media(max-width:720px){.nm-title{flex-direction:column;align-items:flex-start;gap:var(--ds-sp-1)}}'
].join('\n');

/* Dark accents. LuCI themes that ship a dark mode set this attribute on :root;
 * surfaces and text already follow the theme variables, so only the semantic
 * accents have to be re-tuned for a dark background - and the tints get a
 * higher alpha, since a .08 wash is invisible on a dark surface. */
var darkVars = ':root[data-darkmode="true"]{--ds-ok:#4ac26b;--ds-ok-tint:rgba(74,194,107,.18);--ds-ok-line:rgba(74,194,107,.45);--ds-warn:#e3934a;--ds-warn-tint:rgba(227,147,74,.18);--ds-warn-line:rgba(227,147,74,.45);--ds-error:#f47067;--ds-error-tint:rgba(244,112,103,.18);--ds-error-line:rgba(244,112,103,.5);--ds-info:#4d9cf6;--ds-info-tint:rgba(77,156,246,.18);--ds-info-line:rgba(77,156,246,.45);--ds-focus-ring:rgba(77,156,246,.45);--ds-shadow-1:none}';

function injectCSS() {
	var el = document.getElementById('meshconf-css');
	if (!el) {
		el = document.createElement('style');
		el.id = 'meshconf-css';
		document.head.appendChild(el);
	}
	el.textContent = css + '\n' + darkVars;
}

/* ---------------------------------------------------------------------------
 * tiny DOM helpers
 * ------------------------------------------------------------------------- */
function checkbox(checked, onchange) {
	var el = E('input', { type: 'checkbox' });
	el.checked = !!checked;
	if (onchange) el.addEventListener('change', onchange);
	return el;
}

function textInput(value, opts) {
	opts = opts || {};
	var el = E('input', { type: opts.type || 'text', placeholder: opts.placeholder || '' });
	el.value = (value === null || value === undefined) ? '' : String(value);
	if (opts.onchange) el.addEventListener('change', opts.onchange);
	return el;
}

function select(options, value, onchange) {
	var el = E('select');
	options.forEach(function(o) {
		var opt = E('option', { value: o.value }, o.label);
		if (o.disabled) opt.disabled = true;
		el.appendChild(opt);
	});
	el.value = value;
	if (onchange) el.addEventListener('change', onchange);
	return el;
}

function field(label, control, wide) {
	return E('div', { 'class': 'nm-field' + (wide ? ' wide' : '') }, [
		E('label', {}, label),
		control
	]);
}

function inlineField(label, control) {
	return E('div', { 'class': 'nm-field inline' }, [ control, E('label', {}, label) ]);
}

function pill(state, text) {
	var el = E('span', { 'class': 'nm-pill ' + (state || '') }, [ E('i', { 'class': 'dot' }), document.createTextNode(text) ]);
	return el;
}

function info(label, value, sub) {
	return E('div', { 'class': 'nm-info' }, [
		E('div', { 'class': 'nm-info-label' }, label),
		E('div', { 'class': 'nm-info-value' }, value),
		sub ? E('div', { 'class': 'nm-info-sub' }, sub) : ''
	]);
}

function flag(on) {
	return E('span', { 'class': 'nm-state ' + (on ? 'estab' : 'off') }, on ? 'On' : 'Off');
}

function notify(msg, kind) {
	ui.addNotification(null, E('p', msg), kind || 'info');
}

/* ---------------------------------------------------------------------------
 * page state
 * ------------------------------------------------------------------------- */
var statusData = null;
var peerData = null;
var pageBody = null;

function refresh() {
	if (!pageBody) return Promise.resolve();
	pageBody.innerHTML = '';
	pageBody.appendChild(E('div', { 'class': 'nm-empty' }, 'Loading…'));

	return callStatus().then(function(res) {
		statusData = res || {};
		render();
	}, function(e) {
		pageBody.innerHTML = '';
		pageBody.appendChild(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, 'Cannot read status'),
			E('div', {}, e.message || 'The rpcd plugin did not respond (luci.meshconf).')
		]));
	});
}

function render() {
	if (!pageBody || !statusData) return;
	pageBody.innerHTML = '';
	pageBody.appendChild(renderStatus());
	pageBody.appendChild(renderMesh());
	pageBody.appendChild(renderSync());
	pageBody.appendChild(renderRoaming());
}

function withButton(btn, busyLabel, fn) {
	var orig = btn.textContent;
	btn.disabled = true;
	btn.textContent = busyLabel;
	var done = function() {
		btn.disabled = false;
		btn.textContent = orig;
	};
	return fn().then(function(res) {
		done();
		if (!res || res.success === false) {
			notify((res && res.error) || 'Operation failed', 'danger');
			return res;
		}
		notify('Applied. The wireless configuration is reloading (takes a few seconds).', 'success');
		return refresh();
	}, function(e) {
		done();
		notify(e.message || 'Operation failed', 'danger');
	});
}

/* ---------------------------------------------------------------------------
 * status
 * ------------------------------------------------------------------------- */
function meshPill() {
	var m = statusData.mesh || {};
	if (!m.enabled) return pill('', 'Wireless mesh: disabled');
	if (m.state === 'up') return pill('ok', 'Wireless mesh: connected to ' + (m.peers || 0) + ' peers');
	if (m.state === 'waiting') return pill('warn', 'Wireless mesh: waiting for peers');
	return pill('warn', 'Wireless mesh: enabled but not up');
}

function roamPill() {
	var r = statusData.roaming || {};
	if (!r.enabled) return pill('', 'Roaming: disabled');
	return pill('ok', 'Roaming: enabled on ' + (r.ap_ready || 0) + '/' + (r.ap_total || 0) + ' SSIDs');
}

function syncPill() {
	var s = statusData.sync || {};
	if (!s.enabled) return pill('', 'Wired sync: disabled');
	if (!s.running) return pill('warn', 'Wired sync: service not running');
	return pill('ok', 'Wired sync: port ' + (s.port || '7761'));
}

function renderStatus() {
	var l = statusData.local || {};
	var m = statusData.mesh || {};
	var s = statusData.sync || {};

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, 'Local status'),
			E('span', { 'class': 'nm-muted' }, l.hostname || '')
		]),
		E('div', { 'class': 'nm-status', 'style': 'margin-top:var(--ds-sp-3)' }, [
			meshPill(), roamPill(), syncPill()
		]),
		E('div', { 'class': 'nm-infogrid' }, [
			info('Model', l.model || '-'),
			info('LAN IP', l.lan_ip || '-', l.mac || ''),
			info('Wireless config revision', E('span', { 'class': 'nm-mono' }, l.wifirev || '-'), 'Used to check whether two devices carry the same wireless settings'),
			info('Mesh interface', m.iface || '-', m.state === 'up' ? m.peers + ' peers' : (m.enabled ? 'No link established yet' : 'Not configured')),
			info('Sync key', s.key_set ? 'Set' : 'Not set', s.last_peer ? 'Last peer ' + s.last_peer : 'Never synced')
		])
	]);
}

/* ---------------------------------------------------------------------------
 * wireless 802.11s
 * ------------------------------------------------------------------------- */
function renderMesh() {
	var m = statusData.mesh || {};
	var radios = statusData.radios || [];

	var enabledBox = checkbox(m.enabled, function() {
		toggleMeshFields(enabledBox.checked);
	});

	var radioSel = select(radios.map(function(r) {
		var label = r.name + ' (' + (r.band || '?') + ', channel ' + (r.channel || 'auto') + ')';
		if (!r.mesh_capable) label += ' · no mesh support';
		return { value: r.name, label: label, disabled: !r.mesh_capable };
	}), m.radio || (radios.length ? radios[0].name : ''));

	var meshIdInput = textInput(m.mesh_id || 'XR1710G-Mesh');
	var encSel = select([
		{ value: 'sae', label: 'SAE (recommended)' },
		{ value: 'none', label: 'No encryption' }
	], m.encryption || 'sae', function() {
		keyField.style.display = (encSel.value === 'sae') ? '' : 'none';
	});
	var keyInput = textInput(m.key_set ? '' : '', { type: 'password', placeholder: m.key_set ? 'Leave empty to keep the current key' : 'At least 8 characters' });
	var keyField = field('Mesh key', keyInput);
	keyField.style.display = (m.encryption === 'none') ? 'none' : '';

	var bridgeBox = checkbox(m.bridge_lan !== false, function() {});

	function toggleMeshFields(on) {
		[ radioSel, meshIdInput, encSel, keyInput, bridgeBox ].forEach(function(el) {
			el.disabled = !on;
		});
	}
	toggleMeshFields(!!m.enabled);

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Save and apply');
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && !radioSel.value) {
			notify('Select a radio that supports mesh.', 'danger');
			return;
		}
		if (enabledBox.checked && !meshIdInput.value.trim()) {
			notify('Enter a Mesh ID; it must be identical on both devices.', 'danger');
			return;
		}
		withButton(saveBtn, 'Applying…', function() {
			return callApplyMesh(
				enabledBox.checked ? '1' : '0',
				radioSel.value,
				meshIdInput.value.trim(),
				encSel.value,
				keyInput.value,
				bridgeBox.checked ? '1' : '0'
			);
		});
	});

	var stopBtn = E('button', { 'class': 'cbi-button cbi-button-reset' }, 'Disable 802.11s');
	stopBtn.disabled = !m.enabled;
	stopBtn.addEventListener('click', function() {
		withButton(stopBtn, 'Disabling…', function() {
			return callApplyMesh('0', radioSel.value, meshIdInput.value.trim(), encSel.value, '', '1');
		});
	});

	var warn = '';
	if (!m.wpad_mesh) {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, 'wpad may not support mesh'),
			E('div', {}, '802.11s needs a hostapd build with mesh support (wpad-mesh-* or wpad-openssl). No mesh features were detected in /usr/sbin/hostapd, so the interface may fail to come up.')
		]);
	} else if (m.enabled && m.state === 'down') {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, 'Mesh interface did not come up'),
			E('div', {}, 'Make sure both devices use exactly the same Mesh ID, encryption and key, and that the selected radio is enabled.')
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, 'Wireless mesh (802.11s)'),
			E('span', { 'class': 'nm-muted' }, m.enabled ? (m.state === 'up' ? 'Connected' : 'Configured') : 'Disabled')
		]),
		E('p', { 'class': 'nm-subtitle' }, 'Bring up an 802.11s mesh interface on the selected radio and bridge it into the LAN, so both devices share one layer 2 network. Native 802.11s, no batman-adv required.'),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Enable 802.11s mesh', enabledBox) ]),
			field('Radio', radioSel),
			field('Mesh ID', meshIdInput),
			field('Encryption', encSel),
			keyField,
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Bridge to LAN (both devices on the same layer 2)', bridgeBox) ])
		]),
		warn,
		E('div', { 'class': 'nm-actions' }, [ saveBtn, stopBtn ]),
		E('p', { 'class': 'nm-hint' }, 'Saving reloads the wireless stack, so connected clients drop briefly.')
	]);
}

/* ---------------------------------------------------------------------------
 * wired sync
 * ------------------------------------------------------------------------- */
function peerRow(p) {
	var selfRev = (statusData.local || {}).wifirev;
	var same = p.wifirev && p.wifirev === selfRev;
	var keep = (statusData.sync || {}).keep_channel !== false;
	var chNote = keep ? ' (the local channel is kept)' : ' (the channel is overwritten as well)';

	var pullBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, 'Pull to this device');
	pullBtn.addEventListener('click', function() {
		if (!confirm('This overwrites the local wireless configuration with the one from ' + p.ip + chNote + '. The current configuration is backed up to /etc/config/wireless.meshconf-bak. Continue?')) return;
		withButton(pullBtn, 'Pulling…', function() {
			return callSyncPeer(p.ip, 'pull');
		});
	});

	var pushBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Push to peer');
	pushBtn.addEventListener('click', function() {
		if (!confirm('This overwrites the wireless configuration on ' + p.ip + ' with the local one. The peer decides on its own whether to keep its channel. Continue?')) return;
		withButton(pushBtn, 'Pushing…', function() {
			return callSyncPeer(p.ip, 'push');
		});
	});

	return E('tr', {}, [
		E('td', {}, [
			E('div', {}, p.hostname || '-'),
			E('div', { 'class': 'nm-muted' }, p.model || '')
		]),
		E('td', { 'class': 'nowrap' }, E('span', { 'class': 'nm-mono' }, p.ip)),
		E('td', { 'class': 'nowrap' }, [
			E('span', { 'class': 'nm-mono' }, p.wifirev || '-'),
			same ? E('span', { 'class': 'nm-state estab', 'style': 'margin-left:var(--ds-sp-1)' }, 'Matches this device') : ''
		]),
		E('td', {}, flag(!!p.kvr)),
		E('td', { 'class': 'nowrap' }, p.source === 'manual' ? 'Added manually' : 'Layer 2 discovery'),
		E('td', { 'class': 'nowrap' }, [ pullBtn, ' ', pushBtn ])
	]);
}

function renderSync() {
	var s = statusData.sync || {};
	var enabledBox = checkbox(s.enabled, function() {
		[ portInput, keyInput, peersInput, keepBox ].forEach(function(el) { el.disabled = !enabledBox.checked; });
		scanBtn.disabled = !enabledBox.checked;
	});

	// Default on, including on a unit that has never been configured here:
	// inheriting a channel chosen for somebody else's surroundings is the
	// worse failure.
	var keepBox = checkbox(s.keep_channel !== false, function() {});

	var portInput = textInput(s.port || '7761', { type: 'number' });
	var keyInput = textInput(s.key || '', { type: 'text', placeholder: 'All devices must use the same key' });
	var peersInput = textInput(((s.peers) || []).join(', '), { placeholder: 'e.g. 192.168.2.1, 192.168.3.10' });

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Save and apply');
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && !keyInput.value.trim()) {
			notify('Set a shared key: it must be identical on every device, otherwise sync cannot work.', 'danger');
			return;
		}
		withButton(saveBtn, 'Saving…', function() {
			return callApplySync(enabledBox.checked ? '1' : '0', portInput.value.trim(), keyInput.value.trim(), peersInput.value, keepBox.checked ? '1' : '0');
		});
	});

	var scanBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, 'Scan LAN devices');
	scanBtn.addEventListener('click', function() {
		var self = scanBtn;
		var orig = self.textContent;
		self.disabled = true;
		self.textContent = 'Scanning…';
		callScanPeers().then(function(res) {
			self.disabled = false;
			self.textContent = orig;
			peerData = res || { peers: [] };
			render();
			var n = (peerData.peers || []).length;
			notify(n ? 'Found ' + n + ' devices.' : 'No other devices found: check that the peer has wired sync enabled, uses the same key and sits on the same LAN.', n ? 'success' : 'info');
		}, function(e) {
			self.disabled = false;
			self.textContent = orig;
			notify(e.message || 'Scan failed', 'danger');
		});
	});

	[ portInput, keyInput, peersInput, keepBox ].forEach(function(el) { el.disabled = !s.enabled; });
	scanBtn.disabled = !s.enabled;

	var peers = (peerData && peerData.peers) || [];
	var table = E('div', { 'class': 'nm-empty' }, 'Use "Scan LAN devices" to look for XR1710G units on the same LAN.');
	if (peers.length) {
		table = E('div', {}, [
			E('table', { 'class': 'nm-table' }, [
				E('thead', {}, E('tr', {}, [
					E('th', {}, 'Device'),
					E('th', {}, 'IP'),
					E('th', {}, 'Config revision'),
					E('th', {}, 'k/v/r'),
					E('th', {}, 'Source'),
					E('th', {}, 'Sync')
				])),
				E('tbody', {}, peers.map(peerRow))
			])
		]);
	}

	var warn = '';
	if (s.enabled && !s.running) {
		warn = E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, 'Sync service is not running'),
			E('div', {}, 'The service should start automatically after saving. If it stays down, check that socat is installed, since discovery depends on it.')
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, 'Wired sync (identical models)'),
			E('span', { 'class': 'nm-muted' }, s.enabled ? 'Enabled' : 'Disabled')
		]),
		E('p', { 'class': 'nm-subtitle' }, 'When the devices already share a LAN, use this one to align the others: neighbours are discovered by periodic broadcasts and /etc/config/wireless (SSID, key and k/v/r settings) is synced using the shared key.'),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Enable wired sync (also makes this device discoverable)', enabledBox) ]),
			field('Port', portInput),
			field('Shared key', keyInput),
			field('Manually added device IPs', peersInput, true),
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Keep the local channel when syncing', keepBox) ]),
			E('p', { 'class': 'nm-hint' }, 'Consider turning this off when the two APs are far apart.')
		]),
		warn,
		E('div', { 'class': 'nm-actions' }, [ saveBtn, scanBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, 'Syncing overwrites the whole /etc/config/wireless on the peer. When pulling, the local file is backed up as /etc/config/wireless.meshconf-bak. Devices that are not on the same layer 2 network belong in "Manually added device IPs". With "Keep the local channel" enabled, the receiving device restores its own channel on every radio - SSID, key and k/v/r are still synced, so roaming is unaffected.')
	]);
}

/* ---------------------------------------------------------------------------
 * 802.11k/v/r
 * ------------------------------------------------------------------------- */
function renderRoaming() {
	var r = statusData.roaming || {};
	var aps = statusData.aps || [];

	var onBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Enable k/v/r');
	onBtn.addEventListener('click', function() {
		withButton(onBtn, 'Enabling…', function() { return callApplyRoaming('1'); });
	});

	var offBtn = E('button', { 'class': 'cbi-button cbi-button-reset' }, 'Disable k/v/r');
	offBtn.addEventListener('click', function() {
		withButton(offBtn, 'Disabling…', function() { return callApplyRoaming('0'); });
	});

	var table = E('div', { 'class': 'nm-empty' }, 'There are no AP interfaces right now.');
	if (aps.length) {
		table = E('table', { 'class': 'nm-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', {}, 'SSID'),
				E('th', {}, 'Band'),
				E('th', {}, 'Network'),
				E('th', {}, 'K'),
				E('th', {}, 'V'),
				E('th', {}, 'R'),
				E('th', {}, 'MD')
			])),
			E('tbody', {}, aps.map(function(a) {
				return E('tr', {}, [
					E('td', {}, a.ssid || '-'),
					E('td', {}, a.band || '-'),
					E('td', {}, a.network || 'lan'),
					E('td', {}, flag(a.k)),
					E('td', {}, flag(a.v)),
					E('td', {}, flag(a.r)),
					E('td', {}, E('span', { 'class': 'nm-mono' }, a.md || '-'))
				]);
			}))
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, '802.11k/v/r roaming'),
			E('span', { 'class': 'nm-muted' }, (r.ap_ready || 0) + '/' + (r.ap_total || 0) + ' SSIDs enabled')
		]),
		E('p', { 'class': 'nm-subtitle' }, 'Write 802.11k (neighbour reports), 802.11v (BTM transitions) and 802.11r (fast roaming) settings to every AP interface. The mobility domain is derived from the network name, so the same network gets the same MD on all devices and clients can perform FT transitions.'),
		E('div', { 'class': 'nm-actions', 'style': 'margin-top:0;border-top:0;padding-top:0' }, [ onBtn, offBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, 'After enabling this, use "Wired sync" to push the configuration to the other devices so the whole network shares one SSID and MD.')
	]);
}

return view.extend({
	render: function() {
		injectCSS();

		pageBody = E('div');

		var root = E('div', { 'class': 'meshconf-page' }, [
			E('h2', {}, 'Mesh networking'),
			E('p', { 'class': 'nm-lede' }, 'Networking between two XR1710G units: wireless uses native 802.11s, while over the wire they discover each other on the same LAN and sync /etc/config/wireless.'),
			pageBody
		]);

		refresh();

		return root;
	}
});
