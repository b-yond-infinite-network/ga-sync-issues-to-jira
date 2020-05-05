const core       = require( '@actions/core' )
const JiraClient = require( 'jira-connector' )
let DEBUG        = () => { }

function sliceGHInput( rawText ) {
	let slicesResult      = []
	let currentParameters = rawText
	let snippet           = null
	
	while( ( snippet = /(?:,\s?)*(?<paramValue>[a-zA-Z1-9-\s]+)/g.exec( currentParameters ) ) ) {
		if( snippet.groups.paramValue ) {
			slicesResult.push( snippet.groups.paramValue )
			currentParameters = currentParameters.replace( snippet.groups.paramValue, '' )
		}
	}
	
	return slicesResult
}

async function handleSubtask( issueChanges, useSubtaskMode, fnDEBUG ) {
	//ISSUE CHANGE will be:
	//      {
	//             event:          payload.action,
	//             jiraKeys:       jiraKeys,
	//             changes:        changedValues,
	//             details:        payload.issue
	//         }
	DEBUG = fnDEBUG
	try {
		if( !issueChanges.jiraKeysToAttachTo
			&& !issueChanges.jiraKeysToReplace ) {
			//we have no parent task in JIRA, this should never happen
			console.log( `WARNING: no JIRA parent story is labelled.` )
			return null
		}
		
		const jiraProjectKey = core.getInput( 'JIRA_PROJECTKEY' )
		console.log( `- we are pushed to project with key ${ jiraProjectKey }` )
		
		const jiraIssueTypeName = core.getInput( 'JIRA_ISSUETYPE_NAME' )
		console.log( `-- using issue type ${ jiraIssueTypeName }` )
		
		//Let's login to JIRA first
		const jiraSession = new JiraClient( {
												host:       core.getInput( 'JIRA_BASEURL' ),
												basic_auth: {
													email:     core.getInput( 'JIRA_USEREMAIL' ),
													api_token: core.getInput( 'JIRA_APITOKEN' ),
												},
											} )
		
		console.log( '-- login in JIRA' )
		await loginToJiraAndCheckMyself( jiraSession )
		
		//PROJECT_KEY HANDLING
		// we allow list of keys, so we have to slice the input, then ensure that those project
		// exist in JIRA, then ensure that the Issue Type listed for them exists too
		const arrayProjectKeys = sliceGHInput( jiraProjectKey )
		if( arrayProjectKeys.length === 0 ) {
			arrayProjectKeys.push( jiraProjectKey )
		}
		
		console.log( '--- filter only projects that exist' )
		const isValidProjectKeys = await Promise.all( arrayProjectKeys.map( async ( currentProjectKey ) => {
			return await checkProjectExist( jiraSession, currentProjectKey )
		} ) )
		
		const validProjectKeys = arrayProjectKeys.filter( ( currentIsValid,
															currentIndex ) => isValidProjectKeys[ currentIndex ] )
		if( validProjectKeys.length === 0 ) {
			console.log( '---! none of the project key listed are link to project that exist' )
			throw 'No project exist in JIRA'
		}
		
		
		const arrayIssueTypes = sliceGHInput( jiraIssueTypeName )
		if( arrayIssueTypes.length === 0 ) {
			arrayIssueTypes.push( jiraIssueTypeName )
		}
		
		console.log( '--- checking issue type exist' )
		const foundIssueType = await Promise.all( arrayProjectKeys.map( async ( currentProjectKey, currentIndex ) => {
			if( !isValidProjectKeys[ currentIndex ] ) {
				return null
			}
			
			const indexToUse = currentIndex >= arrayIssueTypes.length
							   ? arrayIssueTypes.length - 1
							   : currentIndex
			return await findIssueTypeRequested( jiraSession, currentProjectKey, arrayIssueTypes[ indexToUse ] )
		} ) )
		
		const validProjectWithIssueType = arrayProjectKeys.filter( ( currentProjectKey,
																	 currentIndex ) => foundIssueType[ currentIndex ] !==
																					   null )
		if( validProjectWithIssueType.length === 0 ) {
			console.log( '---! none of the project have the Issue Type ' + jiraIssueTypeName )
			throw 'No Issue Type exist for those project in JIRA'
		}
		// const isSubtaskType = jiraIssuetypeFound.subtask
		
		
		if( issueChanges.jiraKeysToAttachTo.length === 0
			&& issueChanges.jiraKeysToReplace.length === 0 ) {
			console.log( `ERROR: no label match the project keys ${ jiraProjectKey } -- this should have be trapped before, \n` +
						 'please log an issue at https://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/issues' )
			return
		}
		
		//MULTI PROJECT HANDLING
		// when we have multi-project we have to match the issue that are left after validation of
		// the Issue Types compatibility
		const finalJIRAKeysToAttachTo = issueChanges.jiraKeysToAttachTo.length === 0
										? []
										: issueChanges.jiraKeysToAttachTo.filter( currentIssueToAttachTo =>
																					  validProjectWithIssueType.find(
																						  currentProjectKey =>
																							  currentIssueToAttachTo.jiraIssueKey.startsWith(
																								  currentProjectKey +
																								  '-' ),
																					  ) !== 'undefined' )
		const finalJIRAKeysToReplace  = issueChanges.jiraKeysToReplace.length === 0
										? []
										: issueChanges.jiraKeysToReplace.filter( currentIssueToAttachTo =>
																					 validProjectWithIssueType.find(
																						 currentProjectKey =>
																							 currentIssueToAttachTo.jiraIssueKey.startsWith(
																								 currentProjectKey +
																								 '-' ) ||
																							 currentIssueToAttachTo.jiraIssueKey.startsWith(
																								 'own' +
																								 currentProjectKey +
																								 '-' ),
																					 ) !== 'undefined' )
		//
		// Prioritizing sub-XXX label as a force sync
		const { jiraIssueToReplace, jiraIssueToAttachTo } = await listToUpdateDirectly( jiraSession,
																						finalJIRAKeysToReplace,
																						finalJIRAKeysToAttachTo )
		
		const summaryToLookFor            = ( issueChanges.changes && issueChanges.changes.title
											  ? issueChanges.changes.title.from
											  : issueChanges.details.title
												? issueChanges.details.title
												: '#' + issueChanges.details.number )
		const jiraIssueToUpdateFromParent = await listToUpdateByAttachingToParent( jiraSession,
																				   useSubtaskMode,
																				   jiraIssueToAttachTo,
																				   summaryToLookFor )
		return !jiraIssueToReplace || jiraIssueToReplace.length === 0
			   ? !jiraIssueToUpdateFromParent || jiraIssueToUpdateFromParent.length === 0
				 ? null
				 : jiraIssueToUpdateFromParent
			   : !jiraIssueToUpdateFromParent || jiraIssueToUpdateFromParent.length === 0
				 ? jiraIssueToReplace
				 : [ ...jiraIssueToReplace, ...jiraIssueToUpdateFromParent ]
	}
	catch( error ) {
		core.setFailed( error.message
						? error.message
						: error.body && error.body.message
						  ? error.body.message
						  : JSON.stringify( error ) )
	}
}

