const nock = require( 'nock' )

const filesystem  = require( 'fs' )
const path        = require( 'path' )
const querystring = require( 'querystring' )
const merge       = require( 'deepmerge' )


function mockJIRACalls( jiraBaseUrl, jiraUserEmail, jiraApiToken, overrideForFiles ) {
	mockJIRACallsWithVersion( jiraBaseUrl, jiraUserEmail, jiraApiToken, 2, overrideForFiles )
	mockJIRACallsWithVersion( jiraBaseUrl, jiraUserEmail, jiraApiToken, 3, overrideForFiles )
}

function mockJIRACallsWithVersion( jiraBaseUrl, jiraUserEmail, jiraApiToken, version, overrideForFiles ) {
	const basePrefix   = '/rest/api/' + version.toString() + '/'
	const mockDefaults = {
		globalAuth:
			( jiraUserEmail && jiraApiToken
			  ? { user: jiraUserEmail, pass: jiraApiToken }
			  : null ),
	}
	// const callerSiteCaller = callerSites.default()[ 1 ].getFileName()
	// const dirOfCaller    = path.dirname(callerSiteCaller || '' )
	const absoluteDirPath = path.resolve( __dirname, 'rest-capture-jira/v' + version.toString() )
	
	const mockScope = nock( jiraBaseUrl + basePrefix ).persist( true )
													  .log( console.log )
	
	walkthroughDirectory( absoluteDirPath,
						  false,
						  ( nameFile, pathFile ) => {
							  if( overrideForFiles && overrideForFiles.hasOwnProperty( nameFile ) ) {
								  const newMockData = merge( mockDefaults, overrideForFiles[ nameFile ] )
								  createMockEndpointFromFileName( mockScope, newMockData, 'jira', nameFile, pathFile )
			return
		}
		
		createMockEndpointFromFileName( mockScope, mockDefaults, 'jira', nameFile, pathFile )
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

function createMockEndpointFromFileName( mockScope, mockDefaults, endpointPrefix, nameFile, pathFile ){
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
	
	mockCall( mockScope,
			  mockDefaults,
			  uriEndpoint,
			  matchOptions.groups.type ? matchOptions.groups.type: 'GET',
			  customAndOverride )
}

function mockCall( mockScope, mockData, uriEndpoint, httpVerb, customAndOverride ){
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
	
	let newInterceptor = null
	if( httpBodyCheck )
		newInterceptor = mockScope.intercept( currentURI  => ( uriCheck( currentURI, uriEndpoint ) ), httpVerb, httpBodyCheck )
	
	else
		newInterceptor = mockScope.intercept( currentURI  => ( uriCheck( currentURI, uriEndpoint ) ), httpVerb )
	
	if( httpBasicAuth )
		newInterceptor.basicAuth( httpBasicAuth )
	
	if( httpHeaders )
		newInterceptor.matchHeader( httpHeaders )
	
	if( !httpQueryParams ||
		httpQueryParams === 'all' )
		newInterceptor.query( true )
	
	else if( httpQueryParams )
		newInterceptor.query( httpQueryParams )
	
	newInterceptor.reply( httpReplyStatus, httpReplyData, httpReplyHeaders )
}

function uriCheck( uirToCheck, uriReferenceEndPoint ){
	const uriEndsTheSame = uirToCheck.toLowerCase().endsWith( '/' + uriReferenceEndPoint.toLowerCase() )
	return uriEndsTheSame
}



module.exports.mockJIRACalls       = mockJIRACalls
module.exports.unmockJIRACalls		= () => nock.cleanAll()
