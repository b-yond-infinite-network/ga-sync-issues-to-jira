const core = require( '@actions/core' )
const JiraClient = require( 'jira-connector' )

async function handleSubtask( issueChanges, useSubtaskMode, DEBUG ) {
	//ISSUE CHANGE will be:
	//      {
	//             event:          payload.action,
	//             jiraKeys:       jiraKeys,
	//             changes:        changedValues,
	//             details:        payload.issue
	//         }
	try {
		if( !issueChanges.jiraKeys ) {
			//we have no parent task in JIRA, this should never happen
			console.log( `WARNING: no JIRA parent story is labelled.` )
		}
		
		const jiraProjectKey = core.getInput( 'JIRA_PROJECTKEY' )
		console.log( `- we are pushed to project with key ${ jiraProjectKey }` )
		
		const jiraIssueTypeName = core.getInput( 'JIRA_ISSUETYPE_NAME' )
		console.log( `-- using issue type ${ jiraIssueTypeName }` )
		
		//Let's login to JIRA first
		const jiraSession = new JiraClient( {
												host: core.getInput( 'JIRA_BASEURL' ),
												basic_auth: {
													email: core.getInput( 'JIRA_USEREMAIL' ),
													api_token: core.getInput( 'JIRA_APITOKEN' ),
												},
											} )
		
		console.log( '-- login in JIRA' )
		await loginToJiraAndCheckMyself( jiraSession )
		
		
		console.log( '--- checking project exist' )
		await checkProjectExist( jiraSession, jiraProjectKey )
		
		
		console.log( '--- checking issue type exist' )
		await findIssueTypeRequested( jiraSession, jiraProjectKey, jiraIssueTypeName )
		// const isSubtaskType = jiraIssuetypeFound.subtask
		
		const labeledJIRAIssuesKeyToAttachTo 		= issueChanges.jiraKeys.filter( currentJiraIssueKey => currentJiraIssueKey.startsWith( jiraProjectKey ) )
		const labeledJIRAIssueKeySubtasks 			= issueChanges.jiraKeys.filter( currentJiraIssueKey => currentJiraIssueKey.startsWith( 'sub' + jiraProjectKey ) )
		
		if( labeledJIRAIssuesKeyToAttachTo.length === 0
			&& labeledJIRAIssueKeySubtasks.length === 0 ) {
			console.log( `ERROR: no label match the project key ${ jiraProjectKey } -- this should have be trapped before, \n` +
						 'please log an issue at https://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/issues' )
			return
		}
		
		//
		// Prioritizing sub-XXX label as a force sync
		const {
			jiraIssueToUpdateDirectly,
			leftOverLabelToUpdateFromParent
		} = await listToUpdateDirectly( jiraSession, labeledJIRAIssueKeySubtasks, labeledJIRAIssuesKeyToAttachTo )
		
		const summaryToLookFor = ( issueChanges.event === 'edited' && 'title' in issueChanges.changes
								   ? issueChanges.changes.title.from
								   : issueChanges.details[ 'title' ] )
		const jiraIssueToUpdateFromParent = await listToUpdateByAttachingToParent( jiraSession,
																				   jiraProjectKey,
																				   jiraIssueTypeName,
																				   useSubtaskMode,
																				   leftOverLabelToUpdateFromParent,
																				   summaryToLookFor )
		return !jiraIssueToUpdateDirectly || jiraIssueToUpdateDirectly.length === 0
			   ? !jiraIssueToUpdateFromParent || jiraIssueToUpdateFromParent.length === 0
				 ? null
				 : jiraIssueToUpdateFromParent
			   : !jiraIssueToUpdateFromParent || jiraIssueToUpdateFromParent.length === 0
				 ? jiraIssueToUpdateDirectly
				 : [...jiraIssueToUpdateDirectly, ...jiraIssueToUpdateFromParent]
	}
	catch( error ) {
		core.setFailed( error.message
						? error.message
						: error.body && error.body.message
						  ? error.body.message
						  : JSON.stringify( error ) )
	}
	
	async function loginToJiraAndCheckMyself( jiraSession ) {
		try {
			await jiraSession.myself.getMyself()
		}
		
		catch( myselfError ) {
			manageJIRAAPIError( myselfError, jiraSession )
		}
	}
	
	async function checkProjectExist( jiraSession, jiraProjectKey ) {
		try {
			return await jiraSession.project.getProject( { projectIdOrKey: jiraProjectKey } )
		}
		
		catch( projectError ) {
			manageJIRAAPIError( projectError,
								jiraSession,
								`### project ${ jiraProjectKey } is invalid in JIRA`,
								'Project doesn\'t exist in JIRA' )
		}
	}
	
	async function findIssueTypeRequested( jiraSession, jiraProjectKey, issuetypeToFind ) {
		const foundData = await jiraSession.issue.getCreateMetadata( {
																		 projectKeys: jiraProjectKey,
																		 issuetypeNames: issuetypeToFind,
																	 } )
		if( !foundData
			|| !foundData.projects
			|| foundData.projects.length === 0
			|| !foundData.projects[ 0 ].issuetypes
			|| !foundData.projects[ 0 ].issuetypes.length === 0 )
			return null
		
		const issueTypefound = foundData.projects[ 0 ].issuetypes.find( currentIssueType => currentIssueType.name === issuetypeToFind )
		if( !issueTypefound ) {
			console.log( `### Issue Type ${ issuetypeToFind } is invalid in JIRA` )
			throw `The JIRA issue type specified does not exist or is ambiguous`
		}
		return issueTypefound
	}
	
	async function findIssue( jiraSession, jiraIssueKey ) {
		try {
			return await jiraSession.issue.getIssue( { issueKey: jiraIssueKey } )
		}
		catch( issueError ) {
			manageJIRAAPIError( issueError,
								jiraSession,
								`### issue ${ jiraIssueKey } is inaccessible in JIRA\n==> action skipped for label ${ jiraIssueKey }` )
		}
	}
	
	
	async function listToUpdateDirectly( jiraSession, listOfIssueKeyToReplaceDirectly, fullLabelList ){
		let listOfIssueKeyLabelToRemoveFromFullList = []
		
		if( listOfIssueKeyToReplaceDirectly.length === 0 )
			return { jiraIssueToUpdateDirectly: null, leftOverLabelToUpdateFromParent: fullLabelList }
		
		const jiraIssueToUpdateDirectly = await Promise.all( listOfIssueKeyToReplaceDirectly.map( async currentJIRASubtaskKey => {
			const issueKeyWithoutSub = currentJIRASubtaskKey.replace('sub', '')
			console.log( `Adding sub-ed JIRA Issue ${ issueKeyWithoutSub } to the list of JIRA Issues to upgrade` )
			
			const foundJIRAIssue = await findIssue( jiraSession, issueKeyWithoutSub )
			if( !foundJIRAIssue ) {
				console.log( `--! Issue ${ issueKeyWithoutSub } is not in JIRA -- skipping it` )
				return null
			}
			
			const foundParentKey = foundJIRAIssue
								   && foundJIRAIssue.fields
								   && foundJIRAIssue.fields.parent
								   && foundJIRAIssue.fields.parent.key
								   ? foundJIRAIssue.fields.parent.key
								   : null
			
			if( foundParentKey && fullLabelList
				&& fullLabelList.includes( foundParentKey ) ) {
				console.log( `--- ignoring parent labelling ${ foundParentKey } and upgrading ${ issueKeyWithoutSub } directly` )
				listOfIssueKeyLabelToRemoveFromFullList.push( foundParentKey )
			}
			return foundJIRAIssue
		} ) )
		
		
		return {
			jiraIssueToUpdateDirectly: jiraIssueToUpdateDirectly.filter( currentSubtaskOrIssue => currentSubtaskOrIssue !== null ),
			issueKeyLabelList: fullLabelList.filter( currentJIRAIssueKey => !listOfIssueKeyLabelToRemoveFromFullList.includes( currentJIRAIssueKey ) )
		}
	}
	
	async function listToUpdateByAttachingToParent( jiraSession, jiraProjectKey, jiraIssueTypeName, useSubtaskMode, issueKeyLabelToAttachTo, summaryToLookForInSubtasks ){
		if( !issueKeyLabelToAttachTo
			|| issueKeyLabelToAttachTo.length === 0 )
			return null
		
		const jiraIssueToAttachTo = await Promise.all( issueKeyLabelToAttachTo.map( async ( currentJIRAIssueKey ) => {
			console.log( `-- currently attaching to JIRA Issue: ${ currentJIRAIssueKey }` )
			const foundJIRAIssue = await findIssue( jiraSession, currentJIRAIssueKey )
			if( !foundJIRAIssue ) {
				console.log( `--! trying to attach to Issue that is not in JIRA ${ currentJIRAIssueKey } -- skipping it` )
				return null
			}
			
			if( !useSubtaskMode )
				return foundJIRAIssue
			
			const foundSubtask = findSubtaskByTitle( foundJIRAIssue, summaryToLookForInSubtasks )
			if( foundSubtask )
				return foundSubtask
			
			console.log( `----! no subtasks found with the title '${ summaryToLookForInSubtasks }' found, creating a new one` )
			const createdIssue = await createJIRAIssue( jiraSession, jiraProjectKey, jiraIssueTypeName, currentJIRAIssueKey, summaryToLookForInSubtasks )
			return findIssue( jiraSession, createdIssue.key )
		} ) )
		return jiraIssueToAttachTo.filter( currentSubtaskOrIssue => currentSubtaskOrIssue !== null )
	}
	
	
	function findSubtaskByTitle( jiraParentIssue, titleToLookFor ) {
		// - the story with the same title
		const jiraSubtasks = findAllSubtasks( jiraParentIssue )
		if( !jiraSubtasks
			|| jiraSubtasks.length === 0 )
			return null
		
		const foundWithTitle = findSubtaskWithTitle( jiraSubtasks, titleToLookFor )
		if( foundWithTitle )
			return foundWithTitle
		
		return null
	}
	
	function findAllSubtasks( jiraParentIssue ) {
		console.log( `-- looking for subtask of JIRA Issue ${ jiraParentIssue.key }` )
		if( !jiraParentIssue.fields[ "subtasks" ]
			|| jiraParentIssue.fields[ "subtasks" ].length === 0 ) {
			// no subtask found means we will create one
			console.log( '----! no subtasks found, we will be creating a new one' )
			return null
		}
		return jiraParentIssue.fields[ "subtasks" ]
	}
	
	// function findSubtaskWithKey( jiraSubtasksIssuesArray, githubLabelForSubtaskKeyArray ) {
	// 	console.log( `--- looking for one with key inside "${ JSON.stringify( githubLabelForSubtaskKeyArray ) }"` )
	// 	//filtering subtask to find a key that is in the list of subtask Labels in GITHUB
	// 	return jiraSubtasksIssuesArray.find( currentSubtask => githubLabelForSubtaskKeyArray.includes( currentSubtask.key ) )
	// }
	
	function findSubtaskWithTitle( jiraSubtasksIssuesArray, summaryToFind ) {
		console.log( `--- looking for one with summary "${ summaryToFind }"` )
		//filtering subtask to find our title
		const arrFoundSubtasksIssueWithTitle = jiraSubtasksIssuesArray.filter( currentJIRASubtaskObject => {
			return currentJIRASubtaskObject.fields.summary && currentJIRASubtaskObject.fields.summary === summaryToFind
		} )
		
		if( arrFoundSubtasksIssueWithTitle.length === 0 ) {
			return null
		}
		
		if( arrFoundSubtasksIssueWithTitle.length > 1 )
			console.log( '----! found more than one subtask with our title, returning the first' )
		
		return arrFoundSubtasksIssueWithTitle[ 0 ]
	}
	
	async function createJIRAIssue( jiraSession, jiraProjectKey, jiraIssueTypeNameToUse, jiraParentIssueKey, title ) {
		const issueData = {
			"update": {},
			"fields": {
				"project": {
					"key": jiraProjectKey,
				},
				"issuetype": {
					"name": jiraIssueTypeNameToUse,
				},
				"parent": {
					"key": jiraParentIssueKey,
				},
				"summary": title,
				
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
			},
		}
		console.log( `Creating JIRA Issue of type : ${ JSON.stringify( jiraIssueTypeNameToUse ) } with title: ${ title }` )
		
		try {
			return await jiraSession.issue.createIssue( issueData )
		}
		catch( createError ) {
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
	
	function manageJIRAAPIError( triggeredError, jiraSession, messageToLog, exceptionToRaise ) {
		if( triggeredError.message ) {
			console.log( `### JIRA API URL is invalid or inaccessible for ${ jiraSession.host }` )
			throw 'Invalid API URL'
		}
		else {
			const parsedError = JSON.parse( triggeredError )
			if( parsedError.statusCode === 401 ) {
				console.log( `### credentials unauthorized \n${ parsedError.body }` )
				throw 'Unauthorized'
			}
			if( !messageToLog )
				return
			
			if( parsedError.statusCode === 404 ) {
				console.log( messageToLog )
				if( exceptionToRaise ) throw exceptionToRaise
			}
		}
	}
}


module.exports = handleSubtask
