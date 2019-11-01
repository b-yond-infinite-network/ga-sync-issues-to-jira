const core = require('@actions/core')
const handleIssues = require('./ghIssuesHandling')
const handleSubtask = require('./jiraSubtaskHandling')

async function run() {
  try {
    const issueEventTriggered = await handleIssues( )

    if( !issueEventTriggered ){
      console.log( 'This issue change event doesn\'t attach to any Jira subtask' )
      return
    }

    await handleSubtask( issueEventTriggered )

    core.setOutput('time', new Date().toTimeString())
  } 
  catch ( error ) {
    core.setFailed( error.message )
  }
}

run()