const core          = require( '@actions/core' )
const JiraClient    = require( 'jira-connector' )
// const { Document, marks }	= require( 'adf-builder' )

async function handleSync( subtaskOrIssuetoChange, issueEventTriggered, DEBUG ){
	const jiraSession = new JiraClient({
										   host: core.getInput('JIRA_BASEURL'),
										   basic_auth: {
											   email: core.getInput('JIRA_USEREMAIL'),
											   api_token: core.getInput('JIRA_APITOKEN'),
										   } } )
	
	const changeToPush = listPrioritizedFieldsDifference( issueEventTriggered, subtaskOrIssuetoChange )
	DEBUG( changeToPush )
	if( Object.keys( changeToPush ).length <= 0 ) {
		console.log( `-- all fields are synced between issue #${ issueEventTriggered.details[ 'number' ] } ` +
					 `in GITHUB and issue ${ subtaskOrIssuetoChange.key } in JIRA` )
	} else {
		console.log( `Updating JIRA Issue: ${ JSON.stringify( subtaskOrIssuetoChange.key ) }` )
		const updateResult = await jiraUpdateIssue( jiraSession, subtaskOrIssuetoChange, changeToPush )
		if( updateResult ) {
			console.log( `--- updated with: ${ JSON.stringify( changeToPush ) }` )
		}
	}
	
	const stateTransition = await jiraListStateToTransitionTo( jiraSession, subtaskOrIssuetoChange, issueEventTriggered )
	if( stateTransition ){
		await jiraPushIssueToTransition( jiraSession, subtaskOrIssuetoChange, stateTransition )
		console.log( `-- pushed ${ subtaskOrIssuetoChange.key } to transition` )
	}
	
	if( issueEventTriggered.event === 'deleted' ){
		console.log( `Deleting JIRA Issue: ${ subtaskOrIssuetoChange.key }` )
		await jiraDeleteIssue( jiraSession, subtaskOrIssuetoChange )
		console.log( `-- deleted ${ subtaskOrIssuetoChange.key }` )
	}
}

async function jiraUpdateIssue( jiraSession, subtaskOrIssueToUpdate, updateToApply ) {
	// if( updateToApply.description ){
	// 	updateToApply.description = convertDescriptionGITHUBMarkdownToADF( updateToApply.description ).toJSON()
	// }
		
	return await jiraSession.issue.editIssue( {
												  issueKey: 	subtaskOrIssueToUpdate.key,
												  issue:		{ fields: updateToApply } } )
	
}

async function jiraFindTransitions( jiraSession, subtaskOrIssueToUpdate ) {
	const nameTodoTransition 			= core.getInput( 'JIRA_STATE_TODO' )
	const nameInProgressTransition 		= core.getInput( 'JIRA_STATE_INPROGRESS' )
	const nameDoneTransition 			= core.getInput( 'JIRA_STATE_DONE' )
	
	const jiraTransitions = await jiraSession.issue.getTransitions( { issueKey: subtaskOrIssueToUpdate.key } )
	
	if( !jiraTransitions.transitions ||
		Object.keys( jiraTransitions.transitions ).length === 0 )
		return null
	
	
	const transitionTodo = jiraTransitions.transitions
										  .find( currentTransition => ( currentTransition.to
																		&& currentTransition.to
																		&& ( currentTransition.to.name === nameTodoTransition ) ) )
	const transitionInProgress = jiraTransitions.transitions
												.find( currentTransition => ( currentTransition.to
																			  && currentTransition.to
																			  && ( currentTransition.to.name === nameInProgressTransition ) ) )
	const transitionDone = jiraTransitions.transitions
										  .find( currentTransition => ( currentTransition.to
																		&& currentTransition.to
																		&& ( currentTransition.to.name === nameDoneTransition ) ) )
	return {
		"todo": 		transitionTodo ? transitionTodo.id : null,
		"inprogress":	transitionInProgress ? transitionInProgress.id : null,
		"done":			transitionDone ? transitionDone.id : null
	}
}

async function jiraPushIssueToTransition( jiraSession, subtaskOrIssueToUpdate, idTransitionToPushThrough ) {
	return await jiraSession.issue.transitionIssue( { 	issueKey: 		subtaskOrIssueToUpdate.key,
														transition: 	{ id: idTransitionToPushThrough } } )
}

