
const merge 		= require( 'deepmerge' )
const nock          = require( 'nock' )
const path          = require( 'path' )
const fs            = require( 'fs' )
const util          = require( 'util' )
const fileAccess    = util.promisify( fs.access )

function setGAEnvironment( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, payloadToLoad ){
    // ACTION PROPERTIES
    process.env[ 'INPUT_DEBUG_MODE' ]           = true
    process.env[ 'INPUT_SUBTASK_MODE' ]         = true
    // the key (prefix) used by Jira for the project
    process.env[ 'INPUT_JIRA_PROJECTKEY' ]      = jiraKey
    // the issue type to use to track the Github Issues
    process.env[ 'INPUT_JIRA_ISSUETYPE_NAME' ] = jiraIssueType
    // hostname to connect to Jira (do not add https://)
    process.env[ 'INPUT_JIRA_BASEURL' ]         = jiraBaseURL
    // user email/login address to use the token of
    process.env[ 'INPUT_JIRA_USEREMAIL' ]       = jiraUserEmail
    // token to use to connect to Jira
    process.env[ 'INPUT_JIRA_APITOKEN' ]        = jiraApiToken
    // transition name in JIRA equivalent to GITHUB assigned (In Progress)
    process.env[ 'INPUT_JIRA_STATE_INPROGRESS' ] = "In Progress"
    // transition name in JIRA equivalent to GITHUB closed (Done)
    process.env[ 'INPUT_JIRA_STATE_DONE' ]      = "Done"
    // transition name in JIRA equivalent to GITHUB open/reopened (To Do)
    process.env[ 'INPUT_JIRA_STATE_TODO' ]      = "To Do"
    
    process.env['INPUT_REPO-TOKEN']             = "FAKETOKEN"
    
    process.env['GITHUB_REPOSITORY']            = 'foo/bar'
    process.env['GITHUB_EVENT_PATH']            = path.join(__dirname, payloadToLoad )
}

function mockNonGHActionsIssue( ) {
    setGAEnvironment( '', '', '', '', '', 'action-capture/action.non-gh.issue.json' )
    
    const github            = require('@actions/github')
    github.context.payload  = require( process.env['GITHUB_EVENT_PATH'] )
}

async function mockGHActionsIssue( gaActionChange, jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, overwriteContextPayloadValues ) {
    try{
        await fileAccess( __dirname + '/action-capture/action.issue.' + gaActionChange + '.json' )
        
        setGAEnvironment( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, 'action-capture/action.issue.' + gaActionChange + '.json'  )
    }
    catch( accessError ) {
        setGAEnvironment( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, 'action-capture/action.issue.opened.json'  )
    }
    
    const github            = require( '@actions/github' )
    github.context.payload  = require( process.env['GITHUB_EVENT_PATH'] )
    if( overwriteContextPayloadValues ){
        github.context.payload = merge( github.context.payload,
                                        overwriteContextPayloadValues,
                                        { arrayMerge: (destinationArray, sourceArray, options) => {
                                            if( sourceArray && sourceArray.length === 0 )
                                                return sourceArray
                                            else
                                                return merge( destinationArray, sourceArray )
                                        } } )
    }
    
    
    // nock('https://api.github.com')
    //     .persist()
    //     .post('/repos/foo/bar/issues/10/comments', '{\"body\":\"hello\"}')
    //     .reply(200);
}

module.exports.mockGHActionsIssue       = mockGHActionsIssue
module.exports.mockNonGHActionsIssue    = mockNonGHActionsIssue
