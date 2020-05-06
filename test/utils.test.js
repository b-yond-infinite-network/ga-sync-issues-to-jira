const sliceInput = require( '../src/utils' )

describe("Slice Input function", () => {
    
    test( "correctly slices issue type Tech debt", () => {
        expect( sliceInput( "Tech Debt" ) ).toStrictEqual( [ "Tech Debt" ] )
    } )
    
    test( "correctly slices comma separated issue types", () => {
        expect( sliceInput( "Tech Debt, Sub-task, Subtask, Bug" ) )
            .toStrictEqual( [ "Tech Debt", "Sub-task", "Subtask", "Bug" ] )
    } )
    
    test( "correctly slices project keys", () => {
        expect( sliceInput( "INT, SDAA, SEE" ) ).toStrictEqual( [ "INT", "SDAA", "SEE" ] )
    } )
    
} )
