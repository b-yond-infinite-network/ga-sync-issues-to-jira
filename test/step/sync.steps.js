const merge 		= require( 'deepmerge' )

const { CaptureConsole } = require('@aoberoi/capture-console' )
const captureConsole = new CaptureConsole()

const { Before, After, Given, When, Then, And, Fusion } = require( 'jest-cucumber-fusion' )

const { mockGHActionsIssue, mockGHActionsIssueWithModes, mockGHAPI } = require( '../helper/mockGH-actions' )
let actionProjectName                                                = 'BLA'
let actionIssueType                                                  = 'Subtask'
let overloadGITHUBValues                                             = null
let overloadJIRAValues                                               = null


const { mockJIRACalls, unmockJIRACalls }     = require( '../helper/mockJIRA-api' )
let jiraBaseURL         = 'https://fakejira'
let jiraUserEmail       = 'testuser@test.domain'
let jiraApiToken        = 'testAPITOKEN'

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


Before( () => {
	actionProjectName   = 'TEST'
	actionIssueType     = 'Subtask'
	overloadGITHUBValues= {}
	overloadJIRAValues	= {}
	
	jiraBaseURL         = 'fakejira'
	jiraUserEmail       = 'testuser@test.domain'
	jiraApiToken        = 'testAPITOKEN'
} )

Given( /^The action is configured with project '(.*)', issue type '(.*)' and label '([^']*)'$/,
	    ( projectName, issueType, labelForIssue ) => {
	actionProjectName 		= projectName
	actionIssueType 		= issueType
	overloadGITHUBValues 	= { "issue" : { "labels" : [ { "name": labelForIssue } ] } }
} )

And( /^the change is set on '(.*)' with a from value of '(.*)' in GITHUB$/, ( changeOn, changeFrom ) => {
	// const changeOnObject = {}
	// changeOnObject[ changeOn ] = { "from": changeFrom }
	// overloadGITHUBValues = merge( overloadGITHUBValues, { "changes": changeOnObject } )
	if( !overloadGITHUBValues.changes )
		overloadGITHUBValues.changes = {}
	
	overloadGITHUBValues.changes[ changeOn ] = { "from": changeFrom }
} )

And( /^the title is now set to '(.*)' in GITHUB$/, titleContent => {
	overloadGITHUBValues = merge( overloadGITHUBValues, { "issue": { "title": titleContent } } )
} )

And( /^the summary was set to '(.*)' in JIRA$/, summaryContent => {
	overloadJIRAValues[ 'jira.issue.TEST-456{all}.json' ] = merge( overloadJIRAValues[ 'jira.issue.TEST-456{all}.json' ],
																   { "httpReplyData": { "fields": { "summary": summaryContent } } } )
} )

And( /^the body is now set to '(.*)' in GITHUB$/, bodyContent => {
	overloadGITHUBValues = merge( overloadGITHUBValues, { "issue": { "body": bodyContent } } )
} )

And( /^the description was set to '(.*)' in JIRA$/, bodyContent => {
	overloadJIRAValues[ 'jira.issue.TEST-456{all}.json' ] = merge( overloadJIRAValues[ 'jira.issue.TEST-456{all}.json' ],
																   { "httpReplyData": { "fields": { "body": bodyContent } } } )
} )

And( /^the comments are now set to '(.*)' in GITHUB$/, commentContentInGH => {
	overloadGITHUBValues = merge( overloadGITHUBValues, { "issue": { "comments": commentContentInGH } } )
} )

And( /^the comments were set to '(.*)' in JIRA$/, commentContentinJIRA => {
	overloadJIRAValues[ 'jira.issue.TEST-456{all}.json' ] = merge( overloadJIRAValues[ 'jira.issue.TEST-456{all}.json' ],
																   { "httpReplyData": { "fields": { "comments": commentContentinJIRA } } } )
} )


And( /^we add a label '(.*)'$/, labelToAdd => {
	overloadGITHUBValues 	= { "issue" : { "labels" : [ { "name": labelToAdd } ] } }
} )

