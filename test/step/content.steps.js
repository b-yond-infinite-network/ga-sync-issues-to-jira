const merge = require( 'deepmerge' )

const { CaptureConsole } = require( '@aoberoi/capture-console' )
const captureConsole     = new CaptureConsole()

const { Before, After, Given, When, Then, And, Fusion } = require( 'jest-cucumber-fusion' )

const { mockGHActionsIssue, mockNonGHActionsIssue } = require( '../helper/mockGH-actions' )
let actionProjectName                               = 'BLA'
let actionIssueType                                 = 'Subtask'
let overloadGITHUBValues                            = null
let overloadJIRAValues                              = null


const { mockJIRACalls }  = require( '../helper/mockJIRA-api' )
let jiraBaseURL          = 'https://fakejira'
let jiraUserEmail        = 'testuser@test.domain'
let jiraApiToken         = 'testAPITOKEN'
let logWithUpdateMessage = null

const oldLog = console.log

const mockLog = ( function () {
	const consoleLogs = []
	const oldLog      = console.log
	console.log       = function ( message ) {
		consoleLogs.push( message )
		oldLog.apply( console, arguments )
	}
	return consoleLogs
} )


function extractContentFromContentPath( contentRoot, contentPath ) {
	return contentPath.reduce( ( lastContent, currentDepthLevelValue ) => {
		expect( lastContent ).toBeDefined()
		expect( lastContent.content ).toBeDefined()
		if( lastContent.content instanceof Array ) {
			expect( lastContent.content[ currentDepthLevelValue ] ).toBeDefined()
			expect( lastContent.content.length ).toBeGreaterThan( currentDepthLevelValue )
			return lastContent.content[ currentDepthLevelValue ]
		}
		
		expect( lastContent.content.content ).toBeInstanceOf( Array )
		expect( lastContent.content.content.length ).toBeGreaterThan( currentDepthLevelValue )
		expect( lastContent.content.content[ currentDepthLevelValue ] ).toBeDefined()
		
		return lastContent.content.content[ currentDepthLevelValue ]
	}, contentRoot )
}

function transformUpdateFieldTo( logIncludingUpdateMessage, fieldToLookAtFromLogs, depthArray ) {
	const stringJsonUpdatePart = logIncludingUpdateMessage.replace( '--- updated with: ', '' )
	const jsonUpdatePart       = JSON.parse( stringJsonUpdatePart )
	
	expect( jsonUpdatePart[ fieldToLookAtFromLogs ] ).toBeDefined()
	
	return extractContentFromContentPath( { content: jsonUpdatePart[ fieldToLookAtFromLogs ] },
										  JSON.parse( depthArray ) )
}


Before( () => {
	actionProjectName    = 'TEST'
	actionIssueType      = 'Subtask'
	overloadGITHUBValues = {}
	overloadJIRAValues   = {}
	
	jiraBaseURL   = 'fakejira'
	jiraUserEmail = 'testuser@test.domain'
	jiraApiToken  = 'testAPITOKEN'
} )


Given( /^The action is configured with project '(.*)', issue type '(.*)' and label '([^']*)'$/,
	   ( projectName, issueType, labelForIssue ) => {
		   actionProjectName    = projectName
		   actionIssueType      = issueType
		   overloadGITHUBValues = { "issue": { "labels": [ { "name": labelForIssue } ] } }
	   } )

And( 'the body is now set with the markdown:', lineTable => {
	const anchor        = Object.getOwnPropertyNames( lineTable[ 0 ] ) [ 0 ]
	const markdownTable = [ anchor.charAt( 0 ) === "'" ? anchor.substring( 1 ) : anchor,
							...lineTable.map( currentLine => currentLine[ anchor ] ) ]
	const bodyContent   = markdownTable.reduce( ( currentContent, currentLineInTable ) => {
		return currentContent
			   + '\n'
			   + ( currentLineInTable.charAt( 0 ) === "'"
				   ? currentLineInTable.substring( 1 )
				   : currentLineInTable )
		
	} )
	
	overloadGITHUBValues = merge( overloadGITHUBValues, { "issue": { "body": bodyContent } } )
} )

