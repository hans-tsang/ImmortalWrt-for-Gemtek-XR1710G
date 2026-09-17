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

var callToggleRoam = rpc.declare({
	object: 'luci.meshconf',
	method: 'toggleRoam',
	params: [ 'section', 'feature', 'enabled' ]
});

var callSetMd = rpc.declare({
	object: 'luci.meshconf',
	method: 'setMd',
	params: [ 'section', 'md' ]
});

var callApplySync = rpc.declare({
	object: 'luci.meshconf',
	method: 'applySync',
	params: [ 'enabled', 'port', 'key', 'peers', 'channel_mode' ]
});

var callRestartSync = rpc.declare({
	object: 'luci.meshconf',
	method: 'restartSync'
});

var callSyncPeer = rpc.declare({
	object: 'luci.meshconf',
	method: 'syncPeer',
	params: [ 'ip', 'direction' ]
});

/* The parameter list mirrors the UCI fields the backend writes; anything left
 * empty there means "keep what is already configured", so the page can send a
 * partially filled form without wiping the rest. */
var callApplySteer = rpc.declare({
	object: 'luci.meshconf',
	method: 'applySteer',
	params: [
		'enabled', 'network_option', 'broadcast_ip', 'broadcast_port', 'tcp_port',
		'key_mode', 'use_symm_enc',
		'kicking', 'kicking_threshold', 'min_number_to_kick', 'min_probe_count',
		'chan_util_avg_period', 'set_hostapd_nr',
		'g_initial_score', 'g_rssi_val', 'g_low_rssi_val', 'g_rssi_weight', 'g_rssi_center',
		'a_initial_score', 'a_rssi_val', 'a_low_rssi_val', 'a_rssi_weight', 'a_rssi_center',
		'x_initial_score', 'x_rssi_val', 'x_low_rssi_val', 'x_rssi_weight', 'x_rssi_center'
	]
});

