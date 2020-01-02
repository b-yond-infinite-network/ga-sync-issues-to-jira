const core              = require('@actions/core')

const handleIssues      = require('./ghIssuesHandling')
const handleSubtask     = require('./jiraSubtaskHandling')

async function syncJiraWithGH() {
    try {
        const useSubtaskMode = core.getInput('SUBTASK_MODE')
        const issueEventTriggered = await handleIssues()

        if (!issueEventTriggered) {
            console.log('Ending Action')
            return
        }

        const subtaskOrIssueToUpdate = await handleSubtask( issueEventTriggered, useSubtaskMode )
        if( !subtaskOrIssueToUpdate ){
            console.log('Ending Action')
            return
        }
        console.log( `Updating JIRA Issue: ${ JSON.stringify( subtaskOrIssueToUpdate ) }` )
    
        core.setOutput('time', new Date().toTimeString() )
        
    } catch ( error ) {
        core.setFailed( error.message )
    }
}

module.exports = syncJiraWithGH
