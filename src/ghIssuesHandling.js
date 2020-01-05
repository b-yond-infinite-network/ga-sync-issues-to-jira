const core      = require('@actions/core')
const github    = require('@actions/github')

async function handleIssues( useSubtaskMode ) {
    const actionPossible = [ "opened", "edited", "deleted", "transferred", "pinned", "unpinned", "closed", "reopened", "assigned", "unassigned", "labeled", "unlabeled", "locked", "unlocked", "milestoned", "demilestoned"]
    const actionToConsider = [ "opened", "edited", "deleted", "closed", "reopened", "assigned", "unassigned", "labeled", "unlabeled", "milestoned", "demilestoned"]

    try {
        const jiraProjectKey = core.getInput('JIRA_PROJECTKEY')
        if( !jiraProjectKey ){
            console.log( '==> action skipped -- no project key' )
            return null
        }
        const changeEvent = github.context.payload

        if( !changeEvent.issue )
            throw Error( 'This action was not triggered by a Github Issue.\nPlease ensure your GithubAction is triggered only when an Github Issue is changed' )

        if( actionPossible.indexOf( changeEvent.action ) === -1 )
            core.warning( `The Github Issue event ${ changeEvent.action } is not supported.\nPlease try raising an issue at \nhttps://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/issues` )

        if( actionToConsider.indexOf( changeEvent.action ) === -1 ){
            console.log( `==> action skipped for unsupported event ${ changeEvent.action }` )
            return null
        }

        console.log( '-- retrieving all changes' )
        if( !changeEvent.changes ){
            console.log( `==> action skipped for event ${ changeEvent.action } due to empty change set ${ JSON.stringify( changeEvent ) }` )
            return null
        }

        console.log( '-- retrieving all labels' )
        const issueDetails = changeEvent.issue
        if( !issueDetails.labels
            ||  issueDetails.labels.length < 1
            ||  ( issueDetails.labels.length === 1 && issueDetails.labels[ 0 ].name === '' ) ){
            console.log( `==> action skipped for event ${ changeEvent.action } - no labels found at all` )
            return null
        }

        const jiraGHLabelsWithIDAsNames = issueDetails.labels.filter( ( currentLabel ) => {
            if( !currentLabel.name ) {
                console.log( '--- some label have no name' )
                return false
            }
            
            return ( useSubtaskMode
                     ? currentLabel.name.startsWith( 'sub' + jiraProjectKey )
                       || currentLabel.name.startsWith( jiraProjectKey )
                     : currentLabel.name.startsWith( jiraProjectKey ) )
        } )
        const jiraKeys = jiraGHLabelsWithIDAsNames.map( currentGHLabel => currentGHLabel.name )

        // console.log( `-- labeled: ${ JSON.stringify( jiraIDS ) }` )
        if( jiraKeys.length < 1 ){
            console.log( `==> action skipped for event ${ changeEvent.action } - no labels found starting with the project key -- ignoring all labels` )
            return null
        }

        return {
            event:      changeEvent.action,
            jiraKeys:   jiraKeys,
            changes:    changeEvent.changes,
            details:    issueDetails
        }

    } catch( error ) {
        core.setFailed( error.message )
    }
}

module.exports = handleIssues
