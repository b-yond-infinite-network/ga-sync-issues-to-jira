const nock 			= require('nock')

const filesystem  	= require( 'fs' )
const path        	= require( 'path' )
const callerSites   = require( "callsites" )
const querystring	= require( 'querystring' )
const merge 		= require( 'deepmerge' )


function mockJIRACalls( jiraBaseUrl, jiraKey, jiraIssueType, jiraUserEmail, jiraApiToken, overrideForFiles ) {
	const jiraBaseURL	= jiraBaseUrl
	const basePrefix 	= '/rest/api/2/'
	const mockDefaults = {
		globalAuth:
			( jiraUserEmail && jiraApiToken
			  ? { user: jiraUserEmail, pass: jiraApiToken }
			  : null )
	}
	// const callerSiteCaller = callerSites.default()[ 1 ].getFileName()
	// const dirOfCaller    = path.dirname(callerSiteCaller || '' )
	const absoluteDirPath = path.resolve( __dirname, 'rest-capture-jira/v2' )
	
	walkthroughDirectory( absoluteDirPath,
						  false,
						  ( nameFile, pathFile ) => {
		if( overrideForFiles && overrideForFiles.hasOwnProperty( nameFile ) ){
			const newMockData = merge( mockDefaults, overrideForFiles[ nameFile ] )
			createMockEndpointFromFileName( 'jira', nameFile, pathFile, jiraBaseURL + basePrefix, newMockData )
			return
		}
		
		createMockEndpointFromFileName( 'jira', nameFile, pathFile, jiraBaseURL + basePrefix, mockDefaults )
	} )
}

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
	const matchOptions		= nameAsUriAndParams.match( /(?<captured>\.?(?<type>GET?|POST?|PUT?|PATCH?|DELETE?|COPY?)?(?:{{{(?<auth>.*)}}})?(?:{{(?<headers>.*)}})?(?:{(?<params>.*)})?(?:->(?<body>[^=]*))?(?:=(?<return>\d{3}))?)$/ )
	
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
								  ? ( matchOptions.groups.params === 'all'
									  ? 'all'
									  : querystring.parse( matchOptions.groups.params ) )
								  : null,
		customQueryBody: 		matchOptions.groups.body
								  ? ( matchOptions.groups.body === 'all'
									  ? 'all'
									  : querystring.parse( matchOptions.groups.body ) )
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

function mockCall( baseURL, mockData, uriEndpoint, httpVerb, persistEndpoint, customAndOverride ){
	const { overrideAuth, customHeaders, customQueryParams, customQueryBody, customReplyHeaders, overrideReplyStatus, overrideReplyData } = customAndOverride
	const httpHeaders = mockData && mockData.globalHeaders
						? merge( mockData.globalHeaders, customHeaders )
						: customHeaders

	const httpBasicAuth = overrideAuth
						  ? overrideAuth
						  : ( mockData ? mockData.globalAuth : null )
	
	const httpQueryParams = customQueryParams === 'all'
							? 'all'
							: mockData && mockData.globalQueryParams
							  ? merge( mockData.globalQueryParams, customQueryParams )
							  : customQueryParams
	
	const httpQueryBody  = customQueryBody === 'all'
							? 'all'
							: mockData && mockData.globalQueryBody
							  ? merge( mockData.globalQueryBody, customQueryBody )
							  : customQueryBody
	
	const httpReplyHeaders = mockData && mockData.httpReplyHeaders
							 ? merge( customReplyHeaders, mockData.httpReplyHeaders )
							 : mockData && mockData.globalReplyHeaders
							   ? merge( mockData.globalReplyHeaders, customReplyHeaders )
							   : customReplyHeaders
	
	const httpReplyStatus = mockData && mockData.httpReplyStatus
							? merge( overrideReplyStatus, mockData.httpReplyStatus )
							: overrideReplyStatus
							  ? overrideReplyStatus
							  : ( mockData ? mockData.globalReplyStatus : 200 )
	
	const httpReplyData = mockData && mockData.httpReplyData
						  ? merge( overrideReplyData, mockData.httpReplyData )
						  : overrideReplyData
							? overrideReplyData
							: ( mockData ? mockData.globalReplyData : '' )
	
	const httpBodyCheck = ( httpQueryBody && httpQueryBody === 'all' )
						  ? /.*/
						  : httpQueryBody
	
	let mockScope = null
	
	if( httpBodyCheck )
		mockScope = nock( baseURL ).persist( persistEndpoint )
								   .intercept( new RegExp( '/' + uriEndpoint + '$', 'i' ), httpVerb, httpBodyCheck )

	else
		mockScope = nock( baseURL ).persist( persistEndpoint )
								   .intercept( new RegExp( '/' + uriEndpoint + '$', 'i' ), httpVerb )
	
	if( httpBasicAuth )
		mockScope.basicAuth( httpBasicAuth )
	
	if( httpHeaders )
		mockScope.matchHeader( httpHeaders )
	
	if( httpQueryParams === 'all' )
		mockScope.query( true )
	
	else if( httpQueryParams )
		mockScope.query( httpQueryParams )
	
	mockScope.reply( httpReplyStatus, httpReplyData, httpReplyHeaders )
}



module.exports.mockJIRACalls       = mockJIRACalls
module.exports.unmockJIRACalls		= () => nock.cleanAll()
