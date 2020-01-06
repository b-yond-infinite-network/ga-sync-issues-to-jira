Feature: Jira synchronization
#
##  Scenario Outline: Update title/summary when they differ
##    Given The action triggered is '<Status>' with project 'TEST', issue type 'Subtask' and label 'TEST-123'
##    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
##    And the title is now set to '<NewTitle>' in GITHUB
##    And the summary was set to '<OldSummary>' in JIRA
##    When the action is triggered
##    Then we upgrade JIRA and exit successfully
##    And write that we upgraded 'summary' in the logs
##
##    Examples:
##    | Status   | NewTitle          | OldSummary    |
##    | edited   | A new title       | An old title  |
##    | opened   | A new title       | An old title  |
##    | reopened | A new title       | An old title  |
##    | labelled | A new title       | An old title  |
#
  Scenario: Update title/summary when they differ
    Given The action triggered is 'edited' with project 'TEST', issue type 'Subtask' and label 'TEST-123'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When the action triggers
    Then we upgrade JIRA, write '--- updated: {"summary":"A new title"' in the logs and exit successfully
#
  Scenario: Update body/description when they differ
    Given The action triggered is 'edited' with project 'TEST', issue type 'Subtask' and label 'TEST-123'
    And the change is set on 'body' with a from value of 'That would be good to have a description' in GITHUB
    And the body is now set to 'Nice description' in GITHUB
    And the description was set to 'An old description' in JIRA
    When the action triggers
    Then we upgrade JIRA, write '--- updated: {"description":"Nice description"}' in the logs and exit successfully

  Scenario: Create a new subtask in JIRA when there's none with the same title
    Given The action triggered is 'edited' with project 'TEST', issue type 'Subtask' and label 'TEST-999'
    And the change is set on 'body' with a from value of 'That would be good to have a description' in GITHUB
    And the body is now set to 'Nice description with _some **formatting**_' in GITHUB
    And the description was set to 'An old description' in JIRA
    When the action triggers
    Then we upgrade JIRA, write 'Creating JIRA Issue of type : "Subtask" with title: A JIRA subtask' in the logs and exit successfully

  Scenario: Attach to a specific JIRA Issue when the label is prefixed with 'sub'
    Given The action triggered is 'labeled' with project 'TEST', issue type 'Subtask' and label 'TEST-999'
    And we add a label 'subTEST-456'
    When the action triggers
    Then we upgrade JIRA, write 'Adding sub-ed JIRA Issue TEST-456 to the list of JIRA Issues to upgrade' in the logs and exit successfully

#  Scenario: Update the title of the subtask when it's changed
#    Given I'm using the project 'TEST'
#    And I labelled an issue with 'TEST-2'
#    When there's no subtask attached to the story
#    Then we create a subtask
#    And attach it to the story


