Feature: Synchronization of fields and states

  Scenario Outline: Different title/summary (<GithubActionStatus> issue)
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'TEST-123'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When a '<GithubActionStatus>' action triggers
    Then we upgrade JIRA, write '--- updated with: {' and '"summary":"A new title"' in the logs and exit successfully

    Examples:
      | GithubActionStatus  |
      | opened              |
      | closed              |
      | deleted             |
      | edited              |
      | labeled             |
      | reopened            |

  Scenario Outline: Different body/description (<GithubActionStatus> issue)
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'TEST-123'
    And the change is set on 'body' with a from value of 'That would be good to have a description' in GITHUB
    And the body is now set to 'Nice description' in GITHUB
    And the description was set to 'An old description' in JIRA
    When a '<GithubActionStatus>' action triggers
    Then we upgrade JIRA, write '--- updated with: {' and '"description":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Nice description"}]}],"version":1}' in the logs and exit successfully

    Examples:
      | GithubActionStatus  |
      | opened              |
      | closed              |
      | deleted             |
      | edited              |
      | labeled             |
      | reopened            |

  Scenario Outline: No subtask in JIRA with the same title (<GithubActionStatus> issue)
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'TEST-999'
    And the change is set on 'body' with a from value of 'That would be good to have a description' in GITHUB
    And the body is now set to 'Nice description with _some **formatting**_' in GITHUB
    And the description was set to 'An old description' in JIRA
    When a '<GithubActionStatus>' action triggers
    Then we upgrade JIRA, write 'Creating JIRA Issue of type : "Subtask" with title: A JIRA subtask' in the logs and exit successfully

    Examples:
      | GithubActionStatus  |
      | opened              |
      | closed              |
      | deleted             |
      | edited              |
      | labeled             |
      | reopened            |

  Scenario Outline: Label prefixed with 'own' (<GithubActionStatus> issue)
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'TEST-999'
    And we add a label 'ownTEST-456'
    When a '<GithubActionStatus>' action triggers
    Then we upgrade JIRA, write 'Adding own-ed JIRA Issue TEST-456 to the list of JIRA Issues to upgrade' in the logs and exit successfully

    Examples:
      | GithubActionStatus |
      | opened             |
      | closed             |
      | deleted            |
      | edited             |
      | labeled            |
      | reopened           |


  Scenario: Closed on Done doesn't trigger transition
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'UNRELATED-LABEL'
    And we add a label 'ownTEST-DONE'
    And there's no assignee
    When a 'closed' action triggers
    Then we upgrade JIRA, don't write 'Transitioning JIRA Issue TEST-DONE' in the logs and exit successfully

  Scenario Outline: Closed trigger put issue as Done in JIRA when JIRA status was <JIRAStatus>
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'UNRELATED-LABEL'
    And we add a label '<JIRAToLabel>'
    And there's no assignee
    When a 'closed' action triggers
    Then we upgrade JIRA, write '<MessageToLookFor>' in the logs and exit successfully

    Examples:
      | JIRAStatus | JIRAToLabel        | MessageToLookFor                                                         |
      | TODO       | ownTEST-TODO       | Transitioning JIRA Issue TEST-TODO to Done                               |
      | INPROGRESS | ownTEST-INPROGRESS | Transitioning JIRA Issue TEST-INPROGRESS to Done                         |
      | DONE       | ownTEST-DONE       | Adding own-ed JIRA Issue TEST-DONE to the list of JIRA Issues to upgrade |


  Scenario Outline: Deleted trigger deletes issue in JIRA when JIRA status was <JIRAStatus>
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'UNRELATED-LABEL'
    And we add a label '<JIRAToLabel>'
    And there's no assignee
    When a 'deleted' action triggers
    Then we upgrade JIRA, write '<MessageToLookFor>' in the logs and exit successfully

    Examples:
      | JIRAStatus | JIRAToLabel        | MessageToLookFor           |
      | TODO       | ownTEST-TODO       | -- deleted TEST-TODO       |
      | INPROGRESS | ownTEST-INPROGRESS | -- deleted TEST-INPROGRESS |
      | DONE       | ownTEST-DONE       | -- deleted TEST-DONE       |


  Scenario: Reopened on ToDo doesn't trigger transition
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'UNRELATED-LABEL'
    And we add a label 'ownTEST-TODO'
    And there's no assignee
    When a 'reopened' action triggers
    Then we upgrade JIRA, don't write 'Transitioning JIRA Issue TEST-TODO' in the logs and exit successfully

  Scenario Outline: Reopened trigger put issue as ToDo in JIRA when JIRA status was <JIRAStatus>
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'UNRELATED-LABEL'
    And we add a label '<JIRAToLabel>'
    And there's no assignee
    When a 'reopened' action triggers
    Then we upgrade JIRA, write '<MessageToLookFor>' in the logs and exit successfully

    Examples:
      | JIRAStatus | JIRAToLabel        | MessageToLookFor                                                         |
      | TODO       | ownTEST-TODO       | Adding own-ed JIRA Issue TEST-TODO to the list of JIRA Issues to upgrade |
      | INPROGRESS | ownTEST-INPROGRESS | Transitioning JIRA Issue TEST-INPROGRESS to To Do                        |
      | DONE       | ownTEST-DONE       | Transitioning JIRA Issue TEST-DONE to To Do                              |


  Scenario: Opened on ToDo doesn't trigger transition
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'UNRELATED-LABEL'
    And we add a label 'ownTEST-TODO'
    And there's no assignee
    When a 'opened' action triggers
    Then we upgrade JIRA, don't write 'Transitioning JIRA Issue TEST-TODO' in the logs and exit successfully

  Scenario Outline: Opened trigger when JIRA status was <JIRAStatus>
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'UNRELATED-LABEL'
    And we add a label '<JIRAToLabel>'
    And there's no assignee
    When a 'opened' action triggers
    Then we upgrade JIRA, write '<MessageToLookFor>' in the logs and exit successfully

    Examples:
      | JIRAStatus | JIRAToLabel        | MessageToLookFor                                                         |
      | TODO       | ownTEST-TODO       | Adding own-ed JIRA Issue TEST-TODO to the list of JIRA Issues to upgrade |
      | INPROGRESS | ownTEST-INPROGRESS | Transitioning JIRA Issue TEST-INPROGRESS to To Do                        |
      | DONE       | ownTEST-DONE       | Transitioning JIRA Issue TEST-DONE to To Do                              |


  Scenario: Multi-project action
    Given The action is configured with project 'TEST, TEST2, TEST4', issue type 'Subtask' and label 'TEST-123'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When a 'opened' action triggers
    Then we upgrade JIRA, write 'Updating JIRA Issue: "TEST-555"' and 'Updating JIRA Issue: "TEST-456"' in the logs and exit successfully

  Scenario: Multi-Issue Type action with just one project ignore the other Issue Type
    Given The action is configured with project 'TEST', issue type 'Subtask, Sub-Task' and label 'TEST-123'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When a 'opened' action triggers
    Then we upgrade JIRA, write 'Updating JIRA Issue: "TEST-456"' and '"summary":"A new title"' in the logs and exit successfully

  Scenario: Multi-Issue Type action
    Given The action is configured with project 'TEST, TEST2, TEST4', issue type 'Subtask, Sub-task' and label 'TEST-123'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When a 'opened' action triggers
    Then we upgrade JIRA, write 'Updating JIRA Issue: "TEST-456"' and 'Creating JIRA Issue of type : "Sub-task" with title: A JIRA subtask' in the logs and exit successfully

  Scenario: Subtask mode off create a Story if one doesnt exist already
    Given The action is configured with project 'TEST', issue type 'Story' and label 'TEST-456'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When an action is triggered with SUBTASK_MODE OFF
    Then we upgrade JIRA, write 'Adding own-ed JIRA Issue TEST-456 to the list of JIRA Issues to upgrade' and 'Updating JIRA Issue: "TEST-456"' in the logs and exit successfully

  Scenario: Epic mode on ensure the Epic field is synched
    Given The action is configured with project 'TEST', issue type 'Story' and label 'TEST-456'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When an action is triggered with EPIC_MODE ON
    Then we upgrade JIRA, write '--- updated with: ' and '"customfield_10017":"TEST-123EPIC"' in the logs and exit successfully

  Scenario: Epic mode on non sub-task mode ensure the Epic field is synched from the current pushed story
    Given The action is configured with project 'TEST', issue type 'Story' and label 'TEST-456'
    And the change is set on 'title' with a from value of 'A JIRA subtask' in GITHUB
    And the title is now set to 'A new title' in GITHUB
    And the summary was set to 'An old title' in JIRA
    When an action is triggered with SUBTASK_MODE OFF and EPICMODE ON
    Then we upgrade JIRA, write 'Updating JIRA Issue: "TEST-456"' and '"customfield_10017":"TEST-123EPIC"' in the logs and exit successfully

  Scenario: CREATE-IN-JIRA label create a subtask in JIRA and then sync back the label into GITHUB
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'CREATE-IN-JIRA'
    And the change is set on 'title' with a from value of 'A new JIRA story' in GITHUB
    When the action triggers
    Then we upgrade JIRA, write 'Creating JIRA Issue of type : "Subtask" with title: A new JIRA story' and '-- update GITHUB issue 10' in the logs and exit successfully

