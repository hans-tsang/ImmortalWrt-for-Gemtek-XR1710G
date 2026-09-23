#!/usr/bin/env bash

# Hand an upstream sync that scripts/resolve-sync-conflicts.sh could not finish
# over to the Copilot coding agent instead of just failing the job.
#
# The conflicted merge (conflict markers and all) is committed on a throw-away
# branch and pushed.  The agent is then started directly with `gh agent-task
# create`, which opens a pull request off that branch; this works even when the
# repository has issues disabled.  Only when that is not available does the
# script fall back to opening an issue assigned to Copilot.
#
# Requires the calling workflow to grant `contents: write` and `issues: write`
# and to export GH_TOKEN (or GITHUB_TOKEN).  Starting the Copilot agent needs a
# token whose owner has Copilot enabled; when neither hand-off route works the
# conflict branch is still pushed, so nothing is lost.

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-}"
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${REPO}/actions/runs/${GITHUB_RUN_ID:-0}"
TARGET_BRANCH="${TARGET_BRANCH:-master}"

conflicts="$(git diff --name-only --diff-filter=U || true)"
if [ -z "$conflicts" ]; then
  echo "No conflicts left, nothing to hand off."
  exit 0
fi

echo "Unresolved conflicts:"
echo "$conflicts"

branch="sync-conflict/$(date -u +%Y%m%d-%H%M%S)"

# Commit the conflicted tree as-is.  The markers are intentionally kept: they
# are the very thing the agent has to resolve.
git add -A
git commit -q --no-verify -m "chore: upstream sync conflicts pending resolution

Conflicted files:
$conflicts

Produced by $RUN_URL"

if ! git push origin "HEAD:refs/heads/$branch"; then
  echo "::error::Could not push the conflict branch $branch."
  exit 1
fi
echo "Pushed conflict branch: $branch"

if [ -z "$TOKEN" ] || [ -z "$REPO" ] || ! command -v gh > /dev/null 2>&1; then
  echo "::warning::No GitHub CLI or token available, skipping the Copilot handoff."
  exit 1
fi
export GH_TOKEN="$TOKEN"

title="Resolve upstream sync conflicts on $branch"
body="$(cat <<EOF
The scheduled upstream sync could not be merged automatically.

The conflicted merge has been committed **with conflict markers** on the branch
\`$branch\` so it can be resolved without re-running the merge.

Conflicted files:

$(printf '%s\n' "$conflicts" | sed 's/^/- `/; s/$/`/')

Failing workflow run: $RUN_URL

@copilot please resolve this:

1. Work on \`$branch\`; check it out first if you are not already based on it.
2. Resolve every conflict, honouring this fork's customizations: the local
   English \`README.md\` wins, \`1710.config\` / \`2010.config\` keep the local
   build options but pick up new upstream entries, and files removed by
   \`scripts/enforce-no-chinese.sh\` stay removed.  When upstream changed a file
   that this fork only translated, keep the upstream behaviour but write its
   comments and strings in English.
3. Remove all conflict markers and run \`bash scripts/enforce-no-chinese.sh\`.
4. If the conflict is one that recurs on every sync, teach
   \`scripts/resolve-sync-conflicts.sh\` to handle it so the next sync is automatic.
5. Open a pull request with the resolved merge so it can land on \`$TARGET_BRANCH\`.
EOF
)"

# Preferred route: start the coding agent directly on the conflict branch.  It
# needs neither issues nor an assignable Copilot actor, which is why it is tried
# before the issue based hand-off.
if gh agent-task create --repo "$REPO" --base "$branch" -F - <<< "$body"; then
  echo "Started a Copilot coding agent task on $branch."
  exit 1
fi
echo "::warning::Could not start a Copilot coding agent task, falling back to an issue."

issue_url="$(gh issue create --repo "$REPO" --title "$title" --body "$body")" || {
  echo "::error::Could not hand the sync conflicts to Copilot: starting an agent task failed and the issue could not be created (issues may be disabled for this repository). Resolve $branch manually."
  exit 1
}
echo "Opened $issue_url"

issue_number="${issue_url##*/}"

# Assigning the Copilot coding agent only works through GraphQL, and only when
# the agent is listed as an assignable actor for this repository.
owner="${REPO%%/*}"
name="${REPO##*/}"

bot_id="$(gh api graphql -f owner="$owner" -f name="$name" -f query='
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
        nodes { login __typename ... on Bot { id } ... on User { id } }
      }
    }
  }' --jq '.data.repository.suggestedActors.nodes[] | select(.login == "copilot-swe-agent" or .login == "Copilot") | .id' 2>/dev/null | head -n1)" || bot_id=""

if [ -z "$bot_id" ]; then
  echo "::warning::Copilot is not assignable here; the issue only mentions @copilot."
  exit 1
fi

issue_id="$(gh api "repos/$REPO/issues/$issue_number" --jq '.node_id')"

if gh api graphql -f assignableId="$issue_id" -f actorId="$bot_id" -f query='
  mutation($assignableId: ID!, $actorId: ID!) {
    replaceActorsForAssignable(input: { assignableId: $assignableId, actorIds: [$actorId] }) {
      assignable { ... on Issue { number } }
    }
  }' > /dev/null; then
  echo "Assigned $issue_url to Copilot."
else
  echo "::warning::Could not assign Copilot to $issue_url."
fi

exit 1
