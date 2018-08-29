import React from 'react';

import moment from "moment";
import DataTable from "../components/DataTable";
import {DataTableFilterHelp} from "../components/DataTableFilter";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		
		this.linkHandler = this.linkHandler.bind(this);
	}

	// Lifecycle
	render() {
		let columns = [
			{Header: "Number", accessor: "id", minWidth: 30, sortable: true, clickable: true},
			{Header: "Description", accessor: "description", minWidth: 300, clickable: true},
			{
				Header: "Scheduled Start Time",
				maxWidth: 200,
				id: "start_time",
				accessor: d => moment(d.start_time).format("YYYY-MM-DD HH:mm:ss A"),
				sortable: true,
				clickable: true
			},
			{Header: "When", id: "when", accessor: d => moment(d.start_time).fromNow(), clickable: true, sortable: false},
			{Header: "Created By", accessor: "created_by", sortable: true},
			{Header: "Status", accessor: "item_status", sortable: true}
		];
		return (
			<div>
				<DataTable id="UpgradeList" onFetch={this.props.onFetch} columns={columns}
						    onClick={this.linkHandler} onFilter={this.props.onFilter} filters={this.props.filters}/>
				<DataTableFilterHelp/>
			</div>
		);
	}

	// Handlers
	linkHandler(e, column, rowInfo) {
		if (rowInfo) {
			window.location = "/upgrade/" + rowInfo.row.id;
		}
	}
}