const core           = require( '@actions/core' )
const github         = require( '@actions/github' )
const { sliceInput } = require( './utils' )

async function handleGHIssues( useSubtaskMode, useEpicMode, DEBUG ) {
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
    
        if( useSubtaskMode ) { console.log( '-- SUBTASK MODE is ON - we\'re attaching ourselves to labelled issue(s)' ) }
        else { console.log( '-- SUBTASK MODE is OFF - we\'re replacing the labelled issue(s)' ) }
    
        if( useEpicMode ) { console.log( '-- EPIC MODE is ON - we maintain Epic Link from the labelled issue(s)' ) }
        else { console.log( '--- EPIC MODE is OFF - we ignore Epic Link from the labelled issue(s)' ) }
    
        const labelForceCreate = core.getInput( 'FORCE_CREATION_LABEL' )
        console.log( `--- Force creation label is ${ labelForceCreate }` )
    
        const labelOwn = core.getInput( 'OWN_LABEL' )
        console.log( `--- Own label is ${ labelOwn }` )
    
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
    
    
        const arrProjectKeys = sliceInput( jiraProjectKey )
        if( arrProjectKeys.length === 0 ) {
            arrProjectKeys.push( jiraProjectKey )
        }
    
        const arrIssueTypes = sliceInput( jiraIssueTypeName )
        if( arrIssueTypes.length === 0 ) {
            arrIssueTypes.push( jiraIssueTypeName )
        }
    
        //we look into each of the labels the issue has
        // and match them up with our allowed project keys
        const jiraAttachKeys = useSubtaskMode
                               ? findLabelledKeysMeantToBeAttachedTo( issueDetails.labels,
                                                                      arrProjectKeys,
                                                                      arrIssueTypes )
                               : []
    
        const jiraReplaceKeys = findLabelledKeysMeantToBeReplaced( issueDetails.labels, arrProjectKeys, arrIssueTypes,
                                                                   useSubtaskMode, labelOwn, labelForceCreate )
    
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
            repository:         changeEvent.repository,
        }
    
    }
    catch( error ) {
        core.setFailed( error.message )
    }
}

function findLabelledKeysMeantToBeAttachedTo( arrLabels, arrAllowedProjectKeys, arrAllowedIssueTypes ) {
    return arrLabels.reduce( ( currentKeysAndType, currentLabel ) => {
        if( !currentLabel.name ) {
            console.log( '--- some label have no name' )
            return currentKeysAndType
        }
        const idxFoundProject = arrAllowedProjectKeys.findIndex( currentProjectKey => {
            return currentLabel.name.startsWith( currentProjectKey + '-' )
        } )
        
        if( idxFoundProject === -1 ) { return currentKeysAndType }
        
        const indexIssueTypeToUse = idxFoundProject >= arrAllowedIssueTypes.length
                                    ? arrAllowedIssueTypes.length - 1
                                    : idxFoundProject
        
        currentKeysAndType.push( {
                                     jiraIssueKey:  currentLabel.name,
                                     jiraIssueType: arrAllowedIssueTypes[ indexIssueTypeToUse ],
                                 } )
        return currentKeysAndType
    }, [] )
}

function findLabelledKeysMeantToBeReplaced( arrLabels, arrProjectKeys, arrIssueTypes, useSubtaskMode, labelOwn,
                                            labelForceCreate ) {
    return arrLabels.reduce( ( currentKeysAndType, currentLabel ) => {
        if( !currentLabel.name ) {
            console.log( '--- some label have no name' )
            return currentKeysAndType
        }
        const idxFoundProject = arrProjectKeys.findIndex( currentProjectKey =>
                                                              ( useSubtaskMode
                                                                ? currentLabel.name.startsWith( labelOwn +
                                                                                                currentProjectKey +
                                                                                                '-' )
                                                                  || currentLabel.name === labelForceCreate
                                                                : currentLabel.name.startsWith( currentProjectKey +
                                                                                                '-' )
                                                                  || currentLabel.name === labelForceCreate ) )
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
}

module.exports.handleGHIssues = handleGHIssues
