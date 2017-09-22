import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import _ from 'lodash';
import moment from 'moment';

moment.locale('de');

import SepaDebit from './Portal/PaymentMethods/SepaDebit';

import SepaDebitComponent from './Order/SepaDebitComponent';
import CreditCardComponent from './Order/CreditCardComponent';

import 'paymentfont/css/paymentfont.css';

export default class ContractComponent extends Component {

	constructor(props) {
		super(props);

		this.state = {
			loading: true,
			contract: {},

			changePaymentDetails: false,
			paymentDetailsValid: false,
			paymentDetails: {}
		};

		//bind context to event handlers
		this.doCancellation = this.doCancellation.bind(this);
		this.changePaymentDetails = this.changePaymentDetails.bind(this);
		this.cancelChangePaymentDetails = this.cancelChangePaymentDetails.bind(this);
		this.updatePaymentDetails = this.updatePaymentDetails.bind(this);
		this.applyNewPaymentDetails = this.applyNewPaymentDetails.bind(this);
	}

	componentWillMount() {
		//get the token for the contract
		axios.get('/api/billing/contract/' + contractId + '/token')
			.then((res) => {
				this.token = res.data.Token;

				//get the portal service
				this.portalService = new BillwerkJS.Portal(this.token);
				this.refreshContract();
			});
	}

	refreshContract() {
		this.portalService.contractDetails((contract) => {
			this.setState({
				contract,
				loading: false
			});
		}, (err) => console.error);
	}

	getContract() {
		return this.state.contract.Contract;
	}

	getCurrentPlan() {
		return this.state.contract.CurrentPlan;
	}

	getPaymentIconName() {
		switch (this.getContract().PaymentBearer.Type) {
			case 'CreditCard':
				return 'pf-credit-card';
			case 'BankAccount':
				return 'pf-sepa';
			case 'InvoicePayment':
				return 'pf-rechnung';
		}
	}

	/**
	 * Upate the stored payment details in the current state. Used for props on payment method components.
	 *
	 * @param details
	 */
	updatePaymentDetails(details, valid) {
		this.setState({
			paymentDetails: details,
			paymentDetailsValid: valid
		});
	}

	doCancellation() {
		let res = confirm('Paket zum ' + moment(this.state.contract.EndDateIfCancelledNow).format('LL') + ' kündigen?');
		if (res) {
			//submit the cancellation
			this.setState({loading: true});
			this.portalService.contractCancel((res) => {
				this.refreshContract();
			}, (err) => {
				console.error(err);
			});
		}
	}

	changePaymentDetails() {
		this.setState({changePaymentDetails: true});
	}

	cancelChangePaymentDetails() {
		this.setState({changePaymentDetails: false});
	}

	applyNewPaymentDetails() {
		//show loading indicator
		this.setState({loading: true, changePaymentDetails: false});

		//update the payment details
		let paymentService = new BillwerkPaymentService({
			publicApiKey: bwPublicKey
		}, () => {
			console.log(paymentService, this.state.paymentDetails);
			this.portalService.paymentChange(
				paymentService,
				this.state.paymentDetails,
				(res) => {
					this.refreshContract();
				},
				(err) => {
					console.error(err);
				}
			);
		}, () => {
			console.error('Error on creating payment service');
		});
	}

	render() {
		//loading spinner
		if (this.state.loading) {
			return (
				<div className="content-block text-center">
					<i className="fa fa-spin fa-circle-o-notch fa-4x"/><br/>Hole Daten...
				</div>
			)
		}

		return (
			<div>
				<div className="row">
					<div className="col-md-6">
						<div className="content-block">
							<fieldset>
								<legend>
									<i className={'pf ' + this.getPaymentIconName()}/> Ihre Zahlungsdaten
								</legend>

								<SepaDebit payment={this.getContract().PaymentBearer}/>

								{(() => {
									if (!this.state.changePaymentDetails) {
										return <a href={void(0)} onClick={this.changePaymentDetails}><i
											className="fa fa-pencil"/>
											Ändern</a>;
									}
								})()}
							</fieldset>

							{(() => {
								if (this.state.changePaymentDetails) {
									return (
										<fieldset>
											<legend>Zahlungsweise ändern</legend>

											<p>Bitte wählen Sie Ihre gewünschte Zahlungsart aus:</p>

											<div className="row payment-methods">
												<div className="col-sm-6">
													<label>
														<input type="radio" name="payment-method"
															   onChange={() => this.setState({paymentMethod: 'Debit:FakePSP'})}
															   checked={this.state.paymentMethod === 'Debit:FakePSP'}/>

														<ul className="list-inline text-center payment-methods-o">
															<li><i className="pf pf-sepa"></i></li>
														</ul>
													</label>
												</div>
												<div className="col-sm-6">
													<label>
														<input type="radio" name="payment-method"
															   onChange={() => this.setState({paymentMethod: 'CreditCard:FakePSP'})}
															   checked={this.state.paymentMethod === 'CreditCard:FakePSP'}/>

														<ul className="list-inline text-center payment-methods-o">
															<li><i className="pf pf-visa"></i></li>
															<li><i className="pf pf-mastercard"></i></li>
														</ul>
													</label>
												</div>
											</div>

											<hr/>

											{(() => {
												switch (this.state.paymentMethod) {
													case 'Debit:FakePSP':
														return <SepaDebitComponent
															onChange={this.updatePaymentDetails}/>
													case 'CreditCard:FakePSP':
														return <CreditCardComponent
															onChange={this.updatePaymentDetails}/>
												}
											})()}

											<button className="btn btn-success btn-sm"
													disabled={!this.state.paymentDetailsValid}
													onClick={this.applyNewPaymentDetails}>
												<i className="fa fa-save fa-fw"/>
												Neue Zahlungsart speichern
											</button>
											oder <a href={void(0)}
													onClick={this.cancelChangePaymentDetails}>Abbrechen</a>
										</fieldset>
									)
								}
							})()}
						</div>
					</div>
					<div className="col-md-6">
						<div className="content-block">
							<fieldset>
								<legend>
									<i className="fa fa-pencil-square-o  fa-fw"/>
									Ihr aktuelles Abonnement
								</legend>

								<table className="table">
									<tbody>
									<tr>
										<th>Paket</th>
										<td>
											{this.getCurrentPlan().PlanName} (<span
											className="text-muted small">seit {moment(this.getCurrentPlan().StartDate).format('ll')}</span>)
										</td>
									</tr>
									{(() => {
										if (this.getContract().EndDate) {
											return (
												<tr>
													<th>Kündigung zum</th>
													<td>{moment(this.getContract().EndDate).format('LL')}</td>
												</tr>
											)
										} else {
											return (
												<tr>
													<th>Nächste Abrechnung</th>
													<td>{moment(this.getContract().NextBillingDate).format('LL')}</td>
												</tr>
											)
										}
									})()}
									</tbody>
								</table>

								{(() => {
									if (!this.getContract().EndDate) {
										return (
											<a href="#" className="pull-right small" onClick={this.doCancellation}>Jetzt
												kündigen</a>
										)
									}
								})()}

							</fieldset>
						</div>
					</div>
				</div>
			</div>
		)
	}

}

if (document.getElementById('contract-detail')) {
	ReactDOM.render(<ContractComponent/>, document.getElementById('contract-detail'));
}
