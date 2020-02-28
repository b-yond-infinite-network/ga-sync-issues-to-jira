const core   = require( '@actions/core' )
const github = require( '@actions/github' )

function sliceGHInput( rawText ) {
    let slicesResult      = []
    let currentParameters = rawText
    let snippet           = null
    
    while( ( snippet = /(?:,\s?)*(?<paramValue>[a-zA-Z1-9-]+)/g.exec( currentParameters ) ) ) {
        if( snippet.groups.paramValue ) {
            slicesResult.push( snippet.groups.paramValue )
            currentParameters = currentParameters.replace( snippet.groups.paramValue, '' )
        }
    }
    
    return slicesResult
}

async function handleIssues( useSubtaskMode, DEBUG ) {
    const actionPossible   = [ "opened",
                               "edited",
                               "deleted",
                               "transferred",
                               "pinned",
                               "unpinned",
                               "closed",
                               "reopened",
                               "assigned",
                               "unassigned",
                               "labeled",
                               "unlabeled",
                               "locked",
                               "unlocked",
                               "milestoned",
                               "demilestoned" ]
    const actionToConsider = [ "opened",
                               "edited",
                               "deleted",
                               "closed",
                               "reopened",
                               "assigned",
                               "unassigned",
                               "labeled",
                               "unlabeled",
                               "milestoned",
                               "demilestoned" ]
    
    try {
        const jiraProjectKey = core.getInput( 'JIRA_PROJECTKEY' )
        if( !jiraProjectKey ) {
            console.log( '==> action skipped -- no project key(s)' )
            return null
        }
        
        
        const jiraIssueTypeName = core.getInput( 'JIRA_ISSUETYPE_NAME' )
        if( !jiraIssueTypeName ) {
            console.log( '==> action skipped -- no issue type name(s)' )
            return null
        }
        
        const changeEvent = github.context.payload
        
        if( !changeEvent.issue ) {
            throw Error(
                'This action was not triggered by a Github Issue.\nPlease ensure your GithubAction is triggered only when an Github Issue is changed' )
        }
        
        if( actionPossible.indexOf( changeEvent.action ) === -1 ) {
            core.warning( `The Github Issue event ${ changeEvent.action } is not supported.\nPlease try raising an issue at \nhttps://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/issues` )
        }
    
        DEBUG( changeEvent )
    
        if( actionToConsider.indexOf( changeEvent.action ) === -1 ) {
            console.log( `==> action skipped for unsupported event ${ changeEvent.action }` )
            return null
        }
        
        console.log( '-- retrieving all changes' )
        if( changeEvent.action === 'edited'
            && !changeEvent.changes ) {
            console.log( `==> action skipped for event ${ changeEvent.action } due to empty change set ${ JSON.stringify( changeEvent ) }` )
            return null
        }
        
        console.log( '-- retrieving all labels' )
        const issueDetails = changeEvent.issue
        if( !issueDetails.labels
            || issueDetails.labels.length < 1
            || ( issueDetails.labels.length === 1 && issueDetails.labels[ 0 ].name === '' ) ) {
            console.log( `==> action skipped for event ${ changeEvent.action } - no labels found at all` )
            return null
        }
        
        
        const arrProjectKeys = sliceGHInput( jiraProjectKey )
        if( arrProjectKeys.length === 0 ) {
            arrProjectKeys.push( jiraProjectKey )
        }
        
        const arrIssueTypes = sliceGHInput( jiraIssueTypeName )
        if( arrIssueTypes.length === 0 ) {
            arrIssueTypes.push( jiraIssueTypeName )
        }
        
        const jiraAttachKeys = useSubtaskMode
                               ? issueDetails.labels.reduce( ( currentKeysAndType, currentLabel ) => {
                if( !currentLabel.name ) {
                    console.log( '--- some label have no name' )
                    return currentKeysAndType
                }
                const idxFoundProject = arrProjectKeys.findIndex( currentProjectKey =>
                                                                      currentLabel.name.startsWith( currentProjectKey +
                                                                                                    '-' ) )
                if( idxFoundProject === -1 ) {
                    return currentKeysAndType
                }
                const indexIssueTypeToUse = idxFoundProject >= arrIssueTypes.length
                                            ? arrIssueTypes.length - 1
                                            : idxFoundProject
                
                currentKeysAndType.push( {
                                             jiraIssueKey:  currentLabel.name,
                                             jiraIssueType: arrIssueTypes[ indexIssueTypeToUse ],
                                         } )
                return currentKeysAndType
            }, [] )
                               : []
        
        const jiraReplaceKeys = issueDetails.labels.reduce( ( currentKeysAndType, currentLabel ) => {
            if( !currentLabel.name ) {
                console.log( '--- some label have no name' )
                return currentKeysAndType
            }
            const idxFoundProject = arrProjectKeys.findIndex( currentProjectKey =>
                                                                  ( useSubtaskMode
                                                                    ? currentLabel.name.startsWith( 'own' +
                                                                                                    currentProjectKey +
                                                                                                    '-' )
                                                                    : currentLabel.name.startsWith( currentProjectKey +
                                                                                                    '-' ) ) )
            if( idxFoundProject === -1 ) {
                return currentKeysAndType
            }
            const indexIssueTypeToUse = idxFoundProject >= arrIssueTypes.length
                                        ? arrIssueTypes.length - 1
                                        : idxFoundProject
            
            currentKeysAndType.push( {
                                         jiraIssueKey:  currentLabel.name,
                                         jiraIssueType: arrIssueTypes[ indexIssueTypeToUse ],
                                     } )
            return currentKeysAndType
        }, [] )
        
        // console.log( `-- labeled: ${ JSON.stringify( jiraIDS ) }` )
        if( jiraAttachKeys.length === 0 &&
            jiraReplaceKeys.length === 0 ) {
            console.log( `==> action skipped for event ${ changeEvent.action } - no labels found starting with the project key -- ignoring all labels` )
            return null
        }
        
        return {
            event:              changeEvent.action,
            jiraKeysToAttachTo: jiraAttachKeys,
            jiraKeysToReplace:  jiraReplaceKeys,
            changes:            changeEvent.changes,
            details:            issueDetails,
        }
        
    } catch( error ) {
        core.setFailed( error.message )
    }
}

module.exports = handleIssues
