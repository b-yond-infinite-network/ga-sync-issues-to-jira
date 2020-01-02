const { Before, After, Given, When, Then, And, Fusion } = require( 'jest-cucumber-fusion' )

const { mockGHActionsIssue, mockNonGHActionsIssue }     = require( '../helper/mockGH-actions' )
let actionProjectName   = 'BLA'
let actionIssueType     = 'Subtask'
let overloadValues      = null


const { mockJIRACalls, unmockJIRACalls }     = require( '../helper/mockJIRA-api' )
let jiraBaseURL         = 'https://fakejira'
let jiraUserEmail       = 'testuser@test.domain'
let jiraApiToken        = 'testAPITOKEN'

const { CaptureConsole } = require('@aoberoi/capture-console' )
const captureConsole = new CaptureConsole()

let consoleOutput = []


Before( () => {
    actionProjectName   = 'TEST'
    actionIssueType     = 'Subtask'
    overloadValues      = null
    
    jiraBaseURL         = 'fakejira'
    jiraUserEmail       = 'testuser@test.domain'
    jiraApiToken        = 'testAPITOKEN'
    
    consoleOutput       = []
} )

Given( 'I specify an empty project', async () => {
    actionProjectName = ''
} )

Given( /^I specify project '(.*)'$/, async ( projectName ) => {
    actionProjectName = projectName
})


And( /^the action triggered is '(.*)'$/, async ( eventTypeDescription ) => {
    overloadValues = { ...overloadValues, ...{ action: eventTypeDescription } }
})

And(/^the action has no change$/, () => {
    overloadValues = { ...overloadValues, ...{ changes: null } }
})

And(/^the label is (.*)$/,  ( labelForIssue ) => {
    overloadValues = { ...overloadValues, ...{ "issue": { "labels": [ { "name": labelForIssue } ] } } }
})

And( /^I specify a wrong JIRA API URL$/, async ( projectName ) => {
    jiraBaseURL = 'notajiraapi'
} )

And( 'I push wrong JIRA credentials in my GA', () => {
    mockJIRACalls( 'https://' + jiraBaseURL, actionProjectName, actionIssueType, jiraUserEmail, jiraApiToken )
    jiraUserEmail = 'wronguser@wrong.domain'
    jiraApiToken = 'wrongAPITOKEN'
} )
And( /^the JIRA issue type is set to '(.*)'$/, ( issueType ) => {
    actionIssueType = issueType
} )

And( 'my JIRA credentials are correct', () => {
    mockJIRACalls( 'https://' + jiraBaseURL, actionProjectName, actionIssueType, jiraUserEmail, jiraApiToken )
} )

And( 'the issue in GITHUB has the same title, description and priority in JIRA', () => {

} )

When( /^the action is not triggered from a github action$/, function () {
    mockNonGHActionsIssue( )
} )

When( /^the action is triggered$/, async (  ) => {
    mockGHActionsIssue( actionProjectName, actionIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, overloadValues )
})

When( /^the title, assignee and comments are the same$/, function () {

} )


Then(/^we detect it's not an action and exit successfully$/, async () => {
    captureConsole.startCapture()
    
    const syncEngine = require('../../src/sync')
    
    await syncEngine()
    
    captureConsole.stopCapture()
    consoleOutput = captureConsole.getCapturedText()
    expect( consoleOutput.findIndex( ( currentOutput ) => ( currentOutput.indexOf( 'Ending Action' ) ) ) ).not.toEqual( -1 )
} )

Then(/^we do nothing, skip the action and exit successfully$/, async () => {
    captureConsole.startCapture()
    
    const syncEngine = require('../../src/sync')

    await syncEngine()
    
    captureConsole.stopCapture()
    consoleOutput = captureConsole.getCapturedText()
    expect( consoleOutput.findIndex( ( currentOutput ) => ( currentOutput.indexOf( '==> action skipped ' ) ) ) ).not.toEqual( -1 )
    expect( consoleOutput.findIndex( ( currentOutput ) => ( currentOutput.indexOf( 'Ending Action' ) ) ) ).not.toEqual( -1 )
} )

Then(/^we fail the action and exit with error '(.*)'$/, async ( errorContent ) => {
    captureConsole.startCapture()
    
    const syncEngine = require('../../src/sync')
    
    await syncEngine()
    
    const processexit = process.stdout
    captureConsole.stopCapture()
    consoleOutput = captureConsole.getCapturedText()
    expect( consoleOutput.findIndex( ( currentOutput ) => ( currentOutput.startsWith( `::error::"${ errorContent }"` ) ) ) ).not.toEqual( -1 )
    expect( consoleOutput.findIndex( ( currentOutput ) => ( currentOutput.indexOf( 'Ending Action' ) ) ) ).not.toEqual( -1 )
} )

And( /^write '([^"]*)' in the logs$/, ( messageToFindInLogs ) => {
    expect( consoleOutput.findIndex( ( currentOutput ) => ( currentOutput.indexOf( messageToFindInLogs ) !== -1 ) ) ).not.toEqual( -1 )
} )

After(() => ( unmockJIRACalls() ) )


Fusion( '../feature/Negative.feature' )