async function jiraDeleteIssue( jiraSession, subtaskOrIssueToUpdate ) {
	await jiraSession.issue.deleteIssue( { issueKey: subtaskOrIssueToUpdate.key } )
}

function listPrioritizedFieldsDifference( issueChangeTriggered, subtaskOrIssueToChange ){
	//TODO missing events to consider [ "assigned", "unassigned", "unlabeled", "milestoned", "demilestoned"]
	// we only sync summary and description for now
	const changes = {}
	
	if( issueChangeTriggered.details.title
		&& subtaskOrIssueToChange.fields
		&& subtaskOrIssueToChange.fields.summary !== issueChangeTriggered.details.title )
		changes.summary = issueChangeTriggered.details.title
		
	if( issueChangeTriggered.details.body
		&& subtaskOrIssueToChange.fields
		&& subtaskOrIssueToChange.fields.description !== issueChangeTriggered.details.body )
		changes.description = issueChangeTriggered.details.body
	
	return changes
}

async function jiraListStateToTransitionTo( jiraSession, subtaskOrIssueToUpdate, issueChangeTriggered ){
	//TODO missing events to consider [ "assigned", "unassigned", "unlabeled", "milestoned", "demilestoned"]
	//we try to sync the state only when they're different
	const nameTodoTransition 			= core.getInput( 'JIRA_STATE_TODO' )
	const nameInProgressTransition 		= core.getInput( 'JIRA_STATE_INPROGRESS' )
	const nameDoneTransition 			= core.getInput( 'JIRA_STATE_DONE' )
	
	const transitions = await jiraFindTransitions( jiraSession, subtaskOrIssueToUpdate )
	if( !transitions ){
		console.log( `--! no compatible transition with those configured` )
		return null
	}
	
	
	//we have to make sure to have a closed GITHUB issue has a DONE JIRA Issue
	if( issueChangeTriggered.details.state === 'closed'
		&& subtaskOrIssueToUpdate.fields.status.name === nameDoneTransition ){
		return null
	}
	else if( issueChangeTriggered.details.state === 'closed'
			 && ( subtaskOrIssueToUpdate.fields.status.name === nameTodoTransition
				  || subtaskOrIssueToUpdate.fields.status.name === nameInProgressTransition ) ){
		console.log( `Transitioning JIRA Issue ${ subtaskOrIssueToUpdate.key } to ${ nameDoneTransition }` )
		return transitions.done
	}
	
	//apparently Github Issue can on be closed or open, so lets skip this => if( issueChangeTriggered.details.state === 'open' ){
	
	//we have to make sure to have the JIRA Issue in something else than DONE
	if( issueChangeTriggered.details.assignee ){
		if( subtaskOrIssueToUpdate.fields.status.name === nameTodoTransition
			|| subtaskOrIssueToUpdate.fields.status.name === nameDoneTransition ){
			console.log( `Transitioning JIRA Issue ${ subtaskOrIssueToUpdate.key } to ${ nameInProgressTransition }` )
			return transitions.inprogress
		}
	}
	
	if( subtaskOrIssueToUpdate.fields.status.name === nameInProgressTransition
		|| subtaskOrIssueToUpdate.fields.status.name === nameDoneTransition ){
		console.log( `Transitioning JIRA Issue ${ subtaskOrIssueToUpdate.key } to ${ nameTodoTransition }` )
		return transitions.todo
	}
	
	//we ignore any other transition with names we don't know
	return null
}