And( /^there's no assignee$/, () => {} )

When( /^the action triggers$/,  async (  ) => {
	mockJIRACalls( 'https://' + jiraBaseURL, jiraUserEmail, jiraApiToken, overloadJIRAValues )
	
	mockGHAPI()
	
	await mockGHActionsIssue( 'opened',
							  actionProjectName,
							  actionIssueType,
							  jiraBaseURL,
							  jiraUserEmail,
							  jiraApiToken,
							  overloadGITHUBValues )
} )

When( /^a '(.*)' action triggers$/, async ( actionStatus ) => {
	mockJIRACalls( 'https://' + jiraBaseURL, jiraUserEmail, jiraApiToken, overloadJIRAValues )
	
	mockGHAPI()
	
	await mockGHActionsIssue( actionStatus, actionProjectName, actionIssueType,
							  jiraBaseURL, jiraUserEmail, jiraApiToken,
							  overloadGITHUBValues )
} )

When( /^a '(.*)' action triggers with SUBTASK_MODE OFF$/, async ( actionStatus ) => {
	mockJIRACalls( 'https://' + jiraBaseURL, jiraUserEmail, jiraApiToken, overloadJIRAValues )
	
	mockGHAPI()
	
	await mockGHActionsIssueWithModes( actionStatus, actionProjectName, actionIssueType,
									   jiraBaseURL, jiraUserEmail, jiraApiToken,
									   false, false, false, false,
									   'CREATE-IN-JIRA', 'own',
									   overloadGITHUBValues )
} )

When( /^a '(.*)' action triggers with EPIC_MODE ON$/, async ( actionStatus ) => {
	mockJIRACalls( 'https://' + jiraBaseURL, jiraUserEmail, jiraApiToken, overloadJIRAValues )
	
	mockGHAPI()
	
	await mockGHActionsIssueWithModes( actionStatus, actionProjectName, actionIssueType,
									   jiraBaseURL, jiraUserEmail, jiraApiToken,
									   false, true, true, false,
									   'CREATE-IN-JIRA', 'own',
									   overloadGITHUBValues )
} )

When( /^a '(.*)' action triggers with SUBTASK_MODE OFF and EPICMODE ON$/, async ( actionStatus ) => {
	mockJIRACalls( 'https://' + jiraBaseURL, jiraUserEmail, jiraApiToken, overloadJIRAValues )
	
	mockGHAPI()
	
	await mockGHActionsIssueWithModes( actionStatus, actionProjectName, actionIssueType,
									   jiraBaseURL, jiraUserEmail, jiraApiToken,
									   false, false, true, false,
									   'CREATE-IN-JIRA', 'own',
									   overloadGITHUBValues )
} )

Then( /^we upgrade JIRA, write '([^']*)' in the logs and exit successfully$/, async ( messageToFindInLogs ) => {
	captureConsole.startCapture()
	const consoleLogsOutput = mockLog()
	
	const { syncJiraWithGH } = require( '../../src/sync' )
	await syncJiraWithGH()
	
	console.log = oldLog
	captureConsole.stopCapture()
	const consoleErrors = captureConsole.getCapturedText()
	
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( messageToFindInLogs ) !== -1 ) ).not.toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( '==> action success' ) !== -1 ) ).not.toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Action Finished' ) !== -1 ) ).not.toEqual( -1 )
} )

Then(/^we upgrade JIRA, write '([^']*)' and '([^']*)' in the logs and exit successfully$/, async ( messageToFindInLogs, secondMessageToFind ) => {
	captureConsole.startCapture()
	const consoleLogsOutput = mockLog()
	
	const { syncJiraWithGH } = require( '../../src/sync' )
	await syncJiraWithGH()
	
	console.log = oldLog
	captureConsole.stopCapture()
	const consoleErrors = captureConsole.getCapturedText()
	
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( messageToFindInLogs ) !== -1 ) ).not.toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( secondMessageToFind ) !== -1 ) ).not.toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( '==> action success' ) !== -1 ) ).not.toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Action Finished' ) !== -1 ) ).not.toEqual( -1 )
} )

Then(/^we upgrade JIRA, don't write '([^']*)' in the logs and exit successfully$/, async ( messageNotToFindInLogs ) => {
	captureConsole.startCapture()
	const consoleLogsOutput = mockLog()
	
	const { syncJiraWithGH } = require( '../../src/sync' )
	await syncJiraWithGH()
	
	console.log = oldLog
	captureConsole.stopCapture()
	const consoleErrors = captureConsole.getCapturedText()
	
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( messageNotToFindInLogs ) !== -1 ) ).toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( '==> action success' ) !== -1 ) ).not.toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Action Finished' ) !== -1 ) ).not.toEqual( -1 )
} )


After(() => {
	unmockJIRACalls()
} )

//TODO let jest-cucumber guy know that a Scenario Outline step with more than 2 variables
// ( And '.*' because '.*' ) fails if we replace on by the outline variables
// ( And '.*' because '<outlineVariable>'
Fusion( '../feature/Sync.feature' )
