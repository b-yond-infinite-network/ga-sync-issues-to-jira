const core   = require( '@actions/core' )
const github = require( '@actions/github' )

async function handleGHUpdate( issueToUpdate, jiraIssues, useSubtaskMode, DEBUG ) {
	const repoToken          = core.getInput( 'GITHUB_TOKEN', { required: true } )
	const ghOwn              = core.getInput( 'OWN_LABEL' )
	const ghForceCreateLabel = core.getInput( 'FORCE_CREATION_LABEL' )
	
	const ghClient = new github.GitHub( repoToken )
	
	const arrLabelsWithoutForceCreate = issueToUpdate.details.labels.reduce( ( accumulatedLabels, currentLabel ) => {
		if( currentLabel.name !== ghForceCreateLabel ) {
			accumulatedLabels.push( currentLabel.name )
		}
		return accumulatedLabels
	}, [] )
	if( arrLabelsWithoutForceCreate.length <= 0 ) {
		console.log( `--- no other label than the one we're adding` )
	}
	
	//making sure we don't have any of those label already
	const arrUniqueLabelsFromJiraIssues = jiraIssues.filter( currentIssue => ( !arrLabelsWithoutForceCreate.includes(
		currentIssue.key ) && !arrLabelsWithoutForceCreate.includes( ghOwn + currentIssue.key ) ) )
	if( arrUniqueLabelsFromJiraIssues.length <= 0 ) {
		console.log( '-- all stories are already in the labels for this issue, nothing to update in GITHUB' )
		return
	}
	
	const arrLabelsFromJiraKeyToAdd = arrUniqueLabelsFromJiraIssues.map( currentJiraIssue => ( useSubtaskMode
																							   ? ghOwn +
																								 currentJiraIssue.key
																							   : currentJiraIssue.key ) )
	for( const currentJiraIssue of arrUniqueLabelsFromJiraIssues ) {
		console.log( `-- checking label ${ currentJiraIssue.key } exist in repo` )
		await createLabelIfNotExist( ghClient,
									 issueToUpdate.repository.owner.login,
									 issueToUpdate.repository.name,
									 currentJiraIssue.key,
									 currentJiraIssue.parentTitle )
	}
	
	const arrFinalLabels = [ ...arrLabelsWithoutForceCreate, ...arrLabelsFromJiraKeyToAdd ]
	
	DEBUG( arrFinalLabels )
	if( arrFinalLabels.length <= 0 ) {
		console.log( `--! nothing to update in GITHUB` )
		return
	}
	
	console.log( `-- update GITHUB issue ${ issueToUpdate.details.number }` )
	const updateStatus = await ghClient.issues.update( {
														   owner:        issueToUpdate.repository.owner.login,
														   repo:         issueToUpdate.repository.name,
														   issue_number: issueToUpdate.details.number,
														   labels:       arrFinalLabels,
													   } )
	DEBUG( updateStatus )
	console.log( '- finishing sync with GITHUB' )
}

async function createLabelIfNotExist( ghClient, loginRepoOwner, nameRepo, nameLabel, parentTitle ) {
	try {
		await ghClient.issues.getLabel( {
											owner: loginRepoOwner,
											repo:  nameRepo,
											name:  nameLabel,
										} )
		console.log( `--- label ${ nameLabel } exists already, we just add it to the issue` )
	}
	catch( error ) {
		if( error.status === 404 ) {
			console.log( `--- creating label ${ nameLabel }` )
			
			const labelToCreate = {
				owner: loginRepoOwner,
				repo:  nameRepo,
				name:  nameLabel,
				color: randomHexaColor(),
			}
			
			if( parentTitle ) { labelToCreate.description = parentTitle }
			
			await ghClient.issues.createLabel( labelToCreate )
		}
		else {
			throw error
		}
	}
}

function randomHexaColor() {
	return "000000".replace( /0/g, () => { return ( ~~( Math.random() * 16 ) ).toString( 16 ) } )
}

module.exports.handleGHUpdate = handleGHUpdate
