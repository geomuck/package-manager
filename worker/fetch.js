const ps = require('./packagefetch');
const pvs = require('./packageversionfetch');
const licenses = require('./licensefetch');
const licenseorgs = require('./licenseorgfetch');
const orgs = require('./orgfetch');
const orgaccounts = require('./orgaccountfetch');
const accounts = require('./accountfetch');
const sfdc = require('../api/sfdcconn');
const orgpackageversions = require('./orgpackageversionfetch');
const admin = require('../api/admin');

const packageorgs = require('../api/packageorgs');

function fetch(fetchAll) {
    return new admin.AdminJob( 
        fetchAll ? "fetch-all" : "fetch-latest",
        fetchAll ? "Fetch all data" : "Fetch latest data", 
        [
            {
                name: "Populating license data",
                steps: [
                    {name: "Fetching packages", handler: (job) => ps.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll, job)},
                    {name: "Fetching package versions", handler: (job) => pvs.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll, job)},
                    {name: "Fetching latest package versions", handler: (job) => pvs.fetchLatest(job)},

                    {name: "Fetching licenses", handler: (job) => licenses.fetch(sfdc.NamedOrgs.sb62.orgId, fetchAll, job)},
                    {name: "Invalidating conflicting licenses", handler: (job) => licenses.markInvalid(job)},
                    {name: "Deriving orgs from licenses", handler: (job) => licenseorgs.fetch(fetchAll, job)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.sb62.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating production org data",
                steps: [
                    {name: "Fetching production orgs", handler: (job) => orgs.fetch(sfdc.NamedOrgs.bt.orgId, fetchAll, job)},
                    {name: "Invalidating missing production orgs", handler: (job) => orgs.mark(false, job)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
                    }
                }
            }, 
            {
                name: "Populating sandbox org data",
                steps: [
                    {name: "Fetching sandbox orgs", handler: (job) => orgs.fetch(sfdc.NamedOrgs.sbt.orgId, fetchAll, job)},
                    {name: "Invalidating missing sandbox orgs", handler: (job) => orgs.mark(true, job)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating org package versions",
                steps: [
                    {
                        name: "Deriving org package versions from licenses",
                        handler: (job) => orgpackageversions.fetch(fetchAll, job)
                    }]
            },
            {
                name: "Populating accounts data",
                steps: [
                    {name: "Deriving accounts from orgs", handler: (job) => orgaccounts.fetch(fetchAll, job)},
                    {name: "Fetching account names", handler: (job) => accounts.fetch(sfdc.NamedOrgs.org62.orgId, fetchAll, job)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
                    }
                }
            }
        ]);
}

/**
 * Fetch all orgs marked previously as invalid, in case any fell through the cracks before, or became valid again.
 * @returns {Promise<void>}
 */
function fetchInvalid() {
    return new admin.AdminJob("fetch-invalid", "Fetch invalid org data", 
        [
            {
                name: "Populating production org data",
                steps: [
                    {name: "Fetching invalid production orgs", handler: (job) => orgs.refetchInvalid(sfdc.NamedOrgs.bt.orgId, job)},
                    {name: "Invalidating missing production orgs", handler: (job) => orgs.mark(false, job)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.bt.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating sandbox org data",
                steps: [
                    {name: "Fetching invalid sandbox orgs", handler: (job) => orgs.fetch(sfdc.NamedOrgs.sbt.orgId, job)},
                    {name: "Invalidating missing sandbox orgs", handler: (job) => orgs.mark(true, job)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.sbt.orgId, packageorgs.Status.Invalid);
                    }
                }
            },
            {
                name: "Populating accounts data",
                steps: [
                    {name: "Deriving accounts from orgs", handler: (job) => orgaccounts.fetch(true, job)},
                    {name: "Fetching account names", handler: (job) => accounts.fetch(sfdc.NamedOrgs.org62.orgId, true, job)}],
                fail: (e) => {
                    if (e.name === "invalid_grant") {
                        packageorgs.updateOrgStatus(sfdc.NamedOrgs.org62.orgId, packageorgs.Status.Invalid);
                    }
                }
            }
        ]);
}

exports.fetch = fetch;
exports.fetchInvalid = fetchInvalid;
