#### A github Action to synchronize Github Issues and Jira subtasks

[![Continuous Integration](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/workflows/Continuous%20Integration/badge.svg)](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/actions?query=workflow%3A%22Continuous+Integration%22)
[![Codecov](https://codecov.io/gh/b-yond-infinite-network/ga-sync-issues-to-jira/branch/master/graph/badge.svg)](https://codecov.io/gh/b-yond-infinite-network/ga-sync-issues-to-jira)
[![Last Issue](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/workflows/Sync%20with%20JIRA/badge.svg)](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/actions?query=workflow%3A%22Sync+with+JIRA%22)

[![npm downloads](https://img.shields.io/npm/dm/ga-sync-issues-to-jira)](https://www.npmjs.com/package/ga-sync-issues-to-jira)
[![npm latest](https://img.shields.io/npm/v/ga-sync-issues-to-jira/latest.svg)](https://www.npmjs.com/package/ga-sync-issues-to-jira)

# Using in your repo
## Usage
As for any Github action, you create an `.github/workflows` folder and a yaml file for each workflow configuration you want to have

Here is a basic startup
```yaml
#issuetrigger.yaml example
name: Push to JIRA

on:
  issues:

jobs:
  test:

    runs-on: ubuntu-latest

    steps:
      - uses: b-yond-infinite-network/ga-sync-issues-to-jira@master
        with:
          JIRA_PROJECTKEY:  TEST
          JIRA_BASEURL:     ${{ secrets.JIRA_BASEURL }}
          JIRA_USEREMAIL:   ${{ secrets.JIRA_USEREMAIL }}
          JIRA_APITOKEN:    ${{ secrets.JIRA_APITOKEN }}
```
As you can see, this action supports Github Secrets.
We always advise all credential to be protected using this, [simply follow this Github documentation](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets)

You can find the complete list of options [for the action here](action.yml)

For all options, you can customize them in your workflow configuration by adding your value in the 'with' list, as such:
```yaml
#issuetrigger.yaml example
#.....content of the file not shown
#......
#......
      - uses: b-yond-infinite-network/ga-sync-issues-to-jira@master
        with:
          JIRA_PROJECTKEY:  ANOTHERPROJECT
          JIRA_BASEURL:     ${{ secrets.JIRA_BASEURL }}
          JIRA_USEREMAIL:   ${{ secrets.JIRA_USEREMAIL }}
          JIRA_APITOKEN:    ${{ secrets.JIRA_APITOKEN }}
          SUBTASK_MODE:     false
```
In this configuration, the synchronization will be triggered for each Issue change (opening, editing...) and every JIRA 
Issue tagged in the GITHUB Issue label will be replaced by the information from Github (non-Subtask mode)


# Base parameters 
Here are the **required** parameters to start

#### **JIRA_BASEURL**
##### The hostname to connect to JIRA (do not add https://). 
> It will often finish by '.atlassian.net' and should be the same that you're using while accessing JIRA using your browser.
> 
> Example value `mycompany.atlassian.net`.


#### **JIRA_USEREMAIL**
##### This is the login/email you're using to connect to JIRA. 
> _This action only support User API Token._ 
> Value should be the login you're using to log in JIRA.


#### **JIRA_APITOKEN**
##### This is JIRA User API Token itself. 
> **_This action only support User API Token._**  
> You can manage your API Tokens in JIRA [using this page](https://id.atlassian.com/manage/api-tokens)
> 
> Value should be a weird string of character.


#### **JIRA_PROJECTKEY**:
##### This is JIRA Project key. 
> This will tell the action in which project in JIRA to synchronize the issues into. 
> Value should be a JIRA project _**Key**_ (like `PRO`, `TES`...), not a JIRA project name
> 
> * Note: You can specify multiple project allowed for the repo separating their name with a comman, like so:
>
>   ``JIRA_PROJET: PROJECT_KEYNAME, OTHERPROJECT_KEYNAME, THIRDPROJECT_KEYNAME``

#### **JIRA_ISSUETYPE_NAME**:
##### This is JIRA Project key. 
> This is the name of the Issue Type we will be using to push our issue information in JIRA. 
> The default value (`Subtask`) is valid for modern Agile project in JIRA. For old ones, you may want to specify `Sub-task`
> 
> * Note: When you specify multiple project in `JIRA_PROJECTKEY` it will use this value for all of them unless you 
>   list them in this parameter separated with comma, like so:
>
>   `JIRA_ISSUETYPE_NAME: Subtask, Sub-task, Subtask`
>   
>   In this example, the first project will be match with Issue Type `Subtask`, the second with `Sub-task` and the third with `Subtask`
>   If you don't specify enough Issue Type, the last one in the list will be used for the missing project.


# In action
See the 'Issuetrigger' workflow in the [actions tab](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/actions) for runs of this action! :rocket:

# Contributing
Do not hesitate to raise [issue or bugs here](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/issues)

# License
This action follow an Apache 2.0 License.
Refer to [LICENSE](LICENSE) for more information
