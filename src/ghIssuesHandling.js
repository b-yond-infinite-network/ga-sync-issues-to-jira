const core = require('@actions/core')
const { GitHub } = require('@actions/github')

async function handleIssues( ) {
    const actionPossible = [ "deleted", "transferred", "pinned", "unpinned", "closed", "reopened", "assigned", "unassigned", "labeled", "unlabeled", "locked", "unlocked", "milestoned", "demilestoned"]
    const actionToConsider = [ "deleted", "closed", "reopened", "assigned", "unassigned", "labeled", "unlabeled", "milestoned", "demilestoned"]

    try {
        const jiraProjectKey = core.getInput('JIRA_PROJECTKEY')

        console.log( `==> Token ${ core.getInput('GITHUB_TOKEN') }`)
        console.log( `==> return of require ${ require('@actions/github') }`)

        console.log( `==> context and all  ${ GitHub }` )

        const githubSession = new GitHub( core.getInput('GITHUB_TOKEN') )
        console.log( `==> session  ${ githubSession }` )
        const payload       = JSON.stringify( githubSession.context.payload, undefined, 2 )

        if( !payload.issue )
            throw Error( 'This action was not triggered by a Github Issue.\nPlease ensure your GithubAction is triggered only when an Github Issue is changed' )

        if( actionPossible.indexOf( payload.action ) == -1 )
            throw Error( `The Github Issue event ${ payload.action } is not supported.\nPlease try raising an issue at \nhttps://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/issues` )

        if( actionToConsider.indexOf( payload.action ) == -1 ){
            console.log( `==> action skipped for event ${ payload.action }` )
            return null
        }

        let changedValues = { }
        Object.entries( payload.changes ).forEach( currentChangedAttribute => {
            changedValues[ currentChangedAttribute ] = payload.issue[ currentChangedAttribute ]
        } )
        const jiraIDS = payload.labels.filter( currentLabel => currentLabel.startsWith( jiraProjectKey ) )

        if( jiraIDS.length() < 1 )
            return null

        return {
            event:          payload.action,
            stories:        jiraIDS,
            changes:        changedValues,
            details:        payload.issue
        }

    } catch (error) {
        core.setFailed( error.message )
    }
}

module.exports = handleIssues;