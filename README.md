#### A github Action to synchronize Github Issues and Jira subtasks


<p align="left">
  <a href="https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/actions?query=workflow%3Alocal"><img alt="CI" src="https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/workflows/local/badge.svg"></a>
  <a href="https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/actions?query=workflow%3Aissuetrigger"><img alt="GitHub Actions status" src="https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/workflows/issuetrigger/badge.svg"></a>
</p>

# Using in your repo
## Usage
As for any Github action, you create an `.github/workflows` folder and a yaml file for each workflow configuration you want to have

Here is a basic startup
```yaml
#issuetrigger.yaml example
name: issuetrigger

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
Issue tagged in the GITHUB Issue label will be replaced by the information from Github (Subtask mode)

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


# In action
See the 'Issuetrigger' workflow in the [actions tab](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/actions) for runs of this action! :rocket:

# Contributing
Do not hesitate to raise [issue or bugs here](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/issues)

# License
This action follow an Apache 2.0 License.
Refer to [LICENSE](LICENSE) for more information
