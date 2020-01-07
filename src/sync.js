const core              = require( '@actions/core' )

const handleIssues          = require( './ghIssuesHandling' )
const handleSubtask         = require( './jiraSubtaskHandling' )
const { jiraUpdateIssue }   = require( './jiraUpdate' )

async function syncJiraWithGH() {
    try {
        const useSubtaskMode = core.getInput( 'SUBTASK_MODE' )
        const DEBUG = core.getInput( 'DEBUG_MODE' )
                      ? ( messageToLog ) => {
                console.log( '<<DEBUG=' + JSON.stringify( messageToLog ) ) + '>>'
            }
                      : ( messageToLog ) => {
            }
    
    
        const issueEventTriggered = await handleIssues( useSubtaskMode, DEBUG )
        if( !issueEventTriggered ) {
            console.log( `--! no change to be handled` )
            console.log( 'Ending Action' )
            return
        }
    
        const subtasksOrIssuesToUpdate = await handleSubtask( issueEventTriggered, useSubtaskMode, DEBUG )
        DEBUG( subtasksOrIssuesToUpdate )
        if( !subtasksOrIssuesToUpdate
            || subtasksOrIssuesToUpdate.length === 0 ) {
            console.log( `--! no subtask or issue to upgrade found at all` )
            console.log( 'Ending Action' )
            return
        }
    
        for( const currentSubtaskOrIssue of subtasksOrIssuesToUpdate ) {
            console.log( `Updating JIRA Issue: ${ JSON.stringify( currentSubtaskOrIssue.key ) }` )
            const changeToPush = listPrioritizedDifference( issueEventTriggered, currentSubtaskOrIssue )
            DEBUG( changeToPush )
            if( Object.keys( changeToPush ).length <= 0 ) {
                console.log( `-- all changes are already synced between issue#${ issueEventTriggered.details[ 'number' ] } in GITHUB and issue ${ currentSubtaskOrIssue.key } in JIRA` )
                break
            }
        
            const updateResult = await jiraUpdateIssue( currentSubtaskOrIssue, changeToPush )
            if( updateResult ) {
                console.log( `--- updated: ${ JSON.stringify( changeToPush ) }` )
            }
        }
        
        console.log( `==> action success` )
        console.log( `Action Finished` )
        core.setOutput('time', new Date().toTimeString() )
        
        return 0
    } catch ( error ) {
        core.setFailed( error.message )
        return 1
    }
}

function listPrioritizedDifference( issueChangeTriggered, subtaskOrIssueToChange ){
    //TODO missing events to consider [ "assigned", "unassigned", "unlabeled", "milestoned", "demilestoned"]
    const changes = {}
    
    if( issueChangeTriggered.event === 'open'
        || issueChangeTriggered.event === 'edited'
        || issueChangeTriggered.event === 'reopened'
        || issueChangeTriggered.event === 'labeled' ){
        if( issueChangeTriggered.details.title
            && subtaskOrIssueToChange.fields
            && subtaskOrIssueToChange.fields.summary !== issueChangeTriggered.details.title )
            changes.summary = issueChangeTriggered.details.title
    
        if( issueChangeTriggered.details.body
            && subtaskOrIssueToChange.fields
            && subtaskOrIssueToChange.fields.description !== issueChangeTriggered.details.body )
            changes.description = issueChangeTriggered.details.body
    }

    // if( issueChangeTriggered.event === 'edited' ){
    //     if( 'title' in issueChangeTriggered.changes )
    //         changes.summary = issueChangeTriggered.details.title
    //
    //
    //     if( 'description' in issueChangeTriggered.changes )
    //         changes.body = issueChangeTriggered.changes.description
    // }
    
    
    if( issueChangeTriggered.event === 'deleted' ) {
        changes.delete = true
    }
    
    if( issueChangeTriggered.event === 'closed' ) {
        changes.closed = true
    }
    
    return changes
}

module.exports.syncJiraWithGH = syncJiraWithGH