var callSteerService = rpc.declare({
	object: 'luci.meshconf',
	method: 'steerService'
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
	/* k/v/r switch. :focus only adds the ring - it must not set outline:none,
	 * because a later :focus-visible rule at equal specificity would then be
	 * the one that wins the tie and keyboard users would lose the outline. */
	'.nm-toggle{display:inline-flex;align-items:center;justify-content:center;min-width:3.4em;min-height:22px;padding:0 var(--ds-sp-2);border:1px solid var(--ds-border);border-radius:var(--ds-r-pill);background:var(--ds-surface-sunken);color:var(--ds-text-muted);font-family:inherit;font-size:var(--ds-fs-xs);font-weight:650;line-height:1;cursor:pointer}',
	'.nm-toggle:hover{border-color:var(--ds-primary);color:var(--ds-primary)}',
	'.nm-toggle:focus{border-color:var(--ds-primary);box-shadow:0 0 0 3px var(--ds-focus-ring)}',
	'.nm-toggle.on{border-color:var(--ds-ok-line);background:var(--ds-ok-tint);color:var(--ds-ok)}',
	'.nm-toggle[disabled]{cursor:progress;opacity:.6}',
	'.nm-toggle.dim{opacity:.45;cursor:not-allowed}',
	/* mobility domain cell: a 4-hex-digit field, no wider than it needs to be */
	'.nm-md{width:4.6em;min-height:24px;padding:0 var(--ds-sp-1);border:1px solid var(--ds-border);border-radius:var(--ds-r-sm);background:var(--ds-surface);color:var(--ds-text);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--ds-fs-xs);text-align:center;box-sizing:border-box}',
	'.nm-md:focus{border-color:var(--ds-primary);box-shadow:0 0 0 3px var(--ds-focus-ring)}',
	'.nm-md[disabled]{opacity:.55}',
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
	pageBody.appendChild(E('div', { 'class': 'nm-empty' }, 'Loading...'));

	return callStatus().then(function(res) {
		statusData = res || {};
		render();
	}, function(e) {
		pageBody.innerHTML = '';
		pageBody.appendChild(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, 'Unable to read status'),
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
	pageBody.appendChild(renderSteer());
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
		notify('Applied; wireless configuration is reloading (a few seconds).', 'success');
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
	if (!m.enabled) return pill('', 'Wireless Mesh: disabled');
	if (m.state === 'up') return pill('ok', 'Wireless Mesh: connected to ' + (m.peers || 0) + ' peers');
	if (m.state === 'waiting') return pill('warn', 'Wireless Mesh: waiting for peers');
	return pill('warn', 'Wireless Mesh: enabled but not up');
}

function roamPill() {
	var r = statusData.roaming || {};
	if (!r.enabled) return pill('', 'Roaming: disabled');
	return pill('ok', 'Roaming: enabled for ' + (r.ap_ready || 0) + '/' + (r.ap_total || 0) + ' SSIDs');
}

function syncPill() {
	var s = statusData.sync || {};
	if (!s.enabled) return pill('', 'Wired Sync: disabled');
	if (!s.running) return pill('warn', 'Wired Sync: service not running');
	return pill('ok', 'Wired Sync: port ' + (s.port || '7761'));
}

function renderStatus() {
	var l = statusData.local || {};
	var m = statusData.mesh || {};
	var s = statusData.sync || {};

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, 'Local Status'),
			E('span', { 'class': 'nm-muted' }, l.hostname || '')
		]),
		E('div', { 'class': 'nm-status', 'style': 'margin-top:var(--ds-sp-3)' }, [
			meshPill(), roamPill(), syncPill(), steerPill()
		]),
		E('div', { 'class': 'nm-infogrid' }, [
			info('Model', l.model || '-'),
			info('LAN IP', l.lan_ip || '-', l.mac || ''),
			info('Wireless Config Version', E('span', { 'class': 'nm-mono' }, l.wifirev || '-'), 'Used to compare whether two devices match'),
			info('Mesh Interface', m.iface || '-', m.state === 'up' ? 'Peers ' + m.peers + ' ' : (m.enabled ? 'No link established yet' : 'Not configured')),
			info('Sync Key', s.key_set ? 'Set' : 'Not set', s.last_peer ? 'Last peer ' + s.last_peer : 'Not synced yet')
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
		var label = r.name + '(' + (r.band || '?') + ', channel ' + (r.channel || 'auto') + ')';
		if (!r.mesh_capable) label += ' · mesh not supported';
		return { value: r.name, label: label, disabled: !r.mesh_capable };
	}), m.radio || (radios.length ? radios[0].name : ''));

	var meshIdInput = textInput(m.mesh_id || 'XR1710G-Mesh');
	var encSel = select([
		{ value: 'sae', label: 'SAE (recommended)' },
		{ value: 'none', label: 'No encryption' }
	], m.encryption || 'sae', function() {
		keyField.style.display = (encSel.value === 'sae') ? '' : 'none';
	});
	// `m.key_set ? '' : ''` was a typo: both branches were empty, so the box
	// was always blank and every save stored an empty key. Send the value.
	var keyInput = textInput(m.key || '', { type: 'password', placeholder: m.key_set ? 'Leave blank to keep unchanged' : 'At least 8 characters' });
	var keyField = field('Mesh Key', keyInput);
	keyField.style.display = (m.encryption === 'none') ? 'none' : '';

	var bridgeBox = checkbox(m.bridge_lan !== false, function() {});

	function toggleMeshFields(on) {
		[ radioSel, meshIdInput, encSel, keyInput, bridgeBox ].forEach(function(el) {
			el.disabled = !on;
		});
	}
	toggleMeshFields(!!m.enabled);

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Save and Apply');
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && !radioSel.value) {
			notify('Select a radio that supports mesh.', 'danger');
			return;
		}
		if (enabledBox.checked && !meshIdInput.value.trim()) {
			notify('Enter a Mesh ID; it must match on both devices.', 'danger');
			return;
		}
		withButton(saveBtn, 'Applying...', function() {
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
		withButton(stopBtn, 'Disabling...', function() {
			return callApplyMesh('0', radioSel.value, meshIdInput.value.trim(), encSel.value, '', '1');
		});
	});

	var warn = '';
	if (!m.wpad_mesh) {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, 'wpad may not support mesh'),
			E('div', {}, '802.11s requires hostapd with mesh support (wpad-mesh-* or wpad-openssl). The current /usr/sbin/hostapd appears to lack mesh features, so the interface may not come up.')
		]);
	} else if (m.enabled && m.state === 'down') {
		warn = E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, 'Mesh interface is not up'),
			E('div', {}, 'Make sure both devices use the same Mesh ID, encryption, and key, and that the selected radio is enabled.')
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, 'Wireless Mesh(802.11s)'),
			E('span', { 'class': 'nm-muted' }, m.enabled ? (m.state === 'up' ? 'Connected' : 'Configured') : 'Disabled')
		]),
		E('p', { 'class': 'nm-subtitle' }, 'Create an 802.11s mesh interface on the selected radio and bridge it to LAN, putting both devices on the same layer-2 network. Native 802.11s, no batman-adv required.'),
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
		E('p', { 'class': 'nm-hint' }, 'Saving reloads wireless; connected clients will disconnect briefly.')
	]);
}