// function convertDescriptionGITHUBMarkdownToADF( markdownText ){
// 	const adfDescription = new Document()
// 	const lineByLine = markdownText.split( '\n' )
// 	let blockIsCode = false
// 	let codeBuffer = null
// 	let codeLanguage = null
//
// 	lineByLine.forEach( currentLine => {
// 		const codeBlock = currentLine.match( /^```(?<Language>.*)$/ )
// 		if( !blockIsCode
// 			&& codeBlock
// 			&& codeBlock.groups ){
// 			codeLanguage = codeBlock.groups.Language
// 			codeBuffer = ''
// 			blockIsCode = true
//
// 			return
// 		}
// 		if( blockIsCode
// 			&& codeBlock ){
// 			adfDescription.codeBlock( codeLanguage )
// 			codeLanguage = null
// 			codeBuffer = null
// 			blockIsCode = false
// 			return
// 		}
//
// 		if( blockIsCode ){
// 			codeBuffer += currentLine
// 			return
// 		}
//
//
// 		const headerType = currentLine.match( /^(?<headerNumber>[#]{6}) (?<headerText>.*)$/i )
// 		if( headerType
// 			&& headerType.groups
// 			&& headerType.groups.headerNumber
// 			&& headerType.groups.headerText ){
// 			adfDescription.heading( headerType.groups.headerNumber.length )
// 						  .text( headerType.groups.headerText )
// 			return
// 		}
//
// 		const unorderedList = currentLine.match( /^(?<listLevel>[ ]*)* (?<listText>.*)$/i )
// 		const orderedList = currentLine.match( /^(?<listLevel>[ ]*)[1-9]*\. (?<listText>.*)$/i )
// 		if( unorderedList
// 			&& unorderedList.groups
// 			&& unorderedList.groups.listLevel
// 			&& unorderedList.groups.listText ){
// 			adfDescription.bulletList( )
// 						  .textItem( unorderedList.groups.listText )
// 			return
// 		}
//
// 		if( orderedList
// 				 && orderedList.groups
// 				 && orderedList.groups.listLevel
// 				 && orderedList.groups.listText ){
// 			adfDescription.bulletList( )
// 						  .textItem( orderedList.groups.listText )
// 			return
// 		}
// 		const blockquote = currentLine.match( /^> (?<quoteText>.*)$/i )
// 		if( blockquote
// 			&& blockquote.groups
// 			&& blockquote.groups.quoteText ){
// 			adfDescription.blockQuote( )
// 						  .text( blockquote.groups.quoteText )
// 			return
// 		}
//
//
//
// 		const paragraph = adfDescription.paragraph()
//
// 		const lineUnderscored = currentLine.replace( /\*/g, '_' )
// 		let currentDecorationLevel = 0
// 		// 0 => no decoration
// 		// 1 => italic
// 		// 2 => bold
// 		// 3 => bold and italic
//
// 		let potentialUnderscorePair = false
// 		let expressionBuffer		= ''
// 		for( const currentCharacterIndex in lineUnderscored ){
// 			const cahra = lineUnderscored[ currentCharacterIndex ]
// 			if( lineUnderscored[ currentCharacterIndex ] !== '_' ){
// 				expressionBuffer += lineUnderscored[ currentCharacterIndex ]
//
// 				if( potentialUnderscorePair ){
// 					currentDecorationLevel = currentDecorationLevel === 0 || currentDecorationLevel === 2
// 											 ? currentDecorationLevel + 1
// 											 : currentDecorationLevel - 1
// 					potentialUnderscorePair = false
// 				}
// 			}
//
// 			if( lineUnderscored[ currentCharacterIndex ] === '_' ){
// 				let decorationToUse = currentDecorationLevel === 1
// 									  ? marks().em()
// 									  : currentDecorationLevel === 2
// 										? marks().strong()
// 										: currentDecorationLevel === 3
// 										  ? marks().strong().em()
// 										  : null
//
// 				if( expressionBuffer !== '' ){
// 					textWithInlineCode( paragraph, expressionBuffer, decorationToUse )
// 				}
// 				else {
// 					if( potentialUnderscorePair )
// 						currentDecorationLevel = currentDecorationLevel === 0 || currentDecorationLevel === 1
// 												 ? currentDecorationLevel + 2
// 												 : currentDecorationLevel - 2
// 				}
//
//
//
// 				potentialUnderscorePair = !potentialUnderscorePair
// 				expressionBuffer = ''
// 			}
// 		}
// 	} )
// 	return adfDescription
// }
//
// function textWithInlineCode( currentParagraph, rawText, marksToUse ){
// 	const inlineCode = /(?<textBefore>[^`]*)`(?<inlineCode>[^`]+)`(?<textAfter>[^`]*)/.exec( rawText )
//
// 	if( !inlineCode
// 		|| !inlineCode.groups ){
// 		currentParagraph.text( rawText, marksToUse )
// 		return
// 	}
//
// 	if( inlineCode.groups.textBefore )
// 		currentParagraph.text( inlineCode.groups.textBefore, marksToUse )
//
// 	if( inlineCode.groups.inlineCode )
// 		currentParagraph.code( inlineCode.groups.inlineCode )
//
// 	if( inlineCode.groups.textAfter )
// 		currentParagraph.text( inlineCode.groups.textAfter, marksToUse )
// }

module.exports 	= handleSync

