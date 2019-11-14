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
        console.log( `- we are pushed to project with key ${ projectKey }` )

        const issueTypeName = core.getInput('JIRA_ISSUETYPE_NAME')
        console.log( `-- using issue type ${ issueTypeName }` )

        //Let's login to JIRA first
        const jiraSession = new JiraClient({
            host: core.getInput('JIRA_BASEURL'),
            basic_auth: {
                email: core.getInput('JIRA_USEREMAIL'),
                api_token: core.getInput('JIRA_APITOKEN'),
            } } )

        const issuetypeFound = await findIssueTypeRequested( jiraSession, projectKey, issueTypeName )
        if( !issuetypeFound )
            throw `The issue type name specified does not exist or is ambiguous`

        const isSubtask = issuetypeFound.subtask

        for( const currentStory of issueChanges.stories ) {
            if( !currentStory.name.startsWith( projectKey ) )
            //skipping story not in our project
                return
            console.log(`-- currently attaching to story: ${ currentStory.name }`)

            const issueToSync = ( isSubtask
                                    ? await findGHIssueInSubtasks( jiraSession, currentStory.name, issueChanges.details['title'] )
                                    : await jiraSession.issue.getIssue( { issueKey: currentStory.name } ) )
            if (!issueToSync) {
                //there's no such Issue or Subtask in the issue,
                // we need to create one or attach one to the parent Story
                await createJiraIssueFromGHIssue( jiraSession, projectKey, currentStory, issueTypeName, isSubtask, issueChanges.details)
                return
            }
            //we found our issue/subtask, let's sync!


        }
    } catch ( error ) {
        core.setFailed( error.message )
    }

    async function findIssueTypeRequested( jiraSession, projectKey, issuetypeToFind ){
        const foundData = await jiraSession.issue.getCreateMetadata( { projectKeys: projectKey, issuetypeNames: issuetypeToFind } )
        if( !foundData
            || !foundData.projects
            || foundData.projects.length === 0
            || !foundData.projects[ 0 ].issuetypes
            || !foundData.projects[ 0 ].issuetypes.length === 0 )
            return null

        return foundData.projects[ 0 ].issuetypes.find( currentIssueType => currentIssueType.name === issuetypeToFind )
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
                    "GITHUB" + ghIssue.id
                ]
            }
        }
        console.log( `About to create the jira issue of type : ${ JSON.stringify( issueTypeNameToUse ) } with datas: ${ JSON.stringify( issueData ) }` )
        // await jiraSession.issue.createIssue( issueData )
    }

    async function syncJiraFromGH( jiraSession, projectKey, jiraIssueToSync, ghIssue ) {
        // const issueData = {
        //     "update": {},
        //     "fields": {
        //         "summary": ghIssue.title,
        //         "parent": {
        //             "key": parentStoryKey
        //         },
        //         "issuetype": {
        //             "name": issueTypeNameToUse
        //         },
        //         "project": {
        //             "key": projectKey
        //         },
        //         "description": {
        //             "type": "doc",
        //             "version": 1,
        //             "content": [
        //                 {
        //                     "type": "paragraph",
        //                     "content": [
        //                         {
        //                             "text": ghIssue.body,
        //                             "type": "text"
        //                         }
        //                     ]
        //                 }
        //             ]
        //         },
        //         "labels": [
        //             "GITHUB" + ghIssue.id
        //         ]
        //     }
        // }
        // console.log( `About to create the jira issue of type : ${ JSON.stringify( issueTypeNameToUse ) } with datas: ${ issueData }` )
        // await jiraSession.issue.createIssue( issueData )
    }
}


module.exports = handleSubtask;