/* ---------------------------------------------------------------------------
 * wired sync
 * ------------------------------------------------------------------------- */
function peerRow(p) {
	var selfRev = (statusData.local || {}).wifirev;
	var same = p.wifirev && p.wifirev === selfRev;
	var chNote = ((statusData.sync || {}).channel_mode !== 'follow')
		? '(channels will be staggered automatically; already different channels stay unchanged)' : '(channels will be overwritten together)';

	var pullBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, 'Pull to Local');
	pullBtn.addEventListener('click', function() {
		if (!confirm('This will use ' + p.ip + '\'s wireless configuration to overwrite this device ' + chNote + ' (the current configuration will be backed up to /etc/config/wireless.meshconf-bak). Continue?')) return;
		withButton(pullBtn, 'Pulling...', function() {
			return callSyncPeer(p.ip, 'pull');
		});
	});

	var pushBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Push to Peer');
	pushBtn.addEventListener('click', function() {
		if (!confirm('This will use this device\'s wireless configuration to overwrite ' + p.ip + ' (the peer decides whether to stagger channels based on its own settings). Continue?')) return;
		withButton(pushBtn, 'Pushing...', function() {
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
			same ? E('span', { 'class': 'nm-state estab', 'style': 'margin-left:var(--ds-sp-1)' }, 'Matches local') : ''
		]),
		E('td', { 'class': 'nowrap' }, p.source === 'manual' ? 'Manual' : 'Layer-2 discovery'),
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
	// two units sharing a channel split airtime instead of adding to it,
	// which is the worse way to be wrong.
	var keepBox = checkbox(s.channel_mode !== 'follow', function() {});

	var portInput = textInput(s.port || '7761', { type: 'number' });
	// The backend now hands the stored key back, so the box is filled in on
	// load and can be copied onto the other unit. It used to render empty
	// (only key_set was sent) and one save later the stored key was gone.
	var keyInput = textInput(s.key || '', { type: 'text', placeholder: s.key_set ? 'Leave blank to keep unchanged' : 'All devices must use the same key' });
	var peersInput = textInput(((s.peers) || []).join(', '), { placeholder: 'For example: 192.168.2.1, 192.168.3.10' });

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Save and Apply');
	saveBtn.addEventListener('click', function() {
		// Only a pair that has never had a key needs one typed in; on a
		// configured pair the box is prefilled and an empty value means
		// "keep it", which is what the backend does with it too.
		if (enabledBox.checked && !s.key_set && !keyInput.value.trim()) {
			notify('Set a shared key; it must match on all devices or sync will fail.', 'danger');
			return;
		}
		withButton(saveBtn, 'Saving...', function() {
			return callApplySync(enabledBox.checked ? '1' : '0', portInput.value.trim(), keyInput.value.trim(), peersInput.value, keepBox.checked ? 'stagger' : 'follow');
		});
	});

	var scanBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, 'Scan LAN Devices');
	scanBtn.addEventListener('click', function() {
		var self = scanBtn;
		var orig = self.textContent;
		self.disabled = true;
		self.textContent = 'Scanning...';
		callScanPeers().then(function(res) {
			self.disabled = false;
			self.textContent = orig;
			peerData = res || { peers: [] };
			render();
			var n = (peerData.peers || []).length;
			notify(n ? 'Found ' + n + ' devices.' : 'No other devices found; make sure the peer has wired sync enabled, the key matches, and it is on the same LAN.', n ? 'success' : 'info');
		}, function(e) {
			self.disabled = false;
			self.textContent = orig;
			notify(e.message || 'Scan failed', 'danger');
		});
	});

	[ portInput, keyInput, peersInput, keepBox ].forEach(function(el) { el.disabled = !s.enabled; });
	scanBtn.disabled = !s.enabled;

	var peers = (peerData && peerData.peers) || [];
	var table = E('div', { 'class': 'nm-empty' }, 'Click "Scan LAN Devices" to find XR1710G devices on the same LAN.');
	if (peers.length) {
		table = E('div', {}, [
			E('table', { 'class': 'nm-table' }, [
				E('thead', {}, E('tr', {}, [
					E('th', {}, 'Device'),
					E('th', {}, 'IP'),
					E('th', {}, 'Config Version'),
					E('th', {}, 'Source'),
					E('th', {}, 'Sync')
				])),
				E('tbody', {}, peers.map(peerRow))
			])
		]);
	}

	var warn = '';
	if (s.enabled && !s.running) {
		var startBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Start Service');
		startBtn.addEventListener('click', function() {
			var self = startBtn, orig = self.textContent;
			self.disabled = true;
			self.textContent = 'Starting...';
			var done = function() {
				self.disabled = false;
				self.textContent = orig;
			};
			callRestartSync().then(function(res) {
				done();
				if (res && res.running) notify('Sync service started.', 'success');
				else notify('The service is still not up; SSH in and run logread -e meshconf to check why.', 'danger');
				return refresh();
			}, function(e) {
				done();
				notify(e.message || 'Start failed', 'danger');
			});
		});
		warn = E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, 'Sync service is not running'),
			E('div', {}, s.reason || 'The service process does not exist. Saving should start it automatically, or use the button below to start it manually.'),
			E('div', { 'style': 'margin-top:.5em' }, [ startBtn ])
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, 'Wired Sync (same model devices)'),
			E('span', { 'class': 'nm-muted' }, s.enabled ? 'Enabled' : 'Disabled')
		]),
		E('p', { 'class': 'nm-subtitle' }, 'When devices are on the same LAN, use this device\'s configuration to align the others: periodically broadcast to discover neighbors, then sync /etc/config/wireless with the shared key (including SSID, keys, and k/v/r settings).'),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Enable wired sync (also allow discovery)', enabledBox) ]),
			field('Port', portInput),
			field('Shared Key', keyInput),
			field('Manually Added Device IPs', peersInput, true),
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Stagger channels during sync', keepBox) ]),
			E('p', { 'class': 'nm-hint' }, 'If the two APs are far apart, you can turn this off.')
		]),
		warn,
		E('div', { 'class': 'nm-actions' }, [ saveBtn, scanBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, 'Sync overwrites the peer\'s entire /etc/config/wireless; pulling to this device automatically backs it up as /etc/config/wireless.meshconf-bak. For devices outside the same layer 2 network (across layer 3), enter them under "Manually Added Device IPs". When "stagger channels" is enabled, the receiving side moves to a non-overlapping channel in the same band (2.4G uses 1/6/11; 5G/6G jumps by channel width); channels that are already staggered stay unchanged, and the radio carrying the 802.11s backhaul stays aligned with the peer (mesh requires the same channel). SSID, keys, and k/v/r settings sync normally; roaming is unaffected.')
	]);
}