#  Scenario: CREATE-IN-JIRA label with SUBTASK_MODE OFF create a story in JIRA and then sync back the label into GITHUB
#    Given The action is configured with project 'TEST', issue type 'Story' and label 'CREATE-IN-JIRA'
#    And the change is set on 'title' with a from value of 'A new JIRA story' in GITHUB
#    When a 'opened' action triggers with SUBTASK_MODE OFF
#    Then we upgrade JIRA, write 'Updating JIRA Issue: "TEST-456"' and '"customfield_10017":"TEST-123EPIC"' in the logs and exit successfully

  Scenario: Use JIRA_DEFAULT_PARENT in SUBTASK_MODE when FORCE_CREATE is used
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'CREATE-IN-JIRA'
    And the change is set on 'title' with a from value of 'A new JIRA story' in GITHUB
    When the action triggers with JIRA_DEFAULT_PARENT as TEST-123
    Then we upgrade JIRA, write 'Adding own-ed JIRA Issue CREATE-IN-JIRA to the list of JIRA Issues to upgrade' and 'Creating JIRA Issue of type : "Subtask" with title: A new JIRA story and parent TEST-123' in the logs and exit successfully

  Scenario: Use JIRA_DEFAULT_EPIC in EPIC_MODE when FORCE_CREATE is used
    Given The action is configured with project 'TEST', issue type 'Story' and label 'CREATE-IN-JIRA'
    And the change is set on 'title' with a from value of 'A new JIRA story' in GITHUB
    When the action triggers with JIRA_DEFAULT_EPIC as TEST-123EPIC and EPIC_MODE is on
    Then we upgrade JIRA, write 'Creating JIRA Issue of type : "Story" with title: A new JIRA story and parent null' and '"customfield_10017":"TEST-123EPIC"' in the logs and exit successfully

  Scenario: Use JIRA_DEFAULT_EPIC in EPIC_MODE and JIRA_DEFAULT_PARENT in SUBTASK_MODE when FORCE_CREATE is used
    Given The action is configured with project 'TEST', issue type 'Story' and label 'CREATE-IN-JIRA'
    And the change is set on 'title' with a from value of 'A new JIRA story' in GITHUB
    When the action triggers with EPIC_MODE and SUBTASK MODE on, JIRA_DEFAULT_EPIC as TEST-123EPIC, and JIRA_DEFAULT_PARENT as TEST-123
    Then we upgrade JIRA, write 'Creating JIRA Issue of type : "Story" with title: A new JIRA story and parent TEST-123' and '"customfield_10017":"TEST-123EPIC"' in the logs and exit successfully
