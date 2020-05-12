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

> Note: JIRA_PROJECTKEY is the abbreviated project name, it should be a maximum of 4 letters and is given by JIRA as 
>a prefix to all story "number". Example: in a JIRA Story "OS-314", OS is the Project Key. 

# MODES
This action allows 2 principal "modes" that change its behaviour


### **Subtask mode ON** 
In this mode, ***which is the default***, the issue information is created or updated in a "Subtask" 
issue type in JIRA that will be attached to the **labelled parent**. 

Subtask issue types are special in JIRA: they only exist attached to a parent non-subtask Issue. 
This action allows you to specify the exact Issue Type that you want to use by setting the JIRA_ISSUETYPE_NAME (default is "Subtask").

> **Note : ** As an example, "next-gen" project in JIRA use our current default "Subtask" but "classic" project have long 
>used "Sub-task". So for you "classic" JIRA project, you will have to set JIRA_ISSUETYPE_NAME to "Sub-task" (with the hyphen)
> 
> ***Check your Issue Type configuration*** in your project to pick the Issue type you want to use. 
> In JIRA: Project Setting > Issue Types

In this mode, you label the issue with the key of the parent issue you want to attach to, this action will take care of
finding the subtask with the same title inside the list of subtask of the labelled JIRA Issue.
> Example: if you want to attach to the 113 "Issue" that is part of a JIRA Project "Open Source" that has a key 
>(the abbreviation JIRA use) "OS", you will label your Github Issue with "OS-113".
>
> The action will then:
> - connect to your JIRA instance
> - check the story with the key (abbreviation) OS-113
> - retrieve the list of subtask
> - check if a subtask with the title of our Issue in Github exist, if not create it
> - push all the compatible information in JIRA (summary, description, epic link, status)

There's also some parameter that you can configure to adapt to your particular JIRA setup or make exceptions:
- the JIRA status match with Github Issue status ([see STATUS](#Status matching)) 

- the bypasses ([see Bypasses](#Bypasses))

- EPIC_MODE: by activating this mode, all "Epic Link" will also be synchronised for Bypassed non-subtask Issues 
using the Parent information
    > BEWARE: Epic Link will have to exist in JIRA for this to work

### **Subtask mode OFF** 
In this mode, the issue information is created or updated directly in the labelled story. 

If the labelled key doesn't exist in JIRA, a new JIRA Issue is create with the type specified in JIRA_ISSUETYPE_NAME.
If it exists, the information in the JIRA Issue is immediatly **replaced** by the information in the Github Issue. 


> **Note : ** Most project in JIRA use "Story" as the default Issue Type you want to use. 
>You will have to set JIRA_ISSUETYPE_NAME to "Story" to allow the creation of a story in JIRA
> 
> ***Check your Issue Type configuration*** in your project to pick the Issue type you want to use. 
> In JIRA: Project Setting > Issue Types

In this mode, you label the issue with the key of the issue you want to replace the information of.
This action will take care of the Issue in JIRA with the key (abbreviation) specified in the Github label.
> Example: if you want to attach to the 113 "Story" that is part of a JIRA Project "Open Source" that has a key 
>(the abbreviation JIRA use) "OS", you will label your issue with "OS-113" and configure JIRA_ISSUETYPE_NAME to "Story".
>
> The action will then:
> - connect to your JIRA instance
> - check the story with the key (abbreviation) OS-113
> - push all the compatible information in JIRA (summary, description, epic link, status) to OS-113

There's also some parameter that you can configure to adapt to your particular JIRA setup or make exceptions:
- the JIRA status match with Github Issue status ([see STATUS](#Status matching)) 

- the bypasses ([see Bypasses](#Bypasses))

- EPIC_MODE: by activating this mode, all "Epic Link" will also be synchronised using the Parent information 
or JIRA_DEFAULT_EPIC for newly created JIRA Issues using the FORCE_CREATION_LABEL
    > BEWARE: Epic Link will have to exist in JIRA for this to work

#BYPASSES
- OWN_LABEL: a prefix that you can use in your label in Github to force the update of a specific JIRA Issue (subtask or not) directly

- FORCE_CREATION_LABEL: a special label you can use to force the creation of a new Issue in JIRA. 
  - **SUBTASK_MODE ON**, force the creation of a subtask and will require the JIRA_DEFAULT_PARENT to be set, 
  otherwise JIRA will refuse the creation.
  - **SUBTASK_MODE OFF**, force the creation of an Issue, no JIRA_DEFAULT_PARENT need to be set
 

#STATUSES
To be able to manage the synchronisation of your Github Issue status correctly in JIRA, you will have to match their difference "name".
- JIRA_STATE_TODO: this is the status in JIRA that will be matched against the "reopened" status in Github

- JIRA_STATE_INPROGRESS: this is the status in JIRA that will be matched when the Github Issue has an assignee 

- JIRA_STATE_DONE: this is the status in JIRA that will be matched against the "closed" or "deleted" status in Github



# ESSENTIAL PARAMETERS 
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