/* ---------------------------------------------------------------------------
 * 802.11k/v/r
 * ------------------------------------------------------------------------- */
var ROAM_LABEL = { k: '802.11k neighbor reports', v: '802.11v BTM transition', r: '802.11r fast roaming' };

function roamToggle(ap, feat) {
	var on = !!ap[feat];
	// FT derives PMK-R0/R1 from the key, so an open network has no R to give.
	var blocked = (feat === 'r' && !ap.ft_ok);
	var title = on ? 'Click to disable ' + ROAM_LABEL[feat] : 'Click to enable ' + ROAM_LABEL[feat];
	if (blocked) {
		title = 'Open / OWE networks cannot enable 802.11r';
	} else if (feat === 'r' && ap.wpa3) {
		// WPA3 has no PSK to derive a local PMK-R0 from; say so up front.
		title += '(WPA3 network: ft_psk_generate_local will be set to 0)';
	}
	var b = E('button', {
		'class': 'nm-toggle' + (on ? ' on' : '') + (blocked ? ' dim' : ''),
		'type': 'button',
		'title': title
	}, on ? 'On' : 'Off');

	if (blocked) {
		b.disabled = true;
		return b;
	}
	b.addEventListener('click', function() {
		withButton(b, '…', function() { return callToggleRoam(ap.section, feat, on ? '0' : '1'); });
	});
	return b;
}

/* Editable mobility domain. Emptying the field drops the option, which puts
 * the interface back on the SSID-derived value. */
