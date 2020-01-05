Feature: Negative testing

  Scenario: Do nothing if the project key specified doesn't exist
    Given I specify an empty project
    When the action is triggered
    Then we do nothing, skip the action, exit successfully and write '==> action skipped -- no project key' as a warning in the logs

  Scenario: Do nothing if this was not triggered through a github issue (or a mock of it)
    Given I specify project 'TEST'
    When the action is not triggered from a github action
    Then we detect it's not an action and exit successfully

  Scenario: Do nothing if the github action is not supported
    Given I specify project 'TEST'
    And the action triggered is 'donotexist'
    When the action is triggered
    Then we do nothing, skip the action, exit successfully and write '==> action skipped for unsupported event donotexist' as a warning in the logs

  Scenario: Do nothing if the github action has no changes
    Given I specify project 'TEST'
    And the action has no change
    When the action is triggered
    Then we do nothing, skip the action, exit successfully and write '==> action skipped for event opened due to empty change set' as a warning in the logs

  Scenario Outline: Do nothing if I used <LabelType>
    Given I specify project 'TEST'
    And the label is <LabelValue>
    When the action is triggered
    Then we do nothing, skip the action, exit successfully and write '<WarningMessage>' as a warning in the logs

    Examples:
    | LabelType                                        | LabelValue            | WarningMessage                                                         |
    | no label                                         |                       | no labels found at all                                               |
    | a label not linked to my project key             | noprojectlikethat     | no labels found starting with the project key -- ignoring all labels |

  Scenario: Do nothing if the JIRA API URL is wrong
    Given I specify project 'TEST'
    And the label is TEST-123
    And I specify a wrong JIRA API URL
    When the action is triggered
    Then we fail the action, exit with error 'Invalid API URL' and write "JIRA API URL is invalid" in the logs

  Scenario: Do nothing if the JIRA credentials are wrong
    Given I specify project 'TEST'
    And the label is TEST-123
    And I push wrong JIRA credentials in my GA
    When the action is triggered
    Then we fail the action, exit with error 'Unauthorized' and write "credentials unauthorized" in the logs

  Scenario: Do nothing if the project doesn't exist in JIRA
    Given I specify project 'DONOTEXIST'
    And the label is DONOTEXIST-123
    And my JIRA credentials are correct
    When the action is triggered
    Then we fail the action, exit with error 'Project doesn't exist in JIRA' and write "### project DONOTEXIST is invalid in JIRA" in the logs

  Scenario: Do nothing if the Issue Type doesn't exist in JIRA
    Given I specify project 'TEST'
    And the label is TEST-123
    And the JIRA issue type is set to 'donotexist'
    And my JIRA credentials are correct
    When the action is triggered
    Then we fail the action, exit with error 'The JIRA issue type specified does not exist or is ambiguous' and write "### Issue Type donotexist is invalid in JIRA" in the logs

  Scenario: Do nothing if the project in JIRA has no issue with the label as IssueID
    Given I specify project 'TEST'
    And the label is TEST-DONOTEXIST
    And my JIRA credentials are correct
    When the action is triggered
    Then we do nothing, skip the action, exit successfully and write '==> action skipped for label TEST-DONOTEXIST' as a warning in the logs
#
  Scenario: Do nothing if the data JIRA is the same in Github
    Given I specify project 'TEST'
    And the issue in GITHUB has the same title, body and comments than the labelled 'TEST-123' issue in JIRA
    And my JIRA credentials are correct
    When the action is triggered
    Then we finish the action successfully and write '-- all changes are already synced between issue#' as an info in the logs
