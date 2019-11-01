const core = require('@actions/core')
const github = require('@actions/github');

async function handleIssues( ) {
    const actionPossible = [ "edited", "deleted", "transferred", "pinned", "unpinned", "closed", "reopened", "assigned", "unassigned", "labeled", "unlabeled", "locked", "unlocked", "milestoned", "demilestoned"]
    const actionToConsider = [ "edited", "deleted", "closed", "reopened", "assigned", "unassigned", "labeled", "unlabeled", "milestoned", "demilestoned"]

    try {
        const jiraProjectKey = core.getInput('JIRA_PROJECTKEY')

        const changeEvent = github.context.payload

        if( !changeEvent.issue )
            throw Error( 'This action was not triggered by a Github Issue.\nPlease ensure your GithubAction is triggered only when an Github Issue is changed' )

        if( actionPossible.indexOf( changeEvent.action ) === -1 )
            throw Error( `The Github Issue event ${ changeEvent.action } is not supported.\nPlease try raising an issue at \nhttps://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/issues` )

        if( actionToConsider.indexOf( changeEvent.action ) === -1 ){
            console.log( `==> action skipped for event ${ changeEvent.action }` )
            return null
        }

        console.log( '-- retrieving all changes' )
        let changedValues = { }
        Object.entries( changeEvent.changes ).forEach( currentChangedAttribute => {
            changedValues[ currentChangedAttribute ] = changeEvent.issue[ currentChangedAttribute ]
        } )

        console.log( '-- retrieving all labels' )
        const issueDetails = changeEvent.issue
        if( !issueDetails.labels
            ||  issueDetails.labels.length < 1 ){
            console.log( `==> action skipped for event ${ changeEvent.action } - no labels found at all` )
            return null
        }

        const jiraIDS = issueDetails.labels.filter( currentLabel => currentLabel.name.startsWith( jiraProjectKey ) )

        console.log( `=found that many labels with keys ${ JSON.stringify( jiraIDS ) }` )
        if( jiraIDS.length < 1 ){
            console.log( `==> action skipped for event ${ changeEvent.action } - no jira issuekeys labels found at all` )
            return null
        }

        return {
            event:      changeEvent.action,
            stories:    jiraIDS,
            changes:    changedValues,
            details:    issueDetails
        }

    } catch( error ) {
        core.setFailed( error.message )
    }
}

module.exports = handleIssues;