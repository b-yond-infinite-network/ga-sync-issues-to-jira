const core          = require('@actions/core')
const JiraClient    = require('jira-connector')

async function handleSubtask( issueChanges, useSubtaskMode ) {
    //ISSUE CHANGE will be:
    //      {
    //             event:          payload.action,
    //             jiraKeys:       jiraKeys,
    //             changes:        changedValues,
    //             details:        payload.issue
    //         }
    try {
        if( !issueChanges.jiraKeys ){
            //we have no parent task in JIRA, this should never happen
            console.log( `WARNING: no JIRA parent story is labelled.` )
        }

        const jiraProjectKey = core.getInput('JIRA_PROJECTKEY')
        console.log( `- we are pushed to project with key ${ jiraProjectKey }` )

        const jiraIssueTypeName = core.getInput('JIRA_ISSUETYPE_NAME')
        console.log( `-- using issue type ${ jiraIssueTypeName }` )

        //Let's login to JIRA first
        const jiraSession = new JiraClient({
            host: core.getInput('JIRA_BASEURL'),
            basic_auth: {
                email: core.getInput('JIRA_USEREMAIL'),
                api_token: core.getInput('JIRA_APITOKEN'),
            } } )
    
        console.log( '-- login in JIRA' )
        await loginToJiraAndCheckMyself( jiraSession )
        
    
        console.log( '--- checking project exist' )
        await checkProjectExist( jiraSession, jiraProjectKey )
    
    
        console.log( '--- checking issue type exist' )
        await findIssueTypeRequested( jiraSession, jiraProjectKey, jiraIssueTypeName )
        // const isSubtaskType = jiraIssuetypeFound.subtask

        const labelledJIRAIssuesKey = issueChanges.jiraKeys.filter( currentJiraIssueKey => currentJiraIssueKey.startsWith( jiraProjectKey ) )
        const labelledJIRASubtasksKey = ( useSubtaskMode
                                          ? issueChanges.jiraKeys.filter( currentJiraIssueKey => currentJiraIssueKey.startsWith( 'sub' + jiraProjectKey ) )
                                          : null )
        
        if( labelledJIRAIssuesKey.length === 0 ){
            console.log( `ERROR: no label match the project key ${ jiraProjectKey } -- this should have be trapped before, \n` +
                         'please log an issue at https://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/issues' )
            return
        }
        
        const subtaskOrIssueToUpdate =  await Promise.all( labelledJIRAIssuesKey.map( async ( currentJIRAIssueKey ) => {
            console.log(`-- currently attaching to JIRA Issue: ${ currentJIRAIssueKey }`)
            const foundJIRAIssue = await findIssue( jiraSession, currentJIRAIssueKey )
            if( !foundJIRAIssue )
                return null

            if( useSubtaskMode ){
                const summaryToLookFor = ( issueChanges.event === 'edited' && 'title' in issueChanges.changes
                                           ? issueChanges.changes.title.from
                                           : issueChanges.details[ 'title' ] )
                const foundSubtask = await findSubtaskWithKeysOrTitle( jiraSession, currentJIRAIssueKey, labelledJIRASubtasksKey, summaryToLookFor )
                if( foundSubtask )
                    return foundSubtask

                return await createJIRAIssue( jiraSession, jiraProjectKey, jiraIssueTypeName, currentJIRAIssueKey, summaryToLookFor )
            }

            //we're not in subtask mode, so we're replacing whatever info we got from the labelled story itself
            return currentJIRAIssueKey
        } ) )
        
        return subtaskOrIssueToUpdate.filter( currentSubtaskOrIssueToUpdate => currentSubtaskOrIssueToUpdate !== null )
        
    } catch ( error ) {
        core.setFailed( error.message
                        ? error.message
                        : error.body && error.body.message
                          ? error.body.message
                          : JSON.stringify( error ) )
    }
    
    async function loginToJiraAndCheckMyself( jiraSession ){
        try{  await jiraSession.myself.getMyself() }
    
        catch( myselfError ) {
            manageJIRAAPIError( myselfError, jiraSession )
        }
    }
    
    async function checkProjectExist( jiraSession, jiraProjectKey ){
        try{
            return await jiraSession.project.getProject( { projectIdOrKey: jiraProjectKey } )
        }
        
        catch( projectError ) {
            manageJIRAAPIError( projectError,
                                jiraSession,
                                `### project ${ jiraProjectKey } is invalid in JIRA`,
                                'Project doesn\'t exist in JIRA' )
        }
    }

    async function findIssueTypeRequested( jiraSession, jiraProjectKey, issuetypeToFind ){
        const foundData = await jiraSession.issue.getCreateMetadata( { projectKeys: jiraProjectKey, issuetypeNames: issuetypeToFind } )
        if( !foundData
            || !foundData.projects
            || foundData.projects.length === 0
            || !foundData.projects[ 0 ].issuetypes
            || !foundData.projects[ 0 ].issuetypes.length === 0 )
            return null

        const issueTypefound = foundData.projects[ 0 ].issuetypes.find( currentIssueType => currentIssueType.name === issuetypeToFind )
        if( !issueTypefound ){
            console.log(`### Issue Type ${ issuetypeToFind } is invalid in JIRA`)
            throw `The JIRA issue type specified does not exist or is ambiguous`
        }
        return issueTypefound
    }
    
    async function findIssue( jiraSession, jiraIssueKey ){
        try{
            return await jiraSession.issue.getIssue( { issueKey: jiraIssueKey } )
        }
        catch( issueError ) {
            manageJIRAAPIError( issueError,
                                jiraSession,
                                `### issue ${ jiraIssueKey } is inaccessible in JIRA\n==> skipping label ${ jiraIssueKey }` )
        }
    }
    
    async function findSubtaskWithKeysOrTitle( jiraSession, currentJIRAIssueKey, labelledJIRASubtasksKey, titleToLookFor ){
        // we're in subtask mode, so we want to find either:
        // - a label in the issue that starts with 'subXXXX-XXX'
        // - the story with the same title
        const jiraSubtasks = await findAllSubtasks( jiraSession, currentJIRAIssueKey )
    
        const foundWithKey = findSubtaskWithKey( jiraSubtasks, labelledJIRASubtasksKey )
        if( foundWithKey )
            return foundWithKey
    
        const foundWithTitle = findSubtaskWithTitle( jiraSubtasks, titleToLookFor )
        if( foundWithTitle )
            return foundWithTitle
    
        return null
    }
    
    async function findAllSubtasks( jiraSession, jiraParentIssueKey ){
        console.log( `-- looking for subtask of JIRA Issue ${ jiraParentIssueKey }` )
        const jiraParentIssue = await jiraSession.issue.getIssue( { issueKey: jiraParentIssueKey, fields: ['subtasks'] } )
        if( !jiraParentIssue[ "subtasks" ]
            || jiraParentIssue[ "subtasks" ].length() ) {
            // no subtask found means we will create one
            console.log( '----! no subtasks found, creating a new one' )
            return null
        }
        
        return jiraParentIssue[ "subtasks" ]
    }
    
    function findSubtaskWithKey( jiraSubtasksIssuesArray, githubLabelForSubtaskKeyArray ){
        console.log( `--- looking for one with key inside ${ JSON.stringify(  githubLabelForSubtaskKeyArray ) }` )
        //filtering subtask to find a key that is in the list of subtask Labels in GITHUB
        return jiraSubtasksIssuesArray.find( currentSubtask => githubLabelForSubtaskKeyArray.includes( currentSubtask.key ) )
    }
    
    function findSubtaskWithTitle( jiraSubtasksIssuesArray, summaryToFind ){
        console.log( `--- looking for one with summary ${ summaryToFind }` )
        //filtering subtask to find our title
        const arrFoundSubtasksIssueWithTitle = jiraSubtasksIssuesArray.filter( currentJIRASubtaskObject => {
            return currentJIRASubtaskObject.fields.summary && currentJIRASubtaskObject.fields.summary === summaryToFind
        } )
        
        if( arrFoundSubtasksIssueWithTitle.length === 0 ){
            console.log( `----! no subtasks found with the title '${ summaryToFind }' found, creating a new one` )
            return null
        }
    
        if( arrFoundSubtasksIssueWithTitle.length > 1 )
            console.log( '----! found more than one subtask with our title, returning the first' )
    
        return arrFoundSubtasksIssueWithTitle[ 0 ]
    }
    
    async function findGHIssueInSubtasks( jiraSession, storyKey, summaryToFind ){
        console.log( `-- looking for subtask of story ${ storyKey } with summary ${ summaryToFind }` )
        const parentIssue = await jiraSession.issue.getIssue({ issueKey: storyKey, fields: ['subtasks'] }) //, fields: 'sub-tasks'
        console.log( `--- found issue infos with subtasks: ${ JSON.stringify( parentIssue[ "subtasks" ] ) }` )
        if( !parentIssue[ "subtasks" ]
            || parentIssue[ "subtasks" ].length() ) {
            console.log( `---! it has no subtasks` )
            return null
        }

        return parentIssue[ "sub-tasks" ].find( async currentSubTask => {
            const subtaskData = await jiraSession.issue.getIssue({ issueKey: currentSubTask.outwardIssue.key, properties: 'summary' })
            return subtaskData.summary === summaryToFind
        } )
    }

    async function createJIRAIssue( jiraSession, jiraProjectKey, jiraIssueTypeNameToUse, jiraParentIssueKey, title ) {
        const issueData = {
            "update": {},
            "fields": {
                "project": {
                    "key": jiraProjectKey
                },
                "issuetype": {
                    "name": jiraIssueTypeNameToUse
                },
                "parent": {
                    "key": jiraParentIssueKey
                },
                "summary": title
                
                // "description": {
                //     "type": "doc",
                //     "version": 1,
                //     "content": [
                //         {
                //             "type": "paragraph",
                //             "content": [
                //                 {
                //                     "text": ,
                //                     "type": "text"
                //                 }
                //             ]
                //         }
                //     ]
                // },
                // "labels": [
                //     "GITHUB" + ghIssue.id
                // ]
            }
        }
        console.log( `Creating JIRA Issue of type : ${ JSON.stringify( jiraIssueTypeNameToUse ) } with title: ${ title }` )
        
        try{
            return await jiraSession.issue.createIssue( issueData )
        }
        catch( createError ){
            manageJIRAAPIError( createError,
                                jiraSession,
                                '##### Unable to create Issue in JIRA',
                                'Create Issue failed' )
        }
    }

    // async function syncJiraFromGH( jiraSession, jiraProjectKey, jiraIssueToSync, ghIssue ) {
    //     // const issueData = {
    //     //     "update": {},
    //     //     "fields": {
    //     //         "summary": ghIssue.title,
    //     //         "parent": {
    //     //             "key": parentStoryKey
    //     //         },
    //     //         "issuetype": {
    //     //             "name": issueTypeNameToUse
    //     //         },
    //     //         "project": {
    //     //             "key": jiraProjectKey
    //     //         },
    //     //         "description": {
    //     //             "type": "doc",
    //     //             "version": 1,
    //     //             "content": [
    //     //                 {
    //     //                     "type": "paragraph",
    //     //                     "content": [
    //     //                         {
    //     //                             "text": ghIssue.body,
    //     //                             "type": "text"
    //     //                         }
    //     //                     ]
    //     //                 }
    //     //             ]
    //     //         },
    //     //         "labels": [
    //     //             "GITHUB" + ghIssue.id
    //     //         ]
    //     //     }
    //     // }
    //     // console.log( `About to create the jira issue of type : ${ JSON.stringify( issueTypeNameToUse ) } with datas: ${ issueData }` )
    //     // await jiraSession.issue.createIssue( issueData )
    // }
    
    function manageJIRAAPIError( triggeredError, jiraSession, messageToLog, exceptionToRaise ){
        if( triggeredError.message ){
            console.log(`### JIRA API URL is invalid or inaccessible for ${ jiraSession.host }`)
            throw 'Invalid API URL'
        }
        else {
            const parsedError = JSON.parse( triggeredError )
            if( parsedError.statusCode ===  401 ){
                console.log(`### credentials unauthorized \n${ parsedError.body }`)
                throw 'Unauthorized'
            }
            if( !messageToLog )
                return
        
            if( parsedError.statusCode ===  404 ){
                console.log( messageToLog )
                if( exceptionToRaise ) throw exceptionToRaise
            }
        }
    }
}


module.exports = handleSubtask;
