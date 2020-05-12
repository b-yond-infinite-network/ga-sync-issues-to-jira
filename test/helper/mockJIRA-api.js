const { mockCalls, unmockCalls } = require( './fileMock' )


function mockJIRACalls( jiraBaseUrl, jiraUserEmail, jiraApiToken, overrideForFiles ) {
	mockJIRACallsWithVersion( jiraBaseUrl, jiraUserEmail, jiraApiToken, 2, overrideForFiles )
	mockJIRACallsWithVersion( jiraBaseUrl, jiraUserEmail, jiraApiToken, 3, overrideForFiles )
}

function mockJIRACallsWithVersion( jiraBaseUrl, jiraUserEmail, jiraApiToken, version, overrideForFiles ) {
	mockCalls( 'rest-capture-jira/v' + version.toString(), 'jira',
			   jiraBaseUrl, '/rest/api/' + version.toString() + '/',
			   jiraUserEmail, jiraApiToken, overrideForFiles )
}


module.exports.mockJIRACalls   = mockJIRACalls
module.exports.unmockJIRACalls = unmockCalls