function mdCell(ap) {
	var current = (ap.md || '').toLowerCase();
	var inp = E('input', {
		'class': 'nm-md',
		'type': 'text',
		'maxlength': '4',
		'spellcheck': 'false',
		'value': current,
		'placeholder': 'Auto',
		'title': '4 hex digits (0-9 / a-f); clear and press Enter to restore automatic SSID-based derivation. All interfaces with the same SSID will be updated together.'
	});

	inp.addEventListener('change', function() {
		var v = inp.value.trim().toLowerCase();
		if (v === current) return;
		inp.disabled = true;
		callSetMd(ap.section, v).then(function(res) {
			if (!res || res.success === false) {
				inp.disabled = false;
				notify((res && res.error) || 'Save failed', 'danger');
				return;
			}
			notify(v
				? 'Mobility domain set to ' + res.md + ' (' + res.applied + ' interfaces with the same SSID updated together).'
				: 'Cleared; restored automatic SSID-based derivation (' + res.md + ').', 'success');
			return refresh();
		}, function(e) {
			inp.disabled = false;
			notify(e.message || 'Save failed', 'danger');
		});
	});

	return E('td', { 'class': 'nowrap' }, [
		inp,
		ap.md_set ? '' : E('span', { 'class': 'nm-state', 'style': 'margin-left:var(--ds-sp-1)' }, 'Auto')
	]);
}

function renderRoaming() {
	var r = statusData.roaming || {};
	var aps = statusData.aps || [];

	var onBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Enable k/v/r');
	onBtn.addEventListener('click', function() {
		withButton(onBtn, 'Enabling...', function() { return callApplyRoaming('1'); });
	});

	var offBtn = E('button', { 'class': 'cbi-button cbi-button-reset' }, 'Disable k/v/r');
	offBtn.addEventListener('click', function() {
		withButton(offBtn, 'Disabling...', function() { return callApplyRoaming('0'); });
	});

	var table = E('div', { 'class': 'nm-empty' }, 'No AP interfaces currently.');
	if (aps.length) {
		table = E('table', { 'class': 'nm-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', {}, 'SSID'),
				E('th', {}, 'Band'),
				E('th', {}, 'Network'),
				E('th', { 'title': ROAM_LABEL.k }, 'K'),
				E('th', { 'title': ROAM_LABEL.v }, 'V'),
				E('th', { 'title': ROAM_LABEL.r }, 'R'),
				E('th', {}, 'Mobility Domain MD')
			])),
			E('tbody', {}, aps.map(function(a) {
				return E('tr', {}, [
					E('td', {}, a.ssid || '-'),
					E('td', {}, a.band || '-'),
					E('td', {}, a.network || 'lan'),
					E('td', {}, roamToggle(a, 'k')),
					E('td', {}, roamToggle(a, 'v')),
					E('td', {}, roamToggle(a, 'r')),
					mdCell(a)
				]);
			}))
		]);
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, '802.11k/v/r Roaming'),
			E('span', { 'class': 'nm-muted' }, (r.ap_ready || 0) + '/' + (r.ap_total || 0) + ' SSIDs enabled')
		]),
		E('p', { 'class': 'nm-subtitle' }, 'K / V / R in the table can be toggled per SSID. K writes neighbor and beacon reports, V writes BTM transition and WNM sleep, and R writes fast roaming (Over the Air, 20s reassociation deadline, mobility domain). The mobility domain is derived from the SSID: the same SSID gets the same MD on all devices and bands, while different SSIDs are separated automatically.'),
		(function() {
			var w = (aps.filter(function(a) { return a.wpa3; })).length;
			return w ? E('p', { 'class': 'nm-hint' }, 'There are ' + w + ' interfaces using WPA3 / WPA3 mixed encryption: these interfaces have no PSK for deriving local PMK-R0, so enabling R forces ft_psk_generate_local to 0 (other encryption modes use 1).') : '';
		})(),
		E('div', { 'class': 'nm-actions', 'style': 'margin-top:0;border-top:0;padding-top:0' }, [ onBtn, offBtn ]),
		table,
		E('p', { 'class': 'nm-hint' }, 'The two buttons above apply to all SSIDs at once; table toggles only change their interface. The MD column is editable: enter 4 hex digits (0-9 / a-f), or clear it to restore automatic SSID-based derivation. Editing one interface updates all interfaces with the same SSID; otherwise FT will not work when roaming across bands. After enabling, use "Wired Sync" to push the configuration to other devices so the whole mesh has consistent SSIDs and MDs.')
	]);
}

/* ---------------------------------------------------------------------------
 * DAWN - the steering layer above 802.11k/v
 * ------------------------------------------------------------------------- */
