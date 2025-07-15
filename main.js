import {css, html, LitElement} from 'https://unpkg.com/lit@3/index.js?module';

class CirrusOrderWidget extends LitElement {
	static properties = {
		open: {type: Boolean},
		cirrus_token: {type: String},
		quantity: {type: Number},
		trigger_price: {type: Number},
		price: {type: Number},
		side: {type: String},
		mode: {type: String},
		theme: {type: Object}
	};

	constructor() {
		super();
		this.open = true;
		this.mode = 'auto';
		this.theme = {};
		this.data = {
			data: {
				depth: [],
				ltp: 0,
				prev_close: 0,
				tradingsymbol: '',
				exchange: '',
				instrument: '',
				lot_size: 1
			}
		};
		this.selected_order_type = 'MARKET';
		this.selected_product_type = 'CARRYFORWARD';
		this.quantity = 1;
		this.side = 'BUY';
		this.price = 0;
		this.trigger_price = 0;
		this.lot_size = 1;
	}

	updated(changed) {
		if (changed.has('mode') || changed.has('theme')) this.applyTheme();
		if (changed.has('open') && this.open && this.cirrus_token) {
			this.fetchCirrusTokenData();
		}
	}

	async fetchCirrusTokenData() {
		try {
			const response = await fetch(`http://127.0.0.1:8000/embed/get-order-modal-data?cirrus_token=${this.cirrus_token}`);
			let resp  = await response.json();
			console.log("RESP:", resp);
			this.data = resp.data;
		} catch (error) {
			console.error('Error fetching Cirrus token data:', error);
			this.data = {
				data: {
					depth: [],
					ltp: 0,
					prev_close: 0,
					tradingsymbol: '',
					exchange: '',
					instrument: '',
					lot_size: 1
				}
			};
		}
	}

