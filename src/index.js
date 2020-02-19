const core = require('@actions/core')
const { syncJiraWithGH } = require( './sync' )

process.on( 'unhandledRejection', handleError )
main().catch( handleError )

async function main() {
	
	try {
		await syncJiraWithGH()
		console.log( 'have a great day!' )
	}
	catch( error ) { handleError( error )}
}

function handleError( err ) {
	core.setFailed( err.message )
	console.error( err )
}