/* One metric section per band. 6 GHz is the odd one out: upstream DAWN knows
 * only two, so unless this build carries patches/feeds/packages/net/dawn the
 * section is written and never read. The banner below says so when that is
 * what the numbers mean. */
var STEER_BANDS = [
	{ pfx: 'g', name: '802_11g', label: '2.4 GHz' },
	{ pfx: 'a', name: '802_11a', label: '5 GHz' },
	{ pfx: 'x', name: '802_11a_6g', label: '6 GHz' }
];

var STEER_KEYS = [ 'initial_score', 'rssi_val', 'low_rssi_val', 'rssi_weight', 'rssi_center' ];

function steerPill() {
	var s = statusData.steering || {};
	if (!s.installed) return pill('', 'Roaming Steering: DAWN not installed');
	if (!s.enabled) return pill('', 'Roaming Steering: disabled');
	if (!s.running) return pill('warn', 'Roaming Steering: service not running');
	if (!s.ubus) return pill('warn', 'Roaming Steering: not connected to ubus');
	return pill('ok', 'Roaming Steering: enabled');
}

function bandConf(name) {
	var bands = (statusData.steering || {}).bands || [];
	for (var i = 0; i < bands.length; i++)
		if (bands[i].name === name) return bands[i];
	return {};
}

/* Same tokens and focus rules as the mobility-domain field, just wide enough
 * for a negative RSSI threshold. Values are validated in the backend: a field
 * that is not an integer keeps whatever DAWN is already using rather than
 * silently becoming a zero. */
function numCell(value) {
	var el = E('input', {
		'class': 'nm-md', 'type': 'text', 'spellcheck': 'false',
		'inputmode': 'numeric', 'style': 'width:5.2em'
	});
	el.value = (value === null || value === undefined) ? '' : String(value);
	return el;
}

