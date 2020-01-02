Feature: Jira synchronization

  Scenario: Create a new subtask if there's none with the same title attached to the story labelled
    Given I'm using the project 'TEST'
    And I labelled an issue with 'TEST-2'
    When there's no subtask attached to the story
    Then we create a subtask
    And attach it to the story

  Scenario: Update the title of the subtask when it's changed
    Given I'm using the project 'TEST'
    And I labelled an issue with 'TEST-2'
    When there's no subtask attached to the story
    Then we create a subtask
    And attach it to the story

  Scenario: Do nothing if the subtask in JIRA has exactly the same data in GH
    Given I specify project 'TEST'
    And the label is 'TEST-2'
    When title, assignee and comments are the same
    When the title is set to '' in the Github Issue
    And the title is set to '' in the Jira Subtask
    And the assignee is set to '' in the Github Issue
    And the assignee is set to '' in the Jira Subtask
    And the comments are set to '' in the Github Issue
    And the comments are set to '' in the Jira Subtask
    Then do nothing and exit successfully