And( /^the change is set on '(.*)' with a from value of '(.*)' in GITHUB$/, ( changeOn, changeFrom ) => {
	// const changeOnObject = {}
	// changeOnObject[ changeOn ] = { "from": changeFrom }
	// overloadGITHUBValues = merge( overloadGITHUBValues, { "changes": changeOnObject } )
	if( !overloadGITHUBValues.changes ) {
		overloadGITHUBValues.changes = {}
	}
	
	overloadGITHUBValues.changes[ changeOn ] = { "from": changeFrom }
} )

And( /^the body is now set to '(.*)' in GITHUB$/, bodyContent => {
	overloadGITHUBValues = merge( overloadGITHUBValues, { "issue": { "body": bodyContent } } )
} )

When( /^the action triggers$/, async () => {
	mockJIRACalls( 'https://' + jiraBaseURL,
				   jiraUserEmail,
				   jiraApiToken,
				   overloadJIRAValues )
	await mockGHActionsIssue( 'opened',
							  actionProjectName,
							  actionIssueType,
							  jiraBaseURL,
							  jiraUserEmail,
							  jiraApiToken,
							  overloadGITHUBValues )
} )

Then( /^we upgrade JIRA, write '([^']*)' and '([^']*)' in the logs and exit successfully$/,
	  async ( messageToFindInLogs, secondMessageToFind ) => {
		  captureConsole.startCapture()
		  const consoleLogsOutput = mockLog()
	
		  const { syncJiraWithGH } = require( '../../src/sync' )
		  await syncJiraWithGH()
	
		  console.log = oldLog
		  captureConsole.stopCapture()
		  const consoleErrors = captureConsole.getCapturedText()
	
		  const indexWithUpdateMessage = consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf(
			  messageToFindInLogs ) !== -1 )
		  logWithUpdateMessage         = consoleLogsOutput[ indexWithUpdateMessage ]
		  expect( logWithUpdateMessage ).not.toEqual( -1 )
		  expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( secondMessageToFind ) !== -1 ) )
			  .not
			  .toEqual( -1 )
		  expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( '==> action success' ) !== -1 ) )
			  .not
			  .toEqual( -1 )
		  expect( consoleLogsOutput.findIndex( currentOutput => currentOutput.indexOf( 'Action Finished' ) !== -1 ) )
			  .not
			  .toEqual( -1 )
	  } )

Then( And( /^the ADF chunk at content path (\[(?: *\d+(?: |, |,)*)+\]) has type '(.*)'$/,
		   ( depthArray, contentType ) => {
			   const finalContentAtDepth = transformUpdateFieldTo( logWithUpdateMessage, 'description', depthArray )
	
			   expect( finalContentAtDepth.type ).toEqual( contentType )
		   } ) )

Then( And( /^the ADF chunk at content path (\[(?: *\d+(?: |, |,)*)+\]) has attribute '(.*)'$/,
		   ( depthArray, attributeAndValueToFind ) => {
			   const finalContentAtDepth = transformUpdateFieldTo( logWithUpdateMessage, 'description', depthArray )
	
			   const parsedAttributes = JSON.parse( attributeAndValueToFind )
			   expect( finalContentAtDepth.attrs ).toEqual( expect.objectContaining( parsedAttributes ) )
		   } ) )

Then( And( /^the ADF chunk at content path (\[(?: *\d+(?: |, |,)*)+\]) contains '(.*)'$/,
		   ( depthArray, expectedTranslationObject ) => {
			   const finalContentAtDepth = transformUpdateFieldTo( logWithUpdateMessage, 'description', depthArray )
	
			   const parsedExpectedObject = JSON.parse( expectedTranslationObject )
	
			   expect( finalContentAtDepth.content )
				   .toEqual( expect.arrayContaining( [ expect.objectContaining( parsedExpectedObject ) ] ) )
		   } ) )


Fusion( '../feature/Content.feature' )