async function loginToJiraAndCheckMyself( jiraSession ) {
	try { await jiraSession.myself.getMyself() }
	
	catch( myselfError ) { manageJIRAAPIError( myselfError, jiraSession ) }
}

async function checkProjectExist( jiraSession, jiraProjectKey ) {
	try {
		await jiraSession.project.getProject( { projectIdOrKey: jiraProjectKey } )
		return true
	}
	catch( projectError ) {
		core.warning( `The JIRA Project ${ jiraProjectKey } does not exist or you don't have access.\nPlease contact your JIRA administrator to gain access.` )
		return false
	}
}

async function findIssueTypeRequested( jiraSession, jiraProjectKey, issuetypeToFind ) {
	try {
		const foundData = await jiraSession.issue.getCreateMetadata( {
																		 projectKeys:    jiraProjectKey,
																		 issuetypeNames: issuetypeToFind,
																	 } )
		if( !foundData
			|| !foundData.projects
			|| foundData.projects.length === 0
			|| !foundData.projects[ 0 ].issuetypes
			|| !foundData.projects[ 0 ].issuetypes.length === 0 ) {
			return null
		}
		
		const issueTypefound = foundData.projects[ 0 ].issuetypes.find( currentIssueType => currentIssueType.name ===
																							issuetypeToFind )
		if( !issueTypefound ) {
			console.log( `### Issue Type ${ issuetypeToFind } is invalid in JIRA project ${ jiraProjectKey }` )
			throw `The JIRA issue type specified does not exist or is disabled on this project`
		}
		return issueTypefound
	}
	catch( errorGetCreateMetadata ) {
		core.warning( `### Issue Type ${ issuetypeToFind } is invalid in JIRA project ${ jiraProjectKey }\nPlease contact your JIRA administrator to gain access.` )
		return null
	}
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


async function listToUpdateDirectly( jiraSession, issuesToReplace, issuesToAttachTo ) {
	if( issuesToReplace.length === 0 ) {
		return { jiraIssueToReplace: null, jiraIssueToAttachTo: issuesToAttachTo }
	}
	
	let listOfIssueKeyLabelToRemoveFromFullList = []
	
	const jiraIssueToUpdateDirectly = await Promise.all( issuesToReplace.map( async currentJIRAIssueKeyAndType => {
		const issueKeyWithoutSub = currentJIRAIssueKeyAndType.jiraIssueKey.replace( 'own', '' )
		console.log( `Adding own-ed JIRA Issue ${ issueKeyWithoutSub } to the list of JIRA Issues to upgrade` )
		
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
		
		if( foundParentKey && issuesToAttachTo
			&& issuesToAttachTo.findIndex( currentIssue => currentIssue.jiraIssueKey === foundParentKey ) !== -1 ) {
			console.log( `--- ignoring parent labelling ${ foundParentKey } and upgrading ${ issueKeyWithoutSub } directly` )
			listOfIssueKeyLabelToRemoveFromFullList.push( foundParentKey )
		}
		return foundJIRAIssue
	} ) )
	
	
	return {
		jiraIssueToReplace:  jiraIssueToUpdateDirectly.filter( currentSubtaskOrIssue => currentSubtaskOrIssue !==
																						null ),
		jiraIssueToAttachTo: issuesToAttachTo.filter( currentJIRAIssueKeyAndType => !listOfIssueKeyLabelToRemoveFromFullList.includes(
			currentJIRAIssueKeyAndType.jiraIssueKey ) ),
	}
}

async function listToUpdateByAttachingToParent( jiraSession, useSubtaskMode, issueToAttachTo,
												summaryToLookForInSubtasks ) {
	if( !issueToAttachTo
		|| issueToAttachTo.length === 0 ) {
		return null
	}
	
	const jiraIssueToAttachTo = await Promise.all( issueToAttachTo.map( async ( currentJIRAIssueKeyAndtype ) => {
		console.log( `-- currently attaching to JIRA Issue: ${ currentJIRAIssueKeyAndtype.jiraIssueKey }` )
		const foundJIRAIssue = await findIssue( jiraSession, currentJIRAIssueKeyAndtype.jiraIssueKey )
		if( !foundJIRAIssue ) {
			console.log( `--! trying to attach to Issue that is not in JIRA ${ currentJIRAIssueKeyAndtype.jiraIssueKey } -- skipping it` )
			return null
		}
		
		if( !useSubtaskMode ) {
			return foundJIRAIssue
		}
		
		if( summaryToLookForInSubtasks ) {
			console.log( `-- Subtask mode using ${ summaryToLookForInSubtasks }` )
			const foundSubtask = findSubtaskByTitle( foundJIRAIssue, summaryToLookForInSubtasks )
			if( foundSubtask ) {
				return foundSubtask
			}
		}
		
		console.log( `-- Creation in JIRA with title: ${ summaryToLookForInSubtasks }` )
		const createdIssue = await createJIRAIssue( jiraSession,
													foundJIRAIssue.fields.project.key,
													currentJIRAIssueKeyAndtype.jiraIssueType,
													currentJIRAIssueKeyAndtype.jiraIssueKey,
													summaryToLookForInSubtasks )
		DEBUG( `Created issue with return info ${ createdIssue }` )
		if( !createdIssue ) {
			throw `Unable to create the the Jira Issue`
		}
		
		return findIssue( jiraSession, createdIssue.key )
	} ) )
	return jiraIssueToAttachTo.filter( currentSubtaskOrIssue => currentSubtaskOrIssue !== null )
}


function findSubtaskByTitle( jiraParentIssue, titleToLookFor ) {
	// - the story with the same title
	const jiraSubtasks = findAllSubtasks( jiraParentIssue )
	if( !jiraSubtasks
		|| jiraSubtasks.length === 0 ) {
		return null
	}
	
	const foundWithTitle = findSubtaskWithTitle( jiraSubtasks, titleToLookFor )
	if( foundWithTitle ) {
		return foundWithTitle
	}
	
	console.log( `--! no subtasks found with the title '${ titleToLookFor }' found, creating a new one` )
	return null
}

function findAllSubtasks( jiraParentIssue ) {
	console.log( `-- looking for subtask of JIRA Issue ${ jiraParentIssue.key }` )
	if( !jiraParentIssue.fields[ "subtasks" ]
		|| jiraParentIssue.fields[ "subtasks" ].length === 0 ) {
		// no subtask found means we will create one
		console.log( '--! no subtasks found, we will be creating a new one' )
		return null
	}
	return jiraParentIssue.fields[ "subtasks" ]
}


function findSubtaskWithTitle( jiraSubtasksIssuesArray, summaryToFind ) {
	console.log( `--- looking for one with summary "${ summaryToFind }"` )
	//filtering subtask to find our title
	const arrFoundSubtasksIssueWithTitle = jiraSubtasksIssuesArray.filter( currentJIRASubtaskObject => {
		return currentJIRASubtaskObject.fields.summary && currentJIRASubtaskObject.fields.summary === summaryToFind
	} )
	
	if( arrFoundSubtasksIssueWithTitle.length === 0 ) {
		return null
	}
	
	if( arrFoundSubtasksIssueWithTitle.length > 1 ) {
		console.log( '---! found more than one subtask with our title, returning the first' )
	}
	
	return arrFoundSubtasksIssueWithTitle[ 0 ]
}

async function createJIRAIssue( jiraSession, jiraProjectKey, jiraIssueTypeNameToUse, jiraParentIssueKey, title ) {
	const issueData = {
		"fields": {
			"project":   {
				"key": jiraProjectKey,
			},
			"issuetype": {
				"name": jiraIssueTypeNameToUse,
			},
			"parent":    {
				"key": jiraParentIssueKey,
			},
			"summary":   title,
		},
	}
	console.log( `-->Creating JIRA Issue of type : ${ JSON.stringify( jiraIssueTypeNameToUse ) } with title: ${ title }` )
	DEBUG( `Creating JIRA ${ JSON.stringify( jiraIssueTypeNameToUse ) } with datas ${ JSON.stringify( issueData ) }` )
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
		if( !messageToLog ) {
			return
		}
		
		if( parsedError.statusCode === 404 ) {
			console.log( messageToLog )
			if( exceptionToRaise ) {
				throw exceptionToRaise
			}
		}
	}
}


module.exports = handleSubtask
