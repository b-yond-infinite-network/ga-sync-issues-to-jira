const core = require('@actions/core');
// const wait = require('./wait');
const github = require('@actions/github');


// most @actions toolkit packages have async methods
async function run() {
  try { 
    const jiraPrefix = core.getInput('jira-prefix');
    console.log(`Filtering using ${jiraPrefix} project in JIRA...`)

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload is: ${payload}`);
    console.log(`The prefix is: ${jiraPrefix}`);

    core.setOutput('status', payload);
    core.setOutput('time', new Date().toTimeString());
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
