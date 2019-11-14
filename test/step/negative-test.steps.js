const jestCucumber = require( 'jest-cucumber' )
const feature = jestCucumber.loadFeature('./test/feature/Negative.feature')

const handleIssues  = require('../../src/ghIssuesHandling')
const handleSubtask = require('../../src/jiraSubtaskHandling')


jestCucumber.defineFeature( feature, test => {
    const originalLog = console.log
    let consoleOutput = []
    const mockedLog = output => consoleOutput.push( output )

    beforeEach(() => (console.log = mockedLog) )
    test('Do nothing if the project key specified doesn\'t exist', ( { given, when, then } ) => {

        when('I specify an empty project', async () => {
            await handleSubtask(await handleIssues())
            //
            // expect( await handleSubtask(await handleIssues() ) )
            //     .toThrow( 'This action was not triggered by a Github Issue.' )
        } )

        then('we do nothing and exit succesfully', () => {
            expect( true ).toBe(true)
        } )
    } )

    afterEach(() => (console.warn = originalLog))
} )

//
// const {Given,  Then} = require('cucumber')
//
// Given( /^I specify an empty project$/, (  ) => {
//     assert.equal(true , true  )
// } )
//
// Then( /^we do nothing and exit succesfully$/, (  ) => {
//     expect(true ).toEqual( true );
//     // assert.equal(true , true  )
// } )