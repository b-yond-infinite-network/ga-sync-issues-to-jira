#### A github Action to synchronize Github Issues and Jira subtasks


<p align="left">
  <a href="https://github.com/actions/javascript-action/workflows/test-local"><img alt="GitHub Actions status" src="https://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/workflows/test-local/badge.svg"></a>
  <a href="https://github.com/actions/javascript-action/workflows/test-issuetrigger"><img alt="GitHub Actions status" src="https://github.com/b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action/workflows/test-issuetrigger/badge.svg"></a>
</p>

## Inputs

### `who-to-greet`

**Required** The name of the person to greet. Default `"World"`.

## Outputs

### `time`

The time we greeted you.

## Example usage

# Using in your repo
## Usage

Add the following action description in your `./github/workflows` directory

```yaml
uses: b-yond-infinite-network/sync-jira-subtask-to-gh-issues-action@v1
with:
  jira-prefix: BIP
```

See the [actions tab](https://github.com/b-yond-infinite-network/ga-sync-issues-to-jira/actions) for runs of this action! :rocket:

# Contributing

# License
This action follow an Apache 2.0 License.
Refer to [LICENSE](LICENSE) for more information
