const nock 			= require('nock')

const filesystem  	= require( 'fs' )
const path        	= require( 'path' )
const querystring	= require( 'querystring' )

function walkthroughDirectory( directoryName, bRecursive, fnDoForEachFile ) {
    let filenamesOrDirectorynames = filesystem.readdirSync( directoryName )

    filenamesOrDirectorynames.forEach( ( currentFilenameOrDirectoryname ) => {
        let currentFilepath = path.join( directoryName, currentFilenameOrDirectoryname )
        let currentFileStats = filesystem.statSync( currentFilepath )
        if( bRecursive && currentFileStats.isDirectory() )
            walkthroughDirectory( currentFilepath, bRecursive, fnDoForEachFile )

        else
            fnDoForEachFile( currentFilenameOrDirectoryname, currentFilepath )
    } )
}

function createMockEndpointFromFileName( endpointPrefix, nameFile, pathFile, jiraBaseURL, mockDefaults ){
	const fileExtension = path.extname( nameFile )
	if( fileExtension !== '.json'
		&& fileExtension !== '.html' )
		return
	
	const httpReplyHeaders = { "Content-Type":
									( fileExtension === '.json'
									  ? "application/json"
									  : "text/html;charset=UTF-8" )
							}
	if( !nameFile.startsWith( endpointPrefix + '.' ) )
		return
	
	const fileData 			= fileExtension === '.json'
								? require( pathFile )
								: filesystem.readFileSync( pathFile, 'utf8')
	
	const nameAsUriAndParams= path.basename( nameFile, fileExtension ).replace( endpointPrefix + '.', '' )
	const matchOptions		= nameAsUriAndParams.match( /(?<captured>\.?(?<type>GET?|POST?|PUT?|PATCH?|DELETE?|COPY?)?(?:{{{(?<auth>.*)}}})?(?:{{(?<headers>.*)}})?(?:{(?<params>.*)})?(?:=(?<return>\d{3}))?)$/ )
	
	const urisWithDoubleBar		= matchOptions.groups.captured
								   ? nameAsUriAndParams
									   .replace( matchOptions.groups.captured, '' )
									   .split( '.' )
								   : nameAsUriAndParams
									   .split( '.' )
	
	// we handle the replacement of double dash by dots
	const uriEndpoint	= urisWithDoubleBar
		.map( currentURIComponent => {
			return currentURIComponent.indexOf( '||' ) === -1
				   ? currentURIComponent
				   : currentURIComponent.replace( '||', '.')
		} )
		.join( '/' )
	
	const customAndOverride = {
		overrideAuth:			matchOptions.groups.auth ? querystring.parse( matchOptions.groups.auth ) : null,
		customHeaders: 			matchOptions.groups.headers,
		customQueryParams: 		matchOptions.groups.params
								  ? ( matchOptions.groups.params === '%'
									  ? '%'
									  : querystring.parse( matchOptions.groups.params ) )
								  : null,
		customReplyHeaders:		httpReplyHeaders,
		overrideReplyStatus: 	matchOptions.groups.return ? parseInt( matchOptions.groups.return ) : null,
		overrideReplyData: 		fileData !== '' ? fileData: null
	}
	
	mockCall( jiraBaseURL,
			  mockDefaults,
			  uriEndpoint,
			  matchOptions.groups.type ? matchOptions.groups.type: 'GET',
			  true,
			  customAndOverride )
}

function mockCall( baseURL, mockDefaults, uriEndpoint, httpVerb, persistEndpoint, customAndOverride ){
	const { overrideAuth, customHeaders, customQueryParams, customReplyHeaders, overrideReplyStatus, overrideReplyData } = customAndOverride
	const httpHeaders = mockDefaults && mockDefaults.globalHeaders
						? {...mockDefaults.globalHeaders, ...customHeaders }
						: customHeaders

	const httpBasicAuth = overrideAuth
						  ? overrideAuth
						  : ( mockDefaults ? mockDefaults.globalAuth : null )
	
	const httpQueryParams = customQueryParams === '%'
							? '%'
							: mockDefaults && mockDefaults.globalQueryParams
							  ? {...mockDefaults.globalQueryParams, ...customQueryParams }
							  : customQueryParams
	
	const httpReplyHeaders = mockDefaults && mockDefaults.globalReplyHeaders
							 ? {...mockDefaults.globalReplyHeaders, ...customReplyHeaders }
							 : customReplyHeaders
	
	const httpReplyStatus = overrideReplyStatus
							? overrideReplyStatus
							: ( mockDefaults ? mockDefaults.globalReplyStatus : 200 )
	
	const httpReplyData = overrideReplyData
						  ? overrideReplyData
						  : ( mockDefaults ? mockDefaults.globalReplyData : '' )
	
	const mockScope = nock( baseURL ).persist( persistEndpoint )
									 .intercept( new RegExp( '/' + uriEndpoint + '$', 'i' ), httpVerb )
	
	if( httpBasicAuth )
		mockScope.basicAuth( httpBasicAuth )
	
	if( httpHeaders )
		mockScope.matchHeader( httpHeaders )
	
	if( httpQueryParams === '%' )
		mockScope.query( true )
	
	else if( httpQueryParams )
		mockScope.query( httpQueryParams )
	
	mockScope.reply( httpReplyStatus, httpReplyData, httpReplyHeaders )
}

function mockJIRACalls( jiraBaseUrl, jiraKey, jiraIssueType, jiraUserEmail, jiraApiToken  ) {
	const jiraBaseURL	= jiraBaseUrl
	const basePrefix 	= '/rest/api/2/'
	const mockDefaults = {
		globalAuth:
			( jiraUserEmail && jiraApiToken
			  ? { user: jiraUserEmail, pass: jiraApiToken }
			  : null )
	}
	
	walkthroughDirectory( __dirname + '/rest-capture-jira/v2', false, ( nameFile, pathFile ) => {
		createMockEndpointFromFileName( 'jira', nameFile, pathFile, jiraBaseURL + basePrefix, mockDefaults )
	})
}


module.exports.mockJIRACalls       = mockJIRACalls
module.exports.unmockJIRACalls		= () => nock.cleanAll()
