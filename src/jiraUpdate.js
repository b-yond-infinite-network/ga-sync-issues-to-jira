const core          = require( '@actions/core' )
const JiraClient    = require( 'jira-connector' )
const { Document, marks }	= require( 'adf-builder' )

async function jiraUpdateIssue( subtaskOrIssueToUpdate, updateToApply ) {
	try {
		//get jira login
		const jiraSession = new JiraClient({
											   host: core.getInput('JIRA_BASEURL'),
											   basic_auth: {
												   email: core.getInput('JIRA_USEREMAIL'),
												   api_token: core.getInput('JIRA_APITOKEN'),
											   } } )
		// if( updateToApply.description ){
		// 	updateToApply.description = convertDescriptionGITHUBMarkdownToADF( updateToApply.description ).toJSON()
		// }
		
		return await jiraSession.issue.editIssue( {
													  issueKey: 	subtaskOrIssueToUpdate.key,
													  issue:		{ fields: updateToApply } } )
		
	} catch ( error ) {
		core.setFailed( error.message
						? error.message
						: error.body && error.body.message
						  ? error.body.message
						  : JSON.stringify( error ) )
	}
}

function convertDescriptionGITHUBMarkdownToADF( markdownText ){
	const adfDescription = new Document()
	const lineByLine = markdownText.split( '\n' )
	let blockIsCode = false
	let codeBuffer = null
	let codeLanguage = null
	
	lineByLine.forEach( currentLine => {
		const codeBlock = currentLine.match( /^```(?<Language>.*)$/ )
		if( !blockIsCode
			&& codeBlock
			&& codeBlock.groups ){
			codeLanguage = codeBlock.groups.Language
			codeBuffer = ''
			blockIsCode = true
			
			return
		}
		if( blockIsCode
			&& codeBlock ){
			adfDescription.codeBlock( codeLanguage )
			codeLanguage = null
			codeBuffer = null
			blockIsCode = false
			return
		}
		
		if( blockIsCode ){
			codeBuffer += currentLine
			return
		}
		
		
		const headerType = currentLine.match( /^(?<headerNumber>[#]{6}) (?<headerText>.*)$/i )
		if( headerType
			&& headerType.groups
			&& headerType.groups.headerNumber
			&& headerType.groups.headerText ){
			adfDescription.heading( headerType.groups.headerNumber.length )
						  .text( headerType.groups.headerText )
			return
		}
		
		const unorderedList = currentLine.match( /^(?<listLevel>[ ]*)* (?<listText>.*)$/i )
		const orderedList = currentLine.match( /^(?<listLevel>[ ]*)[1-9]*\. (?<listText>.*)$/i )
		if( unorderedList
			&& unorderedList.groups
			&& unorderedList.groups.listLevel
			&& unorderedList.groups.listText ){
			adfDescription.bulletList( )
						  .textItem( unorderedList.groups.listText )
			return
		}
		
		if( orderedList
				 && orderedList.groups
				 && orderedList.groups.listLevel
				 && orderedList.groups.listText ){
			adfDescription.bulletList( )
						  .textItem( orderedList.groups.listText )
			return
		}
		const blockquote = currentLine.match( /^> (?<quoteText>.*)$/i )
		if( blockquote
			&& blockquote.groups
			&& blockquote.groups.quoteText ){
			adfDescription.blockQuote( )
						  .text( blockquote.groups.quoteText )
			return
		}
		
		
		
		const paragraph = adfDescription.paragraph()
		
		const lineUnderscored = currentLine.replace( /\*/g, '_' )
		let currentDecorationLevel = 0
		// 0 => no decoration
		// 1 => italic
		// 2 => bold
		// 3 => bold and italic
		
		let potentialUnderscorePair = false
		let expressionBuffer		= ''
		for( const currentCharacterIndex in lineUnderscored ){
			const cahra = lineUnderscored[ currentCharacterIndex ]
			if( lineUnderscored[ currentCharacterIndex ] !== '_' ){
				expressionBuffer += lineUnderscored[ currentCharacterIndex ]
				
				if( potentialUnderscorePair ){
					currentDecorationLevel = currentDecorationLevel === 0 || currentDecorationLevel === 2
											 ? currentDecorationLevel + 1
											 : currentDecorationLevel - 1
					potentialUnderscorePair = false
				}
			}
			
			if( lineUnderscored[ currentCharacterIndex ] === '_' ){
				let decorationToUse = currentDecorationLevel === 1
									  ? marks().em()
									  : currentDecorationLevel === 2
										? marks().strong()
										: currentDecorationLevel === 3
										  ? marks().strong().em()
										  : null
				
				if( expressionBuffer !== '' ){
					textWithInlineCode( paragraph, expressionBuffer, decorationToUse )
				}
				else {
					if( potentialUnderscorePair )
						currentDecorationLevel = currentDecorationLevel === 0 || currentDecorationLevel === 1
												 ? currentDecorationLevel + 2
												 : currentDecorationLevel - 2
				}
				
				
				
				potentialUnderscorePair = !potentialUnderscorePair
				expressionBuffer = ''
			}
		}
	} )
	return adfDescription
}

function textWithInlineCode( currentParagraph, rawText, marksToUse ){
	const inlineCode = /(?<textBefore>[^`]*)`(?<inlineCode>[^`]+)`(?<textAfter>[^`]*)/.exec( rawText )
	
	if( !inlineCode
		|| !inlineCode.groups ){
		currentParagraph.text( rawText, marksToUse )
		return
	}
	
	if( inlineCode.groups.textBefore )
		currentParagraph.text( inlineCode.groups.textBefore, marksToUse )
	
	if( inlineCode.groups.inlineCode )
		currentParagraph.code( inlineCode.groups.inlineCode )
	
	if( inlineCode.groups.textAfter )
		currentParagraph.text( inlineCode.groups.textAfter, marksToUse )
}

module.exports.jiraUpdateIssue = jiraUpdateIssue;
