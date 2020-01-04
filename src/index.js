const core = require('@actions/core')
const { syncJiraWithGH } = require( './sync' )

process.on('unhandledRejection', handleError)
main().catch(handleError)

async function main() {
	
	const syncPromise = await syncJiraWithGH()
	console.log( 'have a great day!' )
}

function handleError(err) {
	console.error(err)
	core.setFailed(err.message)
}