function renderSteer() {
	var s = statusData.steering || {};
	var net = s.network || {};
	var met = s.metric || {};
	var enabled = !!s.enabled;

	var enabledBox = checkbox(enabled, function() { setSteerFields(enabledBox.checked); });

	/* Stock DAWN ships 10.0.0.255, which reaches nobody on this LAN. This is
	 * the address the neighbour discovery already uses, computed the same way. */
	var bcastInput = textInput(net.broadcast_ip || s.suggest_bcast || '', {
		placeholder: s.suggest_bcast || 'For example: 192.168.1.255'
	});

	var netSel = select([
		{ value: '2', label: 'umdns + TCP (recommended)' },
		{ value: '0', label: 'UDP broadcast' },
		{ value: '1', label: 'UDP multicast' },
		{ value: '3', label: 'TCP (no automatic discovery)' }
	], net.network_option || '2');

	var bportInput = textInput(net.broadcast_port || '1025', { type: 'number' });
	var tportInput = textInput(net.tcp_port || '1026', { type: 'number' });

	/* Every node needs the same key, and typing a hex string on every node is
	 * how they stop being the same. The pair already agrees on one for the
	 * wired sync, so DAWN's is stretched from that instead. */
	var keySel = select([
		{ value: 'derived', label: 'Derived from the "Wired Sync" shared key (recommended)' },
		{ value: 'keep', label: 'Keep the current key unchanged' }
	], 'derived');
	if (!net.key_set) keySel.value = 'derived';

	var useEncBox = checkbox(net.use_symm_enc === '1', function() {});

	/* Upstream defaults to 3 ("both"), which also kicks on an absolute
	 * threshold - even when there is no better AP to hand the client to. */
	var kickSel = select([
		{ value: '1', label: 'RSSI comparison (recommended)' },
		{ value: '2', label: 'Absolute RSSI' },
		{ value: '3', label: 'Require both' },
		{ value: '0', label: 'Do not move clients' }
	], met.kicking || '1');

	var ktInput = numCell(met.kicking_threshold);
	var nkInput = numCell(met.min_number_to_kick);
	var pcInput = numCell(met.min_probe_count);
	var capInput = numCell(met.chan_util_avg_period);
	var nrSel = select([
		{ value: '0', label: 'Off' },
		{ value: '1', label: 'Static (all APs)' },
		{ value: '2', label: 'Dynamic (neighbors heard by clients)' }
	], met.set_hostapd_nr || '0');

	var bandInputs = {};
	var bandRows = STEER_BANDS.map(function(b) {
		var c = bandConf(b.name), cells = {};
		STEER_KEYS.forEach(function(k) { cells[k] = numCell(c[k]); });
		bandInputs[b.pfx] = cells;
		return E('tr', {}, [
			E('td', { 'class': 'nowrap' }, b.label),
			E('td', {}, cells.initial_score),
			E('td', {}, cells.rssi_val),
			E('td', {}, cells.low_rssi_val),
			E('td', {}, cells.rssi_weight),
			E('td', {}, cells.rssi_center)
		]);
	});

	function setSteerFields(on) {
		[ bcastInput, netSel, bportInput, tportInput, keySel, useEncBox,
		  kickSel, ktInput, nkInput, pcInput, capInput, nrSel ].forEach(function(el) {
			el.disabled = !on;
		});
		STEER_BANDS.forEach(function(b) {
			STEER_KEYS.forEach(function(k) { bandInputs[b.pfx][k].disabled = !on; });
		});
	}
	setSteerFields(enabled);

	var saveBtn = E('button', { 'class': 'cbi-button cbi-button-apply' }, 'Save and Apply');
	saveBtn.addEventListener('click', function() {
		if (enabledBox.checked && keySel.value === 'derived' && !s.sync_key_set) {
			notify('Set the shared key under "Wired Sync" first: DAWN derives its key from it, otherwise the two devices cannot decrypt each other\'s messages.', 'danger');
			return;
		}
		withButton(saveBtn, 'Saving...', function() {
			var band = function(pfx, k) { return bandInputs[pfx][k].value; };
			return callApplySteer(
				enabledBox.checked ? '1' : '0',
				netSel.value, bcastInput.value.trim(), bportInput.value.trim(), tportInput.value.trim(),
				keySel.value, useEncBox.checked ? '1' : '0',
				kickSel.value, ktInput.value, nkInput.value, pcInput.value, capInput.value, nrSel.value,
				band('g', 'initial_score'), band('g', 'rssi_val'), band('g', 'low_rssi_val'), band('g', 'rssi_weight'), band('g', 'rssi_center'),
				band('a', 'initial_score'), band('a', 'rssi_val'), band('a', 'low_rssi_val'), band('a', 'rssi_weight'), band('a', 'rssi_center'),
				band('x', 'initial_score'), band('x', 'rssi_val'), band('x', 'low_rssi_val'), band('x', 'rssi_weight'), band('x', 'rssi_center')
			);
		});
	});

	var startBtn = E('button', { 'class': 'cbi-button cbi-button-action' }, 'Start Service');
	startBtn.addEventListener('click', function() {
		var self = startBtn, orig = self.textContent;
		self.disabled = true;
		self.textContent = 'Starting...';
		var done = function() { self.disabled = false; self.textContent = orig; };
		callSteerService().then(function(res) {
			done();
			if (res && res.running) notify('Roaming steering service started.', 'success');
			else notify('The service is still not up; SSH in and run logread -e dawn to check why.', 'danger');
			return refresh();
		}, function(e) {
			done();
			notify(e.message || 'Start failed', 'danger');
		});
	});

	/* Banners, worst first. */
	var banners = [];
	if (!s.installed) {
		banners.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, 'DAWN is not installed'),
			E('div', {}, 'This package declares dawn as a dependency. If this firmware was built before that dependency was added, install it with opkg install dawn (which brings in umdns), then refresh the page. Until then, 802.11k/v/r still works, but nothing decides when a client should switch APs.')
		]));
	} else if (s.enabled && s.reason) {
		banners.push(E('div', { 'class': 'nm-banner bad' }, [
			E('strong', {}, 'Roaming steering is not working properly'),
			E('div', {}, s.reason)
		]));
	}

	var r = statusData.roaming || {};
	if (s.enabled && r.ap_total > 0 && r.ap_ready < r.ap_total) {
		banners.push(E('div', { 'class': 'nm-banner' }, [
			E('strong', {}, 'There are ' + (r.ap_total - r.ap_ready) + ' SSIDs without k/v enabled yet'),
			E('div', {}, 'DAWN uses 802.11v BSS Transition to hand clients off, and 802.11k tells it where to send them. Enable K and V for these SSIDs in the table above.')
		]));
	}

	if (s.has_6g_radio) {
		var six = bandConf('802_11a_6g');
		if (!six.present) {
			banners.push(E('div', { 'class': 'nm-banner info' }, [
				E('strong', {}, 'This device has a 6 GHz radio, but the current DAWN does not recognize the 6G config section'),
				E('div', {}, 'DAWN without the 6 GHz patch only has 802_11g and 802_11a parameter sets, so 6G is treated as the last set (802_11a) and shares the same scores. The 6 GHz row below can still be filled in and synced, but only firmware with the patches/feeds/packages/net/dawn patch will actually read it.')
			]));
		}
	}

	return E('div', { 'class': 'nm-section' }, [
		E('div', { 'class': 'nm-title' }, [
			E('span', {}, 'Roaming Steering(DAWN)'),
			E('span', { 'class': 'nm-muted' }, s.installed ? (enabled ? 'Enabled' : 'Disabled') : 'DAWN not installed')
		]),
		E('p', { 'class': 'nm-subtitle' }, '802.11k/v/r only publishes information: APs can answer "who else is there", and clients can ask on their own. DAWN handles the other half: it collects each client as seen by all devices, scores candidate APs, then asks the current AP to use BSS Transition to move the client to a better one. If two devices share an SSID but nothing makes that decision, clients will stick to the old AP until the signal drops completely.'),
		E('div', { 'class': 'nm-form' }, [
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Enable roaming steering (DAWN)', enabledBox) ]),
			field('Discovery Method', netSel),
			field('Broadcast Address', bcastInput),
			field('Broadcast Port', bportInput),
			field('TCP Port', tportInput),
			field('DAWN Key', keySel),
			E('div', { 'class': 'nm-field wide' }, [ inlineField('Encrypt messages between neighboring devices (must match on all devices)', useEncBox) ])
		]),
		E('div', { 'class': 'nm-subtitle', 'style': 'margin-top:var(--ds-sp-4)' }, 'When to hand clients off'),
		E('div', { 'class': 'nm-form' }, [
			field('Kick Policy', kickSel),
			field('Score Difference Threshold', ktInput),
			field('Consecutive Decision Count', nkInput),
			field('Minimum Probe Count', pcInput),
			field('Channel Utilization Averaging Period', capInput),
			field('Send Neighbor Reports', nrSel)
		]),
		E('div', { 'class': 'nm-subtitle', 'style': 'margin-top:var(--ds-sp-4)' }, 'Per-band Scoring'),
		E('table', { 'class': 'nm-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', {}, 'Band'),
				E('th', { 'title': 'Base score for APs in this band: 2.4G is usually lower than 5G/6G' }, 'Base Score'),
				E('th', { 'title': 'Add points when signal is above this value' }, 'Good Signal Threshold'),
				E('th', { 'title': 'Subtract points when signal is below this value' }, 'Poor Signal Threshold'),
				E('th', { 'title': 'Points added or subtracted per 1 dB from the midpoint; when nonzero, the next two settings are weakened and scoring mostly follows signal strength' }, 'RSSI Weight'),
				E('th', { 'title': 'Signal midpoint used for scoring' }, 'RSSI Midpoint')
			])),
			E('tbody', {}, bandRows)
		]),
		banners,
		E('p', { 'class': 'nm-hint' }, 'To make scoring follow signal strength completely (the DAWN documentation\'s recommended approach), set "RSSI Weight" to 2 and "RSSI Midpoint" to -20 for all three bands, then set the good/poor signal bonuses and channel-utilization adjustments for that band to 0. Scoring then becomes Base Score + (RSSI - Midpoint) * Weight, so even APs that are close together with a 20 dB signal difference will select the better one instead of falling into the same range and receiving the same score.'),
		E('div', { 'class': 'nm-actions' }, [ saveBtn, startBtn ]),
		E('p', { 'class': 'nm-hint' }, 'These settings are copied to peers by "Wired Sync" together with /etc/config/wireless, so both devices use the same scoring rules. Older peer firmware skips this step automatically. After SAVE, DAWN restarts once; in-progress AP switch decisions are interrupted, but clients do not disconnect.'),
		E('p', { 'class': 'nm-hint' }, 'See who is connected to each AP and who is in whose coverage: ' , E('a', { 'href': L.url('admin/network/meshconf/steering') }, 'APs and Clients'))
	]);
}

return view.extend({
	render: function() {
		injectCSS();

		pageBody = E('div');

		var root = E('div', { 'class': 'meshconf-page' }, [
			E('h2', {}, 'Mesh Networking'),
			E('p', { 'class': 'nm-lede' }, 'Networking between two XR1710G devices: wireless uses native 802.11s; wired mode discovers peers on the same LAN and syncs /etc/config/wireless.'),
			pageBody
		]);

		refresh();

		return root;
	}
});
