const merge 		= require( 'deepmerge' )

const { Before, After, Given, When, Then, And, Fusion } = require( 'jest-cucumber-fusion' )

const { mockGHActionsIssue, mockNonGHActionsIssue }     = require( '../helper/mockGH-actions' )
let actionProjectName   = 'BLA'
let actionIssueType     = 'Subtask'
let overloadGITHUBValues= null
let overloadJIRAValues	= null


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

Given( /^The action triggered is '(.*)' with project '(.*)', issue type '(.*)' and label '(.*)'$/,
	    ( eventType, projectName, issueType, labelForIssue ) => {
	actionProjectName 		= projectName
	actionIssueType 		= issueType
	overloadGITHUBValues 	= { "action": eventType, "issue" : { "labels" : [ { "name": labelForIssue } ] } }
} )

And( /^the change is set on '(.*)' with a from value of '(.*)' in GITHUB$/, ( changeOn, changeFrom ) => {
	const changeOnObject = {}
	changeOnObject[ changeOn ] = { "from": changeFrom }
	overloadGITHUBValues = merge( overloadGITHUBValues, { "changes": changeOnObject } )
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

When( /^the action triggers$/,  (  ) => {
	mockJIRACalls( 'https://' + jiraBaseURL, actionProjectName, actionIssueType, jiraUserEmail, jiraApiToken, overloadJIRAValues )
	mockGHActionsIssue( actionProjectName, actionIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, overloadGITHUBValues )
})

Then(/^we upgrade JIRA and exit successfully$/, async ( messageToFindInLogs ) => {
	const consoleLogsOutput = mockLog()
	
	const syncEngine = require('../../src/sync')
	
	await syncEngine()
	console.log = oldLog
	
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( '==> action success' ) ) ).not.toEqual( -1 )
	expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Action Finished' ) !== -1 ) ).not.toEqual( -1 )
} )


After(() => {
	unmockJIRACalls()
} )


Fusion( '../feature/Sync.feature' )
