const { mockCalls } = require( './fileMock' )

const merge      = require( 'deepmerge' )
const path       = require( 'path' )
const fs         = require( 'fs' )
const util       = require( 'util' )
const fileAccess = util.promisify( fs.access )


function setGAEnvironmentWithModes( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken,
                                    modeDebug, modeSubtask, modeEpic, modeAssigneePush, labelForceCreate, labelOwn,
                                    payloadToLoad ) {
    // ACTION PROPERTIES
    process.env[ 'INPUT_GITHUB_TOKEN' ]          = 'MDU6SXNzdWU1MTM1NzQ0NTI='
    process.env[ 'INPUT_DEBUG_MODE' ]            = modeDebug
    process.env[ 'INPUT_SUBTASK_MODE' ]          = modeSubtask
    process.env[ 'INPUT_EPIC_MODE' ]             = modeEpic
    process.env[ 'INPUT_ASSIGNEE_PUSH' ]         = modeAssigneePush
    process.env[ 'INPUT_FORCE_CREATION_LABEL' ]  = labelForceCreate
    process.env[ 'INPUT_OWN_LABEL' ]             = labelOwn
    // the key (prefix) used by Jira for the project
    process.env[ 'INPUT_JIRA_PROJECTKEY' ]       = jiraKey
    // the issue type to use to track the Github Issues
    process.env[ 'INPUT_JIRA_ISSUETYPE_NAME' ]   = jiraIssueType
    // hostname to connect to Jira (do not add https://)
    process.env[ 'INPUT_JIRA_BASEURL' ]          = jiraBaseURL
    // user email/login address to use the token of
    process.env[ 'INPUT_JIRA_USEREMAIL' ]        = jiraUserEmail
    // token to use to connect to Jira
    process.env[ 'INPUT_JIRA_APITOKEN' ]         = jiraApiToken
    // transition name in JIRA equivalent to GITHUB assigned (In Progress)
    process.env[ 'INPUT_JIRA_STATE_INPROGRESS' ] = "In Progress"
    // transition name in JIRA equivalent to GITHUB closed (Done)
    process.env[ 'INPUT_JIRA_STATE_DONE' ]       = "Done"
    // transition name in JIRA equivalent to GITHUB open/reopened (To Do)
    process.env[ 'INPUT_JIRA_STATE_TODO' ]       = "To Do"
    
    process.env[ 'INPUT_REPO-TOKEN' ] = "FAKETOKEN"
    
    process.env[ 'GITHUB_REPOSITORY' ] = 'foo/bar'
    process.env[ 'GITHUB_EVENT_PATH' ] = path.join( __dirname, payloadToLoad )
}


function setGAEnvironment( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken, payloadToLoad ) {
    setGAEnvironmentWithModes( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken,
                               true, true, false, false,
                               'CREATE-IN-JIRA', 'own',
                               payloadToLoad )
}

function mockNonGHActionsIssue() {
    setGAEnvironment( '', '', '', '', '',
                      'action-capture/action.non-gh.issue.json' )
    
    const github           = require( '@actions/github' )
    github.context.payload = require( process.env[ 'GITHUB_EVENT_PATH' ] )
}


async function mockGHActionsIssueWithModes( gaActionChange, jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail,
                                            jiraApiToken,
                                            modeDebug, modeSubtask, modeEpic, modeAssigneePush, labelForceCreate,
                                            labelOwn,
                                            overwriteContextPayloadValues ) {
    try {
        await fileAccess( __dirname + '/action-capture/action.issue.' + gaActionChange + '.json' )
        
        setGAEnvironmentWithModes( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken,
                                   modeDebug, modeSubtask, modeEpic, modeAssigneePush,
                                   'CREATE-IN-JIRA', 'own',
                                   'action-capture/action.issue.' + gaActionChange + '.json' )
    }
    catch( accessError ) {
        setGAEnvironmentWithModes( jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken,
                                   modeDebug, modeSubtask, modeEpic, modeAssigneePush,
                                   'CREATE-IN-JIRA', 'own',
                                   'action-capture/action.issue.opened.json' )
    }
    
    const github           = require( '@actions/github' )
    github.context.payload = require( process.env['GITHUB_EVENT_PATH'] )
    if( overwriteContextPayloadValues ) {
        github.context.payload = merge( github.context.payload,
                                        overwriteContextPayloadValues,
                                        {
                                            arrayMerge: ( destinationArray, sourceArray, options ) => {
                                                if( sourceArray && sourceArray.length === 0 ) {
                                                    return sourceArray
                                                }
                                                else {
                                                    return merge( destinationArray, sourceArray )
                                                }
                                            },
                                        } )
    }
}


async function mockGHActionsIssue( gaActionChange, jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken,
                                   overwriteContextPayloadValues ) {
    
    await mockGHActionsIssueWithModes( gaActionChange, jiraKey, jiraIssueType, jiraBaseURL, jiraUserEmail, jiraApiToken,
                                       true, true, false, false,
                                       'CREATE-IN-JIRA', 'own',
                                       overwriteContextPayloadValues )
}

async function mockGHAPI( overrideForFiles ) {
    // const nock = require( 'nock' )
    // nock('https://api.github.com')
    //     .get('/repos/b-yond-infinite-network/ga-sync-issues-to-jira/labels/TEST-555')
    //     .reply(200, {})
    
    mockCalls( 'rest-capture-github/', 'github',
               'https://api.github.com', '/repos/b-yond-infinite-network/ga-sync-issues-to-jira/',
               null, null, overrideForFiles )
}

module.exports.mockGHActionsIssue          = mockGHActionsIssue
module.exports.mockGHActionsIssueWithModes = mockGHActionsIssueWithModes
module.exports.mockNonGHActionsIssue       = mockNonGHActionsIssue
module.exports.mockGHAPI                   = mockGHAPI
