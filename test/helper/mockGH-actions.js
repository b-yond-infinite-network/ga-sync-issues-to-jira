const nock = require('nock')
const path = require('path')

function setGAEnvironment( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, payloadToLoad ){
    // ACTION PROPERTIES
    // the key (prefix) used by Jira for the project
    process.env['INPUT_JIRA_PROJECTKEY']        = jiraKey
    // the issue type to use to track the Github Issues
    process.env['INPUT_JIRA_ISSUETYPE_NAME']    = jiraIssueType
    // hostname to connect to Jira (do not add https://)
    process.env['INPUT_JIRA_BASEURL']           = jiraBaseURL
    // user email/login address to use the token of
    process.env['INPUT_JIRA_USEREMAIL']         = jiraUserEmail
    // token to use to connect to Jira
    process.env['INPUT_JIRA_APITOKEN']          = jiraApiToken
    
    process.env['INPUT_REPO-TOKEN']             = "FAKETOKEN"
    
    process.env['GITHUB_REPOSITORY']            = 'foo/bar'
    process.env['GITHUB_EVENT_PATH']            = path.join(__dirname, payloadToLoad )
}

function mockNonGHActionsIssue( ) {
    setGAEnvironment( '', '', '', '', '', 'payload.non-gh.Issue.json' )
    
    const github            = require('@actions/github')
    github.context.payload  = require( process.env['GITHUB_EVENT_PATH'] )
}

function mockGHActionsIssue( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, overwriteContextPayloadValues ) {
    setGAEnvironment( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, 'payload.gh.Issue.open.json' )
    
    
    const github            = require('@actions/github')
    github.context.payload  = require( process.env['GITHUB_EVENT_PATH'] )
    if( overwriteContextPayloadValues ){
        github.context.payload = {...github.context.payload, ...overwriteContextPayloadValues }
    }
    
    
    // nock('https://api.github.com')
    //     .persist()
    //     .post('/repos/foo/bar/issues/10/comments', '{\"body\":\"hello\"}')
    //     .reply(200);
}

module.exports.mockGHActionsIssue       = mockGHActionsIssue
module.exports.mockNonGHActionsIssue    = mockNonGHActionsIssue
