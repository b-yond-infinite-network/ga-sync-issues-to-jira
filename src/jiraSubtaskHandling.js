const core = require('@actions/core')
const JiraClient = require('jira-connector')

async function handleSubtask( issueChanges ) {
    //ISSUE CHANGE will be:
    //      {
    //             event:          payload.action,
    //             stories:        jiraIDS,
    //             changes:        changedValues,
    //             details:        payload.issue
    //         }
    try {
        if( !issueChanges.stories ){
            //we have no parent task in JIRA, this should never happen
            console.log( `ERROR: no JIRA parent story is labelled.` )
        }

        const projectKey = core.getInput('JIRA_PROJECTKEY')
        console.log( `The project key is: ${ projectKey }` )

        const issueTypeName = core.getInput('JIRA_ISSUETYPE_NAME')
        console.log( `The issue type name to use is: ${ issueTypeName }` )

        //Let's login to JIRA first
        const jiraSession = new JiraClient({
            host: core.getInput('JIRA_BASEURL'),
            basic_auth: {
                email: core.getInput('JIRA_USEREMAIL'),
                api_token: core.getInput('JIRA_APITOKEN'),
            } } )

        const typesFound = await findIssueTypeRequested( jiraSession, projectKey, issueTypeName )
        console.log( `The issue types found: ${ JSON.stringify( typesFound ) }` )
        if( !typesFound ||
            !typesFound[ 0 ] )
            throw `The issue type name specified does not exist or is ambiguous`

        const isSubtask = typesFound[ 0 ].subtask

        issueChanges.stories.forEach( currentStoryID => {
            if( !currentStoryID.startsWith( projectKey ) )
                //skipping story not in our project
                return

            const subtaskFound = parseStorySubtasksToFindGHIssue( jiraSession, currentStoryID, issueChanges.details[ 'title' ] )
            if( !subtaskFound ){
                //there's no such subtask,
                // we need to create one attached to the parent Story
                createJiraIssueFromGHIssue( jiraSession, projectKey, currentStoryID, issueTypeName, isSubtask, issueChanges.details )
                return
            }


        } )

    } catch ( error ) {
        core.setFailed( error.message )
    }

    async function findIssueTypeRequested( jiraSession, projectKey, issuetypeToFind ){
        const foundData = await jiraSession.issue.getCreateMetadata( { projectKeys: projectKey, issuetypeNames: issuetypeToFind } )
        console.log( `-- found data on issue types: ${ JSON.stringify( foundData ) }` )
        if( !foundData
            || !foundData.projects
            || foundData.projects.length === 0
            || !foundData.projects[ 0 ].issuetypes
            || !foundData.projects[ 0 ].issuetypes.length === 0 )
            return null

        console.log( `-- found those issue types: ${ JSON.stringify( foundData.issuetypes ) }` )
        return foundData.projects[ 0 ].issuetypes.find( currentIssueType => currentIssueType.name === issuetypeToFind )
    }

    async function parseStorySubtasksToFindGHIssue( jiraSession, storyKey, summaryToFind ){
        const parentIssue = await jiraSession.issue.getIssue({ issueKey: storyKey, fields: 'sub-tasks' })
        if( !parentIssue[ "sub-tasks" ] )
            return null

        return parentIssue[ "sub-tasks" ].find( async currentSubTask => {
            const subtaskData = await jiraSession.issue.getIssue({ issueKey: currentSubTask.outwardIssue.key, fields: 'summary' })
            return subtaskData.summary === summaryToFind
        } )
    }

    async function createJiraIssueFromGHIssue( jiraSession, projectKey, parentStoryKey, issueTypeNameToUse, ghIssue ) {
        const issueData = {
            "update": {},
            "fields": {
                "summary": ghIssue.title,
                "parent": {
                    "key": parentStoryKey
                },
                "issuetype": {
                    "name": issueTypeNameToUse
                },
                "project": {
                    "key": projectKey
                },
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "text": ghIssue.body,
                                    "type": "text"
                                }
                            ]
                        }
                    ]
                },
                "labels": [
                    "GIHUTB" + ghIssue.id
                ]
            }
        }
        console.log( `About to create the jira issue of type : ${ issueTypeNameToUse } with datas: ${ issueData }` )
        // await jiraSession.issue.createIssue( issueData )
    }
}


module.exports = handleSubtask;