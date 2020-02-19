const core              = require( '@actions/core' )

const handleIssues          = require( './ghIssuesHandling' )
const handleSubtask         = require( './jiraSubtaskHandling' )
const handleSync            = require( './jiraUpdate' )

async function syncJiraWithGH() {
    try {
        const useSubtaskMode = core.getInput( 'SUBTASK_MODE' ) === 'true'
        const DEBUG = core.getInput( 'DEBUG_MODE' ) === 'true'
                      ? ( messageToLog ) => ( console.log( `<<<<DEBUG----------------\n${ JSON.stringify( messageToLog ) }\n----------------DEBUG>>>>` ) )
                      : () => {}
    
    
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
            await handleSync( currentSubtaskOrIssue, issueEventTriggered, DEBUG )
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



module.exports.syncJiraWithGH = syncJiraWithGH