	applyTheme() {
		const isDark = this.mode === 'dark' || (this.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
		const base = isDark
			? {
				'--buy-color': '#007bff',
				'--sell-color': '#d9534f',
				'--buy-bg': '#1c2738',
				'--sell-bg': '#2a1f1f',
				'--positive-color': '#28a745',
				'--negative-color': '#dc3545',
				'--disabled-bg': '#2e3b50',
				'--disabled-text': '#94a3b8',
				'--background': '#0f172a',
				'--text-color': '#e2e8f0',
				'--border-color': '#334155',
				'--panel-bg': '#111827',
				'--table-head-bg': '#1e293b',
				'--tab-bg': '#1e293b',
				'--inactive-button': '#4b5563',
				'--exchange-bg': '#334155',
				'--exchange-text': '#e2e8f0'
			}
			: {
				'--buy-color': '#007bff',
				'--sell-color': '#d9534f',
				'--buy-bg': '#e6f0ff',
				'--sell-bg': '#ffe6e6',
				'--positive-color': '#28a745',
				'--negative-color': '#dc3545',
				'--disabled-bg': '#f3f4f6',
				'--disabled-text': '#9ca3af',
				'--background': '#ffffff',
				'--text-color': '#111827',
				'--border-color': '#dcdcdc',
				'--panel-bg': '#fafafa',
				'--table-head-bg': '#f1f5f9',
				'--tab-bg': '#e5e7eb',
				'--inactive-button': '#ccc',
				'--exchange-bg': '#eef',
				'--exchange-text': '#111827'
			};
		Object.entries({...base, ...this.theme}).forEach(([k, v]) => this.style.setProperty(k, v));
	}

	priceDisabled() {
		return this.selected_order_type === 'MARKET' || this.selected_order_type === 'SL-Market';
	}

	triggerDisabled() {
		return this.selected_order_type !== 'SL' && this.selected_order_type !== 'SL-Market';
	}

	updatePrices() {
		const depth = this.data.data.depth?.[0];
		if (!depth) return;
		const ref = this.side === 'BUY' ? depth.ask_price : depth.bid_price;
		this.price = this.trigger_price = parseFloat(ref);
	}

	submitData() {
		const totalQty = this.quantity * this.lot_size;
		const out = {
			side: this.side,
			order_type: this.selected_order_type,
			product_type: this.selected_product_type,
			quantity: totalQty,
			price: this.priceDisabled() ? 0 : this.price,
			trigger_price: this.triggerDisabled() ? 0 : this.trigger_price
		};
		console.log('SUBMIT:', out);
	}

	render() {
		if (!this.open) return html``;
		const d = this.data.data;
		const changeColor = d.ltp >= d.prev_close ? 'var(--positive-color)' : 'var(--negative-color)';
		const delta = (d.ltp - d.prev_close).toFixed(2);
		const pct = (((d.ltp - d.prev_close) / d.ltp) * 100).toFixed(2);
		return html`
			<div class="modal-backdrop" @click=${() => (this.open = false)}></div>
			<div class="modal">
				<div class="container">
					<div class="widget"
							 style="background:${this.side === 'SELL' ? 'var(--sell-bg)' : 'var(--buy-bg)'}; color: var(--text-color);">
						<div class="header">
							<div>
								<div class="symbol">${d.tradingsymbol} <span class="exchange"
																														 style="background: var(--exchange-bg); color: var(--exchange-text);">${d.exchange}</span>
								</div>
								<div class="ltp" style="color:${changeColor}">${d.ltp} <span
									class="delta"> ${delta} (${pct}%)</span></div>
							</div>
							<div class="side-toggle">
								<button @click=${() => {
									this.side = 'BUY';
									this.updatePrices();
								}}
												style="background:${this.side === 'BUY' ? 'var(--buy-color)' : 'var(--inactive-button)'}">
									Buy
								</button>
								<button @click=${() => {
									this.side = 'SELL';
									this.updatePrices();
								}}
												style="background:${this.side === 'SELL' ? 'var(--sell-color)' : 'var(--inactive-button)'}">
									Sell
								</button>
							</div>
						</div>

						<div class="tabs">
							${['INTRADAY', 'CARRYFORWARD'].map(type => html`
								<div class="tab ${this.selected_product_type === type ? 'active' : ''}"
										 @click=${() => this.selected_product_type = type}>${type}
								</div>`)}
						</div>
						<div class="tabs">
							${['MARKET', 'LIMIT', 'SL', 'SL-Market'].map(type => html`
								<div class="tab ${this.selected_order_type === type ? 'active' : ''}"
										 @click=${() => this.selected_order_type = type}>${type}
								</div>`)}
						</div>

						<label>Lots:<input type="number" .value=${this.quantity}
															 @input=${e => this.quantity = +e.target.value}/>
							<div class="subtext">Total Qty: ${this.quantity * this.lot_size}</div>
						</label>
						<label class="field-wrapper">Price:<input type="number"
																											.value=${this.priceDisabled() ? '' : this.price}
																											?disabled=${this.priceDisabled()}
																											@input=${e => this.price = +e.target.value}/></label>
						<label class="field-wrapper">Trigger Price:<input type="number"
																															.value=${this.triggerDisabled() ? '' : this.trigger_price}
																															?disabled=${this.triggerDisabled()}
																															@input=${e => this.trigger_price = +e.target.value}/></label>

						<div class="actions">
							<button class="submit"
											style="background:${this.side === 'SELL' ? 'var(--sell-color)' : 'var(--buy-color)'}">
								${this.side}
							</button>
						</div>
						<div class="powered">Powered by Cirrus</div>
					</div>

					<div class="depth-panel">
						<div class="depth-title">Market Depth</div>
						<table>
							<thead>
							<tr>
								<th style="text-align: left">ASK QTY</th>
								<th style="text-align: right">ASK</th>
								<th style="text-align: left">BID</th>
								<th style="text-align: right">BID QTY</th>
							</tr>
							</thead>
							<tbody>
							${d.depth.map(row => html`
								<tr>
									<td style="text-align: left">${row.ask_qty}</td>
									<td class="ask" style="text-align: right">${row.ask_price}</td>
									<td class="bid" style="text-align: left">${row.bid_price}</td>
									<td style="text-align: right">${row.bid_qty}</td>
								</tr>
							`)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		`;
	}

	static styles = css`
		:host {
			font-family: system-ui, sans-serif;
		}

		.modal-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.4);
			z-index: 999;
		}

		.modal {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 1000;
			background: var(--background);
			color: var(--text-color);
			border-radius: 12px;
			border: 1px solid var(--border-color);
			overflow: hidden;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
		}

		.container {
			display: flex;
			flex-direction: row;
			gap: 16px;
			padding: 16px;
			color: var(--text-color);
		}

		@media (max-width: 768px) {
			.container {
				flex-direction: column;
			}
		}

		.widget {
			flex: 1;
			border: 1px solid var(--border-color);
			border-radius: 8px;
			padding: 16px;
			background: var(--background);
			color: var(--text-color);
		}

		.powered {
			margin-top: 12px;
			font-size: 12px;
			color: var(--disabled-text);
			text-align: center;
		}

		.depth-panel {
			width: 250px;
			background: var(--panel-bg);
			border: 1px solid var(--border-color);
			border-radius: 8px;
			padding: 12px;
			font-size: 13px;
			color: var(--text-color);
		}

		.depth-title {
			font-weight: bold;
			margin-bottom: 8px;
		}

		table {
			width: 100%;
			border-collapse: collapse;
		}

		th, td {
			text-align: center;
			padding: 4px;
		}

		thead {
			background: var(--table-head-bg);
			color: var(--text-color);
		}

		.ask {
			color: var(--negative-color);
			font-weight: 500;
		}

		.bid {
			color: var(--positive-color);
			font-weight: 500;
		}

		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 12px;
		}

		.symbol {
			font-weight: bold;
		}

		.exchange {
			font-size: 12px;
			padding: 2px 5px;
			border-radius: 4px;
			margin-left: 6px;
		}

		.ltp {
			font-size: 14px;
			margin-top: 4px;
		}

		.side-toggle button {
			margin-left: 5px;
			padding: 6px 12px;
			border: none;
			color: white;
			border-radius: 4px;
			cursor: pointer;
			font-weight: bold;
		}

		.tabs {
			display: flex;
			gap: 4px;
			margin: 12px 0;
		}

		.tab {
			padding: 6px 10px;
			border-radius: 4px;
			background: var(--tab-bg);
			cursor: pointer;
			font-size: 13px;
			color: var(--text-color);
		}

		.tab.active {
			background: var(--buy-color);
			color: white;
		}

		label {
			display: block;
			margin-bottom: 10px;
			font-size: 14px;
		}

		input[type="number"] {
			width: 100%;
			padding: 6px;
			background: var(--panel-bg);
			color: var(--text-color);
			border: 1px solid var(--border-color);
			border-radius: 6px;
			margin-top: 4px;
		}

		input:disabled {
			background: var(--disabled-bg);
			color: var(--disabled-text);
		}

		.field-wrapper {
			position: relative;
		}

		.actions {
			margin-top: 16px;
		}

		.submit {
			color: white;
			padding: 10px 18px;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			width: 100%;
		}

		.subtext {
			font-size: 12px;
			color: var(--disabled-text);
			margin-top: 2px;
		}
	`;
}

customElements.define('cirrus-order-widget', CirrusOrderWidget);
