const core = require( '@actions/core' )

const { handleGHIssues }   = require( './ghHandling' )
const { handleJIRAData }   = require( './jiraHandling' )
const { handleJIRAUpdate } = require( './jiraUpdate' )
const { handleGHUpdate }   = require( './ghUpdate' )

async function syncJiraWithGH() {
    try {
        const useSubtaskMode = core.getInput( 'SUBTASK_MODE' ) === 'true'
        const useEpicMode    = core.getInput( 'EPIC_MODE' ) === 'true'
        const DEBUG          = core.getInput( 'DEBUG_MODE' ) === 'true'
                               ? ( messageToLog ) => ( console.log( `<<<<DEBUG----------------\n${ JSON.stringify(
                messageToLog ) }\n----------------DEBUG>>>>` ) )
                               : () => {}
        
        
        const issueEventTriggered = await handleGHIssues( useSubtaskMode, useEpicMode, DEBUG )
        if( !issueEventTriggered ) {
            console.log( `--! no change to be handled` )
            console.log( 'Ending Action' )
            return
        }
        
        const arrSubtasksOrIssuesToUpdate = await handleJIRAData( issueEventTriggered,
                                                                  useSubtaskMode,
                                                                  useEpicMode,
                                                                  DEBUG )
        DEBUG( arrSubtasksOrIssuesToUpdate )
        if( !arrSubtasksOrIssuesToUpdate
            || arrSubtasksOrIssuesToUpdate.length === 0 ) {
            console.log( `--! no subtask or issue to upgrade found at all` )
            console.log( 'Ending Action' )
            return
        }
        
        //we push all changes to JIRA
        for( const currentSubtaskOrIssue of arrSubtasksOrIssuesToUpdate ) {
            await handleJIRAUpdate( currentSubtaskOrIssue, issueEventTriggered, DEBUG )
        }
        
        //we sync back to GITHUB
        console.log( `Syncing back to GITHUB` )
        await handleGHUpdate( issueEventTriggered, arrSubtasksOrIssuesToUpdate, DEBUG )
        
        console.log( `==> action success` )
        console.log( `Action Finished` )
        core.setOutput( 'time', new Date().toTimeString() )
        
        return 0
    } catch ( error ) {
        core.setFailed( error.message )
        return 1
    }
}



module.exports.syncJiraWithGH = syncJiraWithGH
