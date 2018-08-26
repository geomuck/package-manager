import React from 'react';

import * as upgradeService from '../services/UpgradeService';

import {HeaderField, RecordHeader} from '../components/PageHeader';
import * as upgradeItemService from "../services/UpgradeItemService";
import * as upgradeJobService from "../services/UpgradeJobService";
import UpgradeItemCard from "./UpgradeItemCard";
import ProgressBar from "../components/ProgressBar";
import UpgradeJobCard from "./UpgradeJobCard";
import Tabs from "../components/Tabs";
import {NotificationManager} from "react-notifications";
import moment from "moment";
import * as notifier from "../services/notifications";
import {DataTableFilterHelp} from "../components/DataTableFilter";
import {getProgress, UPGRADE_ICON} from "../Constants";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			upgrade: {},
			progress: getProgress([])
		};
		
		this.fetchItems = this.fetchItems.bind(this);
		this.fetchJobs = this.fetchJobs.bind(this);
		this.upgradeUpdated = this.upgradeUpdated.bind(this);
		this.activationHandler = this.activationHandler.bind(this);
		this.cancellationHandler = this.cancellationHandler.bind(this);
		this.retryHandler = this.retryHandler.bind(this);
	}

	componentDidMount() {
		notifier.on('upgrade', this.upgradeUpdated);

		upgradeService.requestById(this.props.match.params.upgradeId)
			.then(upgrade => this.setState({upgrade}))
			.catch(error => notifier.error(error.message, error.subject || "Failed Request", 10000, () => {window.location = `/upgrades`}));
	}

	componentWillUnmount() {
		notifier.remove('upgrade', this.upgradeUpdated);
	}
	
	render() {
		const {upgrade, progress} = this.state;
		
		
		let userCanActivate = true;
		let user = JSON.parse(sessionStorage.getItem("user"));
		if (user) {
			userCanActivate = user.enforce_activation_policy === "false" || (upgrade.created_by != null && upgrade.created_by !== user.username);
		}
		
		const actions = [
			{
				label: "Activate Upgrade", handler: this.activationHandler,
				disabled: !userCanActivate || progress.active > 0,
				detail: userCanActivate ? "Activate all items to proceed with upgrade" : "The same user that scheduled an upgrade cannot activate it",
				spinning: this.state.isActivating
			},
			{
				label: "Cancel Upgrade", handler: this.cancellationHandler,
				disabled: progress.cancelled > 0 || progress.done,
				spinning: this.state.isCancelling
			},
			{
				label: "Retry Failed Jobs", handler: this.retryHandler,
				disabled: progress.errors === 0, 
				spinning: this.state.isRetrying
			}
		];

		return (
			<div>
				<RecordHeader type="Upgrade" icon={UPGRADE_ICON} title={upgrade.description} actions={actions}
							  parent={{label: "Upgrades", location: `/upgrades}`}}>
					<HeaderField label="Scheduled Start Time" value={`${moment(upgrade.start_time).format('lll')} (${moment(upgrade.start_time).fromNow()})`}/>
					<HeaderField label="Status" value={upgrade.status}/>
					<HeaderField label="Created By" value={upgrade.created_by}/>
				</RecordHeader>
				<ProgressBar progress={progress.percentage} success={progress.errors === 0 && progress.cancelled === 0}/>
				<div className="slds-card slds-p-around--xxx-small slds-m-around--medium">
					<Tabs id="UpgradeRecord">
						<div label="Requests">
							<UpgradeItemCard upgrade={upgrade} onFetch={this.fetchItems} refetchOn="upgrade-items"/>
						</div>
						<div label="Jobs">
							<UpgradeJobCard onFetch={this.fetchJobs} refetchOn="upgrade-jobs"/>
						</div>
					</Tabs>
					<DataTableFilterHelp/>
				</div>
			</div>
		);
	}
	
	// Handlers
	fetchItems() {
		return upgradeItemService.findByUpgrade(this.props.match.params.upgradeId);
	};

	fetchJobs() {
		return new Promise((resolve, reject) => {
			upgradeJobService.requestAllJobsInUpgrade(this.props.match.params.upgradeId).then(
				jobs => {
					this.setState({progress: getProgress(jobs)});
					resolve(jobs);
				}).catch(reject);
		});
	}

	upgradeUpdated(upgrade) {
		if (upgrade && this.state.upgrade.id === upgrade.id) {
			this.setState({upgrade});
		}
	}

	activationHandler() {
		if (window.confirm(`Are you sure you want to activate this upgrade?`)) {
			this.setState({isActivating: true});
			upgradeService.activate(this.state.upgrade.id).then(() => window.location.reload()).catch((e) => {
				this.setState({isActivating: false});
				NotificationManager.error(e.message, "Activation Failed");
			});
		}
	}

	cancellationHandler() {
		if (window.confirm(`Are you sure you want to cancel this upgrade?  All ${this.state.items.length} request(s) will be cancelled.`)) {
			this.setState({isCancelling: true});
			upgradeService.cancel(this.state.upgrade.id).then(() => window.location.reload()).catch((e) => {
				this.setState({isCancelling: false});
				NotificationManager.error(e.message, "Cancellation Failed");
			});
		}
	}

	retryHandler() {
		if (window.confirm(`Are you sure you want to retry this upgrade?  Only failed jobs will be rescheduled.`)) {
			this.setState({isRetrying: true});
			upgradeService.retry(this.state.upgrade.id).then((upgrade) => window.location = `/upgrade/${upgrade.id}`)
			.catch((e) => {
				this.setState({isRetrying: false});
				NotificationManager.error(e.message, "Retry Failed");
			});
		}
	}
}