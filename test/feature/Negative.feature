Feature: Negative testing situation

  Scenario: Do nothing if the project key specified doesn't exist
    Given I specify an empty project
    When the action is triggered
    Then we do nothing, skip the action and exit successfully

  Scenario: Do nothing if this was not triggered through a github issue (or a mock of it)
    Given I specify project 'TEST'
    When the action is not triggered from a github action
    Then we detect it's not an action and exit successfully

  Scenario: Do nothing if the github action is not supported
    Given I specify project 'TEST'
    And the action triggered is 'donotexist'
    When the action is triggered
    Then we do nothing, skip the action and exit successfully
    And write 'for event donotexist' in the logs

  Scenario: Do nothing if the github action has no changes
    Given I specify project 'TEST'
    And the action has no change
    When the action is triggered
    Then we do nothing, skip the action and exit successfully

  Scenario Outline: Do nothing if I used <LabelType>
    Given I specify project 'TEST'
    And the label is <LabelValue>
    When the action is triggered
    Then we do nothing, skip the action and exit successfully
    And write '<ErrorMessage>' in the logs

    Examples:
    | LabelType                                        | LabelValue            | ErrorMessage                                                         |
    | no label                                         |                       | no labels found at all                                               |
    | a label not linked to my project key             | noprojectlikethat     | no labels found starting with the project key -- ignoring all labels |
#    | a label from a story that doesn't exist in JIRA | TEST-NOTEXIST         | no jira issuekeys labels found at all |


  Scenario: Do nothing if the JIRA API URL is wrong
    Given I specify project 'TEST'
    And the label is TEST-123
    And I specify a wrong JIRA API URL
    When the action is triggered
    Then we fail the action and exit with error 'Invalid API URL'
    And write 'JIRA API URL is invalid' in the logs

  Scenario: Do nothing if the JIRA credentials are wrong
    Given I specify project 'TEST'
    And the label is TEST-123
    And I push wrong JIRA credentials in my GA
    When the action is triggered
    Then we fail the action and exit with error 'Unauthorized'
    And write 'credentials unauthorized' in the logs
#
  Scenario: Do nothing if the project doesn't exist in JIRA
    Given I specify project 'DONOTEXIST'
    And the label is DONOTEXIST-123
    And my JIRA credentials are correct
    When the action is triggered
    Then we fail the action and exit with error 'Project doesn't exist in JIRA'
    And write '### project DONOTEXIST is invalid in JIRA' in the logs
#
  Scenario: Do nothing if the Issue Type doesn't exist in JIRA
    Given I specify project 'TEST'
    And the label is TEST-123
    And the JIRA issue type is set to 'donotexist'
    And my JIRA credentials are correct
    When the action is triggered
    Then we fail the action and exit with error 'The JIRA issue type specified does not exist or is ambiguous'
    And write '### Issue Type donotexist is invalid in JIRA' in the logs
#
  Scenario: Do nothing if the project in JIRA has no issue with the label as IssueID
    Given I specify project 'TEST'
    And the label is TEST-DONOTEXIST
    And my JIRA credentials are correct
    When the action is triggered
    Then we do nothing, skip the action and exit successfully
    And write '==> skipping label TEST-DONOTEXIST' in the logs

  Scenario: Do nothing if the data JIRA is the same in Github
    Given I specify project 'TEST'
    And the label is TEST-123
    And the issue in GITHUB has the same title, description and priority in JIRA
    And my JIRA credentials are correct
    When the action is triggered
    Then we do nothing, skip the action and exit successfully
