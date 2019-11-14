Feature: Negative testing situation

  Scenario: Do nothing if the project key specified doesn't exist
    When I specify an empty project
    Then we do nothing and exit succesfully

#  Scenario: Do nothing if the story labelled doesn't exist
#    Given I'm using the project 'TEST'
#    When I labelled an issue with a label that doesn't exist
#    Then we do nothing and exit succesfully
#
#  Scenario: Do nothing if the subtask in JIRA has exactly the same data in GH
#    Given I'm using the project 'TEST'
#    And I labelled an issue with 'TEST-2'
#    When the title, assignee and comments are  the same
#    Then do nothing and exit successfully

