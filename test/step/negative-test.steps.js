const merge 		= require( 'deepmerge' )

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
const oldLog            = console.log

const mockLog           = ( function( ) {
    const consoleLogs = []
    const oldLog = console.log
    console.log = function ( message ) {
        consoleLogs.push( message )
        oldLog.apply( console, arguments )
    }
    return consoleLogs
} )



Before( ( ) => {
    actionProjectName   = 'TEST'
    actionIssueType     = 'Subtask'
    overloadValues      = { "changes": { "title": { "from": "A github Issue in Github" } } }
    
    jiraBaseURL         = 'fakejira'
    jiraUserEmail       = 'testuser@test.domain'
    jiraApiToken        = 'testAPITOKEN'
} )

Given( 'I specify an empty project', async () => {
    actionProjectName = ''
} )

Given( /^I specify project '(.*)'$/, async ( projectName ) => {
    actionProjectName = projectName
})


And( /^the action triggered is '(.*)'$/, async ( eventTypeDescription ) => {
    overloadValues = merge( overloadValues, { action: eventTypeDescription } )
})

And(/^the action has no change$/, () => {
    overloadValues = merge( overloadValues, { changes: null } )
})

And(/^the label is (.*)$/,  ( labelForIssue ) => {
    if( labelForIssue !== '' )
        overloadValues = merge( overloadValues, { "issue": { "labels": [ { "name": labelForIssue } ] } } )
    else
        overloadValues = merge( overloadValues, { "issue": { "labels": [ ] } } )
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

And( /the issue in GITHUB has the same title, body and comments than the labelled '(.*)' issue in JIRA$/,  ( labelForIssue ) => {
    const valueInTest123 = require( "../helper/rest-capture-jira/v2/jira.issue.TEST-456{all}" )
    overloadValues = merge( overloadValues,
                            { "issue":
                                    {
                                        "title": valueInTest123[ 'fields' ][ 'summary' ],
                                        "body" : valueInTest123[ 'fields' ][ 'description' ],
                                        "labels": [ { "name": labelForIssue } ],
                                        "number" : 1
                                    } } )
} )

When( /^the action is not triggered from a github action$/, function () {
    mockNonGHActionsIssue( )
} )

When( /^the action is triggered$/, async (  ) => {
    mockGHActionsIssue( actionProjectName, actionIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, overloadValues )
})


Then(/^we detect it's not an action and exit successfully$/, async () => {
    const consoleLogsOutput = mockLog()
    
    const { syncJiraWithGH } = require( './sync' )
    await syncJiraWithGH()
    
    console.log = oldLog
    
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Ending Action' ) !== -1 ) ).not.toEqual( -1 )
} )

Then(/^we do nothing, skip the action, exit successfully and write '([^']*)' as a warning in the logs$/, async ( warningToFindInLogs ) => {
    const consoleLogsOutput = mockLog()
    
    const { syncJiraWithGH } = require( './sync' )
    await syncJiraWithGH()
    
    console.log = oldLog
    
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( '==> action skipped' ) !== - 1 ) ).not.toEqual( -1 )
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Ending Action' ) !== -1 ) ).not.toEqual( -1 )
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( warningToFindInLogs ) !== -1 ) ).not.toEqual( -1 )
} )

Then(/^we fail the action, exit with error '(.*)' and write "(.*)" in the logs$/, async ( errorContent, messageToFindInLogs ) => {
    captureConsole.startCapture()
    const consoleLogsOutput = mockLog()
    
    const { syncJiraWithGH } = require( './sync' )
    await syncJiraWithGH()
    
    console.log     = oldLog
    
    captureConsole.stopCapture()
    const consoleErrors = captureConsole.getCapturedText()
    expect( consoleErrors.findIndex( currentOutput => currentOutput.startsWith( `::error::"${ errorContent }"` ) ) ).not.toEqual( -1 )
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Ending Action' ) !== -1 ) ).not.toEqual( -1 )
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( messageToFindInLogs ) !== -1 ) ).not.toEqual( -1 )
} )

Then(/^we finish the action successfully and write '([^']*)' as an info in the logs$/, async ( warningToFindInLogs ) => {
    const consoleLogsOutput = mockLog()
    
    const { syncJiraWithGH } = require( './sync' )
    await syncJiraWithGH()
    
    console.log = oldLog
    
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( '==> action success' ) !== - 1 ) ).not.toEqual( -1 )
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Action Finished' ) !== -1 ) ).not.toEqual( -1 )
    expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( warningToFindInLogs ) !== -1 ) ).not.toEqual( -1 )
} )


After(() => {
    unmockJIRACalls()
} )


Fusion( '../feature/Negative.feature' )